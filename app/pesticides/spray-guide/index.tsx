/**
 * @module app/pesticides/spray-guide/index
 * 散布方法ガイド画面。完全な静的コンテンツ。サーバー API 不要。
 * Web 版 /pesticides/spray-guide に準拠。
 * 仕様: docs/design/pesticides-web-parity.md §4-12
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { PesticideDisclaimer } from '@/components/pesticide/PesticideDisclaimer';
import { useOnlineStatus } from '@/hooks/use-online-status';
import {
  colorBackground,
  colorSurface,
  colorBorder,
  colorBorderLight,
  colorTextPrimary,
  colorTextSecondary,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  spacing8,
  radiusMd,
  shadowWashi,
  textBase,
  textLg,
  textSm,
  textXs,
  fontFamilySerifBold,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 希釈対応表定数（Web 版 SPRAY_DILUTION_RATIOS / SPRAY_WATER_VOLUMES_ML に相当）
// ---------------------------------------------------------------------------

const SPRAY_DILUTION_RATIOS: number[] = [500, 1000, 1500, 2000, 3000];
const SPRAY_WATER_VOLUMES_ML: number[] = [200, 500, 1000, 2000];

// ---------------------------------------------------------------------------
// ガイドセクション定義
// ---------------------------------------------------------------------------

type GuideItem = {
  icon: string;
  text: string;
};

type GuideSection = {
  title: string;
  items: GuideItem[];
};

const GUIDE_SECTIONS: GuideSection[] = [
  {
    title: '散布のタイミング',
    items: [
      { icon: '🌅', text: '早朝か夕方が最適です。日中の高温・強光下では薬害が出やすくなります。' },
      { icon: '🌧️', text: '雨の前後は避けてください。雨前は薬剤が流れてしまい、雨後は葉が濡れた状態で浸透性の高い薬剤は薬害の原因になります。' },
      { icon: '🌡️', text: '高温時（30℃以上）は避けてください。薬害リスクが上がります。' },
      { icon: '💨', text: '風速3m/s以上では散布しないでください。薬剤が周囲に飛散し、効果も低下します。' },
    ],
  },
  {
    title: '散布方法のポイント',
    items: [
      { icon: '🍃', text: '葉の裏表にまんべんなく散布してください。害虫や病原菌は葉裏に潜むことが多いです。' },
      { icon: '💧', text: '薬液が滴り落ちる直前が適量です。大量散布は効果増加につながらず、薬害・土壌汚染の原因になります。' },
      { icon: '🔧', text: '噴霧器は用途に合ったものを選んでください。手動式・電動式・背負い式など散布量と樹の大きさに応じて使い分けます。' },
      { icon: '🧪', text: '展着剤（界面活性剤）を規定量加えると、薬液の付着・浸透性が高まり効果が安定します。' },
    ],
  },
  {
    title: '安全対策',
    items: [
      { icon: '🥽', text: '散布時はゴーグル・マスク・手袋・長袖を着用してください。皮膚・粘膜への直接接触を防ぎます。' },
      { icon: '🚿', text: '散布後は石鹸で手をよく洗い、うがいをしてください。使用した衣類も洗濯してください。' },
      { icon: '📦', text: '農薬は子どもやペットの手の届かない冷暗所に、食品と分けて保管してください。' },
      { icon: '♻️', text: '残液は河川・下水に流さず、製品ラベルの指示に従って処理してください。空容器は自治体のルールに従って廃棄してください。' },
    ],
  },
  {
    title: '盆栽特有の注意点',
    items: [
      { icon: '🪴', text: '鉢が小さいため薬剤が土壌に過剰に入りやすいです。鉢底から流出するほど大量に散布しないでください。' },
      { icon: '🌿', text: '苔（こけ）を張っている場合、一部の農薬が苔を傷める場合があります。製品ラベルで苔への影響を確認してください。' },
      { icon: '🏠', text: '室内に展示する前に、十分な乾燥時間をとってください。薬剤臭が室内に充満するリスクがあります。目安は散布後24時間以上です。' },
    ],
  },
];

// ---------------------------------------------------------------------------
// ガイドセクションコンポーネント
// ---------------------------------------------------------------------------

type GuideSectionCardProps = {
  section: GuideSection;
};

const GuideSectionCard = memo(function GuideSectionCard({ section }: GuideSectionCardProps) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {section.title}
      </Text>
      {section.items.map((item, index) => (
        <View key={index} style={styles.guideItem}>
          <Text style={styles.guideIcon} accessibilityElementsHidden>{item.icon}</Text>
          <Text style={styles.guideText}>{item.text}</Text>
        </View>
      ))}
    </View>
  );
});

// ---------------------------------------------------------------------------
// 希釈対応表コンポーネント
// ---------------------------------------------------------------------------

const DilutionReferenceTable = memo(function DilutionReferenceTable() {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle} accessibilityRole="header">希釈の基本</Text>

      <Text style={styles.formulaText}>
        薬剤量（mL）= 水量（mL）÷ 希釈倍率
      </Text>
      <Text style={styles.formulaNote}>
        例: 水1,000mL を1,000倍希釈する場合 → 1,000 ÷ 1,000 = 1mL の薬剤が必要
      </Text>

      {/* 対応表（横スクロール） */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        contentContainerStyle={styles.tableContent}
        accessibilityLabel="希釈倍率と水量の対応表"
      >
        <View>
          {/* ヘッダー行 */}
          <View style={styles.tableRow}>
            <View style={[styles.tableCell, styles.tableCellHeader, styles.tableFirstCol]}>
              <Text style={styles.tableHeaderText}>倍率</Text>
            </View>
            {SPRAY_WATER_VOLUMES_ML.map((vol) => (
              <View key={vol} style={[styles.tableCell, styles.tableCellHeader]}>
                <Text style={styles.tableHeaderText}>水{vol >= 1000 ? `${vol / 1000}L` : `${vol}mL`}</Text>
              </View>
            ))}
          </View>

          {/* データ行 */}
          {SPRAY_DILUTION_RATIOS.map((ratio, rowIndex) => {
            const isEvenRow = rowIndex % 2 === 0;
            return (
              <View key={ratio} style={[styles.tableRow, isEvenRow && styles.tableRowEven]}>
                <View style={[styles.tableCell, styles.tableFirstCol]}>
                  <Text style={styles.tableFirstColText}>{ratio}倍</Text>
                </View>
                {SPRAY_WATER_VOLUMES_ML.map((vol) => {
                  const ml = vol / ratio;
                  const display =
                    ml < 1 ? `${(ml * 1000).toFixed(0)}µL` : `${ml.toFixed(2)}mL`;
                  return (
                    <View key={vol} style={styles.tableCell}>
                      <Text style={styles.tableCellText}>{display}</Text>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <Text style={styles.tableNote}>
        ※ 1mL未満の薬剤量は計量が困難です。より多い水量での調製をお勧めします。
      </Text>
    </View>
  );
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function SprayGuideScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '散布方法ガイド', headerShown: true }} />
      <OfflineBanner isVisible={!isOnline} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing8 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenDescription}>
          農薬を安全かつ効果的に使用するための実践ガイド
        </Text>

        {/* 希釈対応表（最初に表示） */}
        <DilutionReferenceTable />

        {/* ガイドセクション群 */}
        {GUIDE_SECTIONS.map((section) => (
          <GuideSectionCard key={section.title} section={section} />
        ))}

        {/* 免責事項 */}
        <PesticideDisclaimer />
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const TABLE_CELL_WIDTH = 88;
const TABLE_FIRST_COL_WIDTH = 72;
const TABLE_CELL_HEIGHT = 40;
const TABLE_HEADER_HEIGHT = 44;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorBackground,
  },
  scrollContent: {
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
    gap: spacing6,
  },
  screenDescription: {
    ...textSm,
    color: colorTextSecondary,
    lineHeight: 20,
  },

  // ガイドセクションカード
  sectionCard: {
    backgroundColor: colorSurface,
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colorBorder,
    padding: spacing4,
    gap: spacing4,
    ...shadowWashi,
  },
  sectionTitle: {
    ...textLg,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
  },

  // ガイドアイテム
  guideItem: {
    flexDirection: 'row',
    gap: spacing3,
    alignItems: 'flex-start',
    paddingVertical: spacing2,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
  },
  guideIcon: {
    fontSize: 18,
    lineHeight: 24,
    flexShrink: 0,
  },
  guideText: {
    ...textBase,
    color: colorTextPrimary,
    lineHeight: 22,
    flex: 1,
  },

  // 計算式
  formulaText: {
    ...textBase,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
    lineHeight: 24,
    padding: spacing3,
    backgroundColor: colorBackground,
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colorBorder,
    textAlign: 'center',
  },
  formulaNote: {
    ...textXs,
    color: colorTextSecondary,
    lineHeight: 18,
  },

  // 対応表
  tableContent: {
    paddingBottom: spacing2,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
  },
  tableRowEven: {
    backgroundColor: colorBackground,
  },
  tableCell: {
    width: TABLE_CELL_WIDTH,
    height: TABLE_CELL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing2,
    borderRightWidth: 1,
    borderRightColor: colorBorderLight,
  },
  tableCellHeader: {
    height: TABLE_HEADER_HEIGHT,
    backgroundColor: colorSurface,
  },
  tableFirstCol: {
    width: TABLE_FIRST_COL_WIDTH,
    backgroundColor: colorSurface,
  },
  tableHeaderText: {
    ...textXs,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
    textAlign: 'center',
  },
  tableFirstColText: {
    ...textXs,
    color: colorTextSecondary,
    fontFamily: fontFamilySerifBold,
    textAlign: 'center',
  },
  tableCellText: {
    ...textXs,
    color: colorTextPrimary,
    textAlign: 'center',
  },
  tableNote: {
    ...textSm,
    color: colorTextSecondary,
    lineHeight: 18,
  },
});
