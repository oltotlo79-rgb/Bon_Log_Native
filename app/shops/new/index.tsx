/**
 * @module app/shops/new/index
 * 盆栽園新規登録フォーム（モーダル表示）。
 * 仕様: docs/design/shops.md §4
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCreateShopMutation, useGenresQuery } from '@/lib/queries/shops';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { FormErrorMessage } from '@/components/auth/FormErrorMessage';
import {
  colorBackground,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorBorder,
  colorBorderLight,
  colorActionPrimary,
  colorActionPrimaryText,
  colorActionSecondary,
  colorActionSecondaryText,
  colorSurfaceMuted,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  radiusMd,
  radiusSm,
  textBase,
  textSm,
  textXs,
  textLg,
} from '@/lib/constants/design-tokens';
import {
  ERR_SHOP_CREATE_FAILED,
  ERR_SHOP_DUPLICATE_ADDRESS,
  ERR_OFFLINE_ACTION,
} from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const NAME_MAX = 200;
const ADDRESS_MAX = 300;
const PHONE_MAX = 20;
const HOURS_MAX = 300;
const CLOSED_DAYS_MAX = 200;
const INPUT_HEIGHT = 48;
const CHIP_HEIGHT = 36;
const CHIP_HIT_SLOP = { top: 4, bottom: 4, left: 4, right: 4 };

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------

function isValidUrl(url: string): boolean {
  if (url.length === 0) return true;
  return url.startsWith('https://') || url.startsWith('http://');
}

function isValidLat(lat: string): boolean {
  if (lat.length === 0) return true;
  const n = parseFloat(lat);
  return !isNaN(n) && n >= -90 && n <= 90;
}

function isValidLng(lng: string): boolean {
  if (lng.length === 0) return true;
  const n = parseFloat(lng);
  return !isNaN(n) && n >= -180 && n <= 180;
}

function isConflictError(error: Error): boolean {
  return error.message.includes('409') || error.message.includes('CONFLICT');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ShopNewScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const { mutate: createShop, isPending } = useCreateShopMutation();
  const { data: genresData } = useGenresQuery('shop');

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([]);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [businessHours, setBusinessHours] = useState('');
  const [closedDays, setClosedDays] = useState('');
  const [error, setError] = useState<string | null>(null);

  const genres = genresData?.items ?? [];
  const hasInput = name.trim().length > 0 || address.trim().length > 0;

  const isNameValid = name.trim().length > 0 && name.length <= NAME_MAX;
  const isAddressValid = address.trim().length > 0 && address.length <= ADDRESS_MAX;
  const isGenresValid = selectedGenreIds.length > 0;
  const isWebsiteValid = isValidUrl(website.trim());
  const isLatValid = isValidLat(lat.trim());
  const isLngValid = isValidLng(lng.trim());

  const canSubmit =
    isNameValid &&
    isAddressValid &&
    isGenresValid &&
    isWebsiteValid &&
    isLatValid &&
    isLngValid &&
    !isPending;

  const handleToggleGenre = useCallback((genreId: string) => {
    setSelectedGenreIds((prev) => {
      if (prev.includes(genreId)) {
        return prev.filter((id) => id !== genreId);
      }
      return [...prev, genreId];
    });
  }, []);

  const handleCancel = useCallback(() => {
    if (hasInput) {
      Alert.alert(
        '変更を破棄しますか？',
        '保存されていない変更は失われます。',
        [
          { text: '編集を続ける', style: 'cancel' },
          { text: '破棄する', style: 'destructive', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  }, [hasInput]);

  const handleSave = useCallback(() => {
    if (!isOnline) {
      setError(ERR_OFFLINE_ACTION);
      return;
    }
    if (!canSubmit) return;

    setError(null);
    const latitude = lat.trim().length > 0 ? parseFloat(lat.trim()) : null;
    const longitude = lng.trim().length > 0 ? parseFloat(lng.trim()) : null;

    createShop(
      {
        name: name.trim(),
        address: address.trim(),
        genreIds: selectedGenreIds,
        latitude,
        longitude,
        phone: phone.trim().length > 0 ? phone.trim() : null,
        website: website.trim().length > 0 ? website.trim() : null,
        businessHours: businessHours.trim().length > 0 ? businessHours.trim() : null,
        closedDays: closedDays.trim().length > 0 ? closedDays.trim() : null,
      },
      {
        onSuccess: () => {
          router.back();
        },
        onError: (err) => {
          setError(isConflictError(err) ? ERR_SHOP_DUPLICATE_ADDRESS : ERR_SHOP_CREATE_FAILED);
        },
      }
    );
  }, [
    isOnline, canSubmit, name, address, selectedGenreIds, lat, lng,
    phone, website, businessHours, closedDays, createShop,
  ]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* モーダルヘッダー */}
      <View style={styles.header}>
        <Pressable
          onPress={handleCancel}
          disabled={isPending}
          accessibilityRole="button"
          accessibilityLabel="キャンセル"
          style={styles.headerButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.headerCancelText}>キャンセル</Text>
        </Pressable>
        <Text style={styles.headerTitle}>店舗を登録</Text>
        <Pressable
          onPress={handleSave}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityLabel="保存する"
          style={styles.headerButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.headerSaveText, !canSubmit && styles.headerSaveTextDisabled]}>
            保存する
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing6 }]}
          keyboardShouldPersistTaps="handled"
        >
          <FormErrorMessage message={error} />

          {/* 店舗名 */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>店舗名 ＊</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              maxLength={NAME_MAX}
              placeholder="例: ○○盆栽園"
              placeholderTextColor={colorTextTertiary}
              editable={!isPending}
              style={[styles.textInput, isPending && styles.inputDisabled]}
              accessibilityLabel="店舗名（必須）"
            />
            <Text style={styles.counter}>{name.length}/{NAME_MAX}</Text>
          </View>

          {/* 住所 */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>住所 ＊</Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              maxLength={ADDRESS_MAX}
              placeholder="例: 東京都新宿区○○1-2-3"
              placeholderTextColor={colorTextTertiary}
              multiline
              numberOfLines={2}
              editable={!isPending}
              style={[styles.textAreaInput, isPending && styles.inputDisabled]}
              accessibilityLabel="住所（必須）"
              textAlignVertical="top"
            />
            <Text style={styles.counter}>{address.length}/{ADDRESS_MAX}</Text>
          </View>

          {/* ジャンル */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>ジャンル ＊</Text>
            <View style={styles.chipRow}>
              {genres.map((genre) => {
                const isSelected = selectedGenreIds.includes(genre.id);
                return (
                  <Pressable
                    key={genre.id}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => handleToggleGenre(genre.id)}
                    hitSlop={CHIP_HIT_SLOP}
                    disabled={isPending}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={isSelected ? `${genre.name}の選択を解除` : `${genre.name}を選択`}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {genre.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* 緯度・経度 */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>緯度（任意）</Text>
            <TextInput
              value={lat}
              onChangeText={setLat}
              placeholder="例: 35.6812"
              placeholderTextColor={colorTextTertiary}
              keyboardType="decimal-pad"
              editable={!isPending}
              style={[styles.textInput, isPending && styles.inputDisabled]}
              accessibilityLabel="緯度（任意）"
            />
            {lat.trim().length > 0 && !isLatValid && (
              <Text style={styles.fieldError}>緯度は -90〜90 の数値を入力してください。</Text>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>経度（任意）</Text>
            <TextInput
              value={lng}
              onChangeText={setLng}
              placeholder="例: 139.7671"
              placeholderTextColor={colorTextTertiary}
              keyboardType="decimal-pad"
              editable={!isPending}
              style={[styles.textInput, isPending && styles.inputDisabled]}
              accessibilityLabel="経度（任意）"
            />
            {lng.trim().length > 0 && !isLngValid && (
              <Text style={styles.fieldError}>経度は -180〜180 の数値を入力してください。</Text>
            )}
            <Text style={styles.hint}>
              緯度・経度を入力すると「地図アプリで開く」機能が有効になります。
            </Text>
          </View>

          {/* 電話番号 */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>電話番号（任意）</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              maxLength={PHONE_MAX}
              placeholder="例: 03-1234-5678"
              placeholderTextColor={colorTextTertiary}
              keyboardType="phone-pad"
              editable={!isPending}
              style={[styles.textInput, isPending && styles.inputDisabled]}
              accessibilityLabel="電話番号（任意）"
            />
          </View>

          {/* Web サイト */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Web サイト URL（任意）</Text>
            <TextInput
              value={website}
              onChangeText={setWebsite}
              placeholder="https://example.com"
              placeholderTextColor={colorTextTertiary}
              keyboardType="url"
              autoCapitalize="none"
              editable={!isPending}
              style={[styles.textInput, isPending && styles.inputDisabled]}
              accessibilityLabel="Web サイト URL（任意）"
            />
            {website.trim().length > 0 && !isWebsiteValid && (
              <Text style={styles.fieldError}>URLは https:// または http:// から始めてください。</Text>
            )}
          </View>

          {/* 営業時間 */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>営業時間（任意）</Text>
            <TextInput
              value={businessHours}
              onChangeText={setBusinessHours}
              maxLength={HOURS_MAX}
              placeholder="例: 月〜土 10:00〜18:00"
              placeholderTextColor={colorTextTertiary}
              multiline
              numberOfLines={2}
              editable={!isPending}
              style={[styles.textAreaInput, isPending && styles.inputDisabled]}
              accessibilityLabel="営業時間（任意）"
              textAlignVertical="top"
            />
          </View>

          {/* 定休日 */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>定休日（任意）</Text>
            <TextInput
              value={closedDays}
              onChangeText={setClosedDays}
              maxLength={CLOSED_DAYS_MAX}
              placeholder="例: 日曜・祝日"
              placeholderTextColor={colorTextTertiary}
              multiline
              numberOfLines={2}
              editable={!isPending}
              style={[styles.textAreaInput, isPending && styles.inputDisabled]}
              accessibilityLabel="定休日（任意）"
              textAlignVertical="top"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorSurfaceWashi,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    paddingHorizontal: spacing4,
    minHeight: 44,
  },
  headerButton: {
    minWidth: 70,
    minHeight: 44,
    justifyContent: 'center',
  },
  headerCancelText: {
    ...textBase,
    color: colorTextSecondary,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    ...textLg,
    color: colorTextPrimary,
  },
  headerSaveText: {
    ...textBase,
    color: colorActionPrimary,
    fontWeight: '600',
    textAlign: 'right',
  },
  headerSaveTextDisabled: {
    opacity: 0.4,
  },
  scrollContent: {
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
    gap: spacing4,
  },
  fieldGroup: {
    gap: spacing2,
  },
  fieldLabel: {
    ...textSm,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  fieldError: {
    ...textSm,
    color: '#c0392b',
  },
  hint: {
    ...textXs,
    color: colorTextSecondary,
  },
  textInput: {
    height: INPUT_HEIGHT,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    paddingHorizontal: spacing3,
    ...textBase,
    color: colorTextPrimary,
    backgroundColor: colorBackground,
  },
  textAreaInput: {
    minHeight: INPUT_HEIGHT * 2,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    paddingHorizontal: spacing3,
    paddingVertical: spacing3,
    ...textBase,
    color: colorTextPrimary,
    backgroundColor: colorBackground,
  },
  inputDisabled: {
    backgroundColor: colorSurfaceMuted,
    opacity: 0.7,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing2,
  },
  chip: {
    height: CHIP_HEIGHT,
    paddingHorizontal: spacing3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colorActionSecondary,
    borderRadius: radiusSm,
  },
  chipSelected: {
    backgroundColor: colorActionPrimary,
  },
  chipText: {
    ...textXs,
    color: colorActionSecondaryText,
  },
  chipTextSelected: {
    color: colorActionPrimaryText,
  },
  counter: {
    ...textSm,
    color: colorTextTertiary,
    textAlign: 'right',
  },
});
