/**
 * @module app/fertilizers/watering/index
 * 水やりと施肥の関係。Web 版 /fertilizers/watering の完全準拠。静的コンテンツ。API 不要。
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
import { FertilizerDisclaimer } from '@/components/fertilizer/FertilizerDisclaimer';
import {
  colorBackground,
  colorSurface,
  colorBorder,
  colorTextPrimary,
  colorTextSecondary,
  spacing3,
  spacing4,
  spacing5,
  spacing6,
  spacing8,
  radiusMd,
  textSm,
  textLg,
  shadowWashi,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 静的コンテンツ（Web 版 /fertilizers/watering/page.tsx と同一データ）
// ---------------------------------------------------------------------------

type Section = {
  title: string;
  paragraphs: string[];
};

const SECTIONS: Section[] = [
  {
    title: '液肥の希釈と使い方',
    paragraphs: [
      '液体肥料は水に溶かして灌水と同時に施す方法で、速効性が特徴です。盆栽では規定希釈倍率の1.5〜2倍に薄めるのが安全です。例えば「1000倍希釈」の製品であれば、1500〜2000倍に薄めて使います。「薄くて回数多め」が盆栽における液肥の基本原則です。',
      '施肥のタイミングは朝の灌水後が最適です。根が十分に水分を吸収した状態で液肥を与えると、肥料成分が均一に行き渡ります。乾いた用土にいきなり液肥を注ぐと、局所的に濃度が高くなり根を傷める原因になります。',
      '液肥の施肥頻度は生長期に月2〜4回が目安です。置き肥と併用する場合は月1〜2回に減らします。梅雨時と猛暑期（7〜8月）は液肥も控えるか完全に休止します。',
    ],
  },
  {
    title: '置き肥と灌水の関係',
    paragraphs: [
      '置き肥（固形有機肥料）は灌水のたびに少しずつ成分が溶け出して根に届く仕組みです。つまり、灌水の頻度と量が置き肥の効き方を直接左右します。灌水回数が多いほど肥料の溶出が早まり、少ないほど緩やかに効きます。',
      '夏場は灌水回数が1日2〜3回に増えるため、置き肥の消耗も早くなります。通常は月1回の交換で十分ですが、夏場は2〜3週間で新しい肥料に交換することもあります。逆に、冬場は灌水頻度が下がるため、肥料がほとんど溶け出さず効果が出にくくなります。',
      '大雨や台風の後は、一度に大量の水が用土を通過するため、肥料成分が一気に流出している可能性があります。長雨が続いた後は、肥料の状態を確認し、崩れていたら早めに交換しましょう。',
    ],
  },
  {
    title: '季節別の水やりと施肥の調整',
    paragraphs: [
      '【春（3〜5月）】灌水は1日1回が基本。気温の上昇に合わせて午前中に灌水し、置き肥を設置します。植え替え直後の樹は灌水のみで肥料は与えません。新芽の展開を確認してから施肥を開始します。',
      '【夏（6〜8月）】灌水は1日2〜3回に増やします。梅雨時は置き肥を外し、灌水も用土の乾き具合を見て調整します。猛暑期は朝・夕の灌水に加えて葉水（霧吹き）も有効ですが、施肥は控えます。',
      '【秋（9〜11月）】灌水は1日1回に戻し、しっかりと施肥を再開します。秋肥は盆栽の冬越しに重要な期間です。灌水時に鉢底から十分に水が流れるように与え、肥料成分を根全体に行き渡らせます。',
      '【冬（12〜2月）】灌水は2〜3日に1回まで減らします。施肥は原則不要です。凍結防止のため、朝の暖かい時間帯に灌水するのがポイントです。用土が凍っている場合は無理に灌水しません。',
    ],
  },
  {
    title: 'よくある失敗',
    paragraphs: [
      '【過湿＋施肥＝根腐れ】最も多い失敗パターンです。排水性の悪い用土で頻繁に灌水しつつ肥料も与えると、根が酸欠状態になり腐敗します。用土が常に湿っている場合は施肥を控え、まず排水性の改善（植え替え）を優先してください。',
      '【乾燥した用土への液肥】乾いた用土にいきなり液肥を注ぐと、肥料成分が根の近くで高濃度になり、肥料焼けを起こします。必ず先に清水で灌水してから液肥を施してください。',
      '【雨任せの灌水＋置き肥】屋外管理の盆栽で灌水を雨に頼り切ると、雨の多い時期に肥料成分が一気に溶出し、晴れが続くと全く効かないというムラが生じます。雨天でも用土の湿り具合を確認し、必要に応じて手灌水で水分量を調整しましょう。',
      '【冬の灌水直後の施肥】冬場に灌水した直後に肥料を与えても、低温で根の活動が停滞しており吸収されません。溶け出した成分が用土に蓄積し、春先に気温が上がると一気に根にダメージを与えることがあります。',
    ],
  },
];

// ---------------------------------------------------------------------------
// セクションカード（memo 化）
// ---------------------------------------------------------------------------

const SectionCard = memo(function SectionCard({ section }: { section: Section }) {
  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <View style={styles.sectionCard} accessibilityRole="text">
        {section.paragraphs.map((paragraph, index) => (
          <Text key={index} style={styles.paragraph}>
            {paragraph}
          </Text>
        ))}
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function WateringFertilizerScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '水やりと施肥の関係',
          headerShown: true,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing8 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {SECTIONS.map((section) => (
          <SectionCard key={section.title} section={section} />
        ))}

        <View style={styles.disclaimerWrapper}>
          <FertilizerDisclaimer />
        </View>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorBackground,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing6,
    paddingTop: spacing4,
    paddingHorizontal: spacing4,
  },

  // ---- セクション ----
  sectionBlock: {
    gap: spacing3,
  },
  sectionTitle: {
    ...textLg,
    color: colorTextPrimary,
  },
  sectionCard: {
    backgroundColor: colorSurface,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    padding: spacing5,
    gap: spacing3,
    ...shadowWashi,
  },
  paragraph: {
    ...textSm,
    color: colorTextSecondary,
    lineHeight: 20,
  },

  // ---- 免責 ----
  disclaimerWrapper: {
    // 余白は scrollContent の gap で制御
  },
});
