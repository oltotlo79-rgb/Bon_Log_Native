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
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCreateShopMutation, useGenresQuery, useGeocodeMutation } from '@/lib/queries/shops';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { FormErrorMessage } from '@/components/auth/FormErrorMessage';
import { isApiError } from '@/lib/api/client';
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
  colorError,
  colorSurfaceMuted,
  colorSuccess,
  colorSuccessBg,
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
  ERR_GENERIC,
  ERR_GEOCODE_ADDRESS_NOT_FOUND,
  ERR_SHOP_LATITUDE_OUT_OF_RANGE,
  ERR_SHOP_LONGITUDE_OUT_OF_RANGE,
  ERR_URL_INVALID_PROTOCOL,
  messageForApiError,
} from '@/lib/constants/errors';
import {
  MAX_SHOP_NAME_LENGTH,
  MAX_SHOP_ADDRESS_LENGTH,
  MAX_SHOP_PHONE_LENGTH,
  MAX_SHOP_URL_LENGTH,
  MAX_SHOP_BUSINESS_HOURS_LENGTH,
  MAX_SHOP_CLOSED_DAYS_LENGTH,
  MAX_SHOP_GENRES,
  MIN_SHOP_LATITUDE,
  MAX_SHOP_LATITUDE,
  MIN_SHOP_LONGITUDE,
  MAX_SHOP_LONGITUDE,
} from '@/lib/constants/limits/shop';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

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
  return !isNaN(n) && n >= MIN_SHOP_LATITUDE && n <= MAX_SHOP_LATITUDE;
}

function isValidLng(lng: string): boolean {
  if (lng.length === 0) return true;
  const n = parseFloat(lng);
  return !isNaN(n) && n >= MIN_SHOP_LONGITUDE && n <= MAX_SHOP_LONGITUDE;
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
  const { mutateAsync: geocodeAddress, isPending: isGeocoding } = useGeocodeMutation();

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
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [geocodedAddress, setGeocodedAddress] = useState<string | null>(null);
  const [showManualCoords, setShowManualCoords] = useState(false);

  const genres = genresData?.items ?? [];
  const hasInput = name.trim().length > 0 || address.trim().length > 0;

  const isNameValid = name.trim().length > 0 && name.length <= MAX_SHOP_NAME_LENGTH;
  const isAddressValid = address.trim().length > 0 && address.length <= MAX_SHOP_ADDRESS_LENGTH;
  const isWebsiteValid = isValidUrl(website.trim());
  const isLatValid = isValidLat(lat.trim());
  const isLngValid = isValidLng(lng.trim());

  const canSubmit =
    isNameValid &&
    isAddressValid &&
    isWebsiteValid &&
    isLatValid &&
    isLngValid &&
    !isPending;

  const handleToggleGenre = useCallback((genreId: string) => {
    setSelectedGenreIds((prev) => {
      if (prev.includes(genreId)) {
        return prev.filter((id) => id !== genreId);
      }
      if (prev.length >= MAX_SHOP_GENRES) {
        return prev;
      }
      return [...prev, genreId];
    });
  }, []);

  const handleGeocode = useCallback(async () => {
    const trimmedAddress = address.trim();
    if (trimmedAddress.length === 0) return;

    setGeocodeError(null);
    setGeocodedAddress(null);

    try {
      const result = await geocodeAddress(trimmedAddress);
      setLat(String(result.latitude));
      setLng(String(result.longitude));
      setGeocodedAddress(result.formattedAddress);
    } catch (err) {
      if (isApiError(err)) {
        setGeocodeError(
          err.code === 'NOT_FOUND' ? ERR_GEOCODE_ADDRESS_NOT_FOUND : messageForApiError(err.code)
        );
      } else {
        setGeocodeError(ERR_GENERIC);
      }
    }
  }, [address, geocodeAddress]);

  const handleToggleManualCoords = useCallback(() => {
    setShowManualCoords((prev) => !prev);
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
              maxLength={MAX_SHOP_NAME_LENGTH}
              placeholder="例: ○○盆栽園"
              placeholderTextColor={colorTextTertiary}
              editable={!isPending}
              style={[styles.textInput, isPending && styles.inputDisabled]}
              accessibilityLabel="店舗名（必須）"
            />
            <Text style={styles.counter}>{name.length}/{MAX_SHOP_NAME_LENGTH}</Text>
          </View>

          {/* 住所 */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>住所 ＊</Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              maxLength={MAX_SHOP_ADDRESS_LENGTH}
              placeholder="例: 東京都新宿区○○1-2-3"
              placeholderTextColor={colorTextTertiary}
              multiline
              numberOfLines={2}
              editable={!isPending}
              style={[styles.textAreaInput, isPending && styles.inputDisabled]}
              accessibilityLabel="住所（必須）"
              textAlignVertical="top"
            />
            <Text style={styles.counter}>{address.length}/{MAX_SHOP_ADDRESS_LENGTH}</Text>

            <Pressable
              onPress={() => void handleGeocode()}
              disabled={isPending || isGeocoding || address.trim().length === 0}
              style={[
                styles.geocodeButton,
                (isPending || isGeocoding || address.trim().length === 0) && styles.inputDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="住所から位置を取得"
              accessibilityState={{ disabled: isPending || isGeocoding || address.trim().length === 0 }}
            >
              {isGeocoding ? (
                <ActivityIndicator size="small" color={colorActionSecondaryText} />
              ) : (
                <Text style={styles.geocodeButtonText}>住所から位置を取得</Text>
              )}
            </Pressable>

            {geocodeError !== null && (
              <Text style={styles.fieldError}>{geocodeError}</Text>
            )}
            {geocodedAddress !== null && (
              <View style={styles.geocodeSuccess}>
                <Text style={styles.geocodeSuccessText}>
                  位置情報を取得しました：{geocodedAddress}
                </Text>
              </View>
            )}
          </View>

          {/* ジャンル */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>ジャンル（任意）</Text>
            <View style={styles.chipRow}>
              {genres.map((genre) => {
                const isSelected = selectedGenreIds.includes(genre.id);
                const isExhausted = !isSelected && selectedGenreIds.length >= MAX_SHOP_GENRES;
                return (
                  <Pressable
                    key={genre.id}
                    style={[styles.chip, isSelected && styles.chipSelected, isExhausted && styles.chipDisabled]}
                    onPress={() => handleToggleGenre(genre.id)}
                    hitSlop={CHIP_HIT_SLOP}
                    disabled={isPending || isExhausted}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected, disabled: isExhausted }}
                    accessibilityLabel={isSelected ? `${genre.name}の選択を解除` : `${genre.name}を選択`}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextSelected,
                        isExhausted && styles.chipTextDisabled,
                      ]}
                    >
                      {genre.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {selectedGenreIds.length > 0 && (
              <Text style={styles.counter}>{selectedGenreIds.length}/{MAX_SHOP_GENRES} 選択中</Text>
            )}
          </View>

          {/* 緯度・経度（詳細設定・手動修正用） */}
          <View style={styles.fieldGroup}>
            <Pressable
              onPress={handleToggleManualCoords}
              disabled={isPending}
              style={styles.manualCoordsToggle}
              accessibilityRole="button"
              accessibilityLabel={showManualCoords ? '緯度・経度の手動編集を閉じる' : '緯度・経度を手動で編集'}
              accessibilityState={{ expanded: showManualCoords }}
            >
              <Text style={styles.manualCoordsToggleText}>緯度・経度を手動で編集（任意）</Text>
              <Ionicons
                name={showManualCoords ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colorTextSecondary}
              />
            </Pressable>

            {showManualCoords && (
              <View style={styles.manualCoordsBody}>
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
                    <Text style={styles.fieldError}>
                      {ERR_SHOP_LATITUDE_OUT_OF_RANGE(MIN_SHOP_LATITUDE, MAX_SHOP_LATITUDE)}
                    </Text>
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
                    <Text style={styles.fieldError}>
                      {ERR_SHOP_LONGITUDE_OUT_OF_RANGE(MIN_SHOP_LONGITUDE, MAX_SHOP_LONGITUDE)}
                    </Text>
                  )}
                  <Text style={styles.hint}>
                    緯度・経度を入力すると「地図アプリで開く」機能が有効になります。
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* 電話番号 */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>電話番号（任意）</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              maxLength={MAX_SHOP_PHONE_LENGTH}
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
              maxLength={MAX_SHOP_URL_LENGTH}
              placeholder="https://example.com"
              placeholderTextColor={colorTextTertiary}
              keyboardType="url"
              autoCapitalize="none"
              editable={!isPending}
              style={[styles.textInput, isPending && styles.inputDisabled]}
              accessibilityLabel="Web サイト URL（任意）"
            />
            {website.trim().length > 0 && !isWebsiteValid && (
              <Text style={styles.fieldError}>{ERR_URL_INVALID_PROTOCOL}</Text>
            )}
          </View>

          {/* 営業時間 */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>営業時間（任意）</Text>
            <TextInput
              value={businessHours}
              onChangeText={setBusinessHours}
              maxLength={MAX_SHOP_BUSINESS_HOURS_LENGTH}
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
              maxLength={MAX_SHOP_CLOSED_DAYS_LENGTH}
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
    color: colorError,
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
  chipDisabled: {
    backgroundColor: colorSurfaceMuted,
  },
  chipText: {
    ...textXs,
    color: colorActionSecondaryText,
  },
  chipTextSelected: {
    color: colorActionPrimaryText,
  },
  chipTextDisabled: {
    color: colorTextTertiary,
  },
  counter: {
    ...textSm,
    color: colorTextTertiary,
    textAlign: 'right',
  },
  geocodeButton: {
    minHeight: 44,
    paddingHorizontal: spacing3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colorActionSecondary,
    borderRadius: radiusMd,
    alignSelf: 'flex-start',
  },
  geocodeButtonText: {
    ...textSm,
    color: colorActionSecondaryText,
    fontWeight: '600',
  },
  geocodeSuccess: {
    backgroundColor: colorSuccessBg,
    borderRadius: radiusMd,
    padding: spacing3,
  },
  geocodeSuccessText: {
    ...textSm,
    color: colorSuccess,
  },
  manualCoordsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  manualCoordsToggleText: {
    ...textSm,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  manualCoordsBody: {
    gap: spacing4,
    paddingTop: spacing2,
  },
});
