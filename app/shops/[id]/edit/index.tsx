/**
 * @module app/shops/[id]/edit/index
 * 盆栽園情報編集フォーム（モーダル表示）。owner のみアクセス可。
 * 仕様: docs/design/shops.md §4
 */

import React, { useReducer, useState, useCallback, useEffect } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShopDetailQuery, useUpdateShopMutation, useGenresQuery } from '@/lib/queries/shops';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { FormErrorMessage } from '@/components/auth/FormErrorMessage';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import {
  colorBackground,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
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
  ERR_SHOP_UPDATE_FAILED,
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
// 型ガード
// ---------------------------------------------------------------------------

function getIdParam(params: Record<string, string | string[] | undefined>): string {
  const id = params['id'];
  if (typeof id === 'string' && id.length > 0) return id;
  return '';
}

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

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

type ShopFormState = {
  name: string;
  address: string;
  selectedGenreIds: string[];
  lat: string;
  lng: string;
  phone: string;
  website: string;
  businessHours: string;
  closedDays: string;
  initialized: boolean;
};

type ShopFormAction =
  | { type: 'INIT'; payload: NonNullable<ReturnType<typeof useShopDetailQuery>['data']> }
  | { type: 'SET_NAME'; value: string }
  | { type: 'SET_ADDRESS'; value: string }
  | { type: 'TOGGLE_GENRE'; genreId: string }
  | { type: 'SET_LAT'; value: string }
  | { type: 'SET_LNG'; value: string }
  | { type: 'SET_PHONE'; value: string }
  | { type: 'SET_WEBSITE'; value: string }
  | { type: 'SET_BUSINESS_HOURS'; value: string }
  | { type: 'SET_CLOSED_DAYS'; value: string };

const INITIAL_SHOP_FORM_STATE: ShopFormState = {
  name: '',
  address: '',
  selectedGenreIds: [],
  lat: '',
  lng: '',
  phone: '',
  website: '',
  businessHours: '',
  closedDays: '',
  initialized: false,
};

function shopFormReducer(state: ShopFormState, action: ShopFormAction): ShopFormState {
  switch (action.type) {
    case 'INIT':
      return {
        name: action.payload.name,
        address: action.payload.address,
        selectedGenreIds: action.payload.genres.map((g) => g.id),
        lat: action.payload.latitude !== null ? String(action.payload.latitude) : '',
        lng: action.payload.longitude !== null ? String(action.payload.longitude) : '',
        phone: action.payload.phone ?? '',
        website: action.payload.website ?? '',
        businessHours: action.payload.businessHours ?? '',
        closedDays: action.payload.closedDays ?? '',
        initialized: true,
      };
    case 'SET_NAME': return { ...state, name: action.value };
    case 'SET_ADDRESS': return { ...state, address: action.value };
    case 'TOGGLE_GENRE':
      return {
        ...state,
        selectedGenreIds: state.selectedGenreIds.includes(action.genreId)
          ? state.selectedGenreIds.filter((id) => id !== action.genreId)
          : [...state.selectedGenreIds, action.genreId],
      };
    case 'SET_LAT': return { ...state, lat: action.value };
    case 'SET_LNG': return { ...state, lng: action.value };
    case 'SET_PHONE': return { ...state, phone: action.value };
    case 'SET_WEBSITE': return { ...state, website: action.value };
    case 'SET_BUSINESS_HOURS': return { ...state, businessHours: action.value };
    case 'SET_CLOSED_DAYS': return { ...state, closedDays: action.value };
    default: return state;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ShopEditScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const params = useLocalSearchParams<{ id: string }>();
  const shopId = getIdParam(params);

  const { data: shop, isLoading } = useShopDetailQuery(shopId);
  const { mutate: updateShop, isPending } = useUpdateShopMutation();
  const { data: genresData } = useGenresQuery('shop');

  const [form, dispatch] = useReducer(shopFormReducer, INITIAL_SHOP_FORM_STATE);
  const [error, setError] = useState<string | null>(null);

  const genres = genresData?.items ?? [];

  useEffect(() => {
    if (shop !== undefined && !form.initialized) {
      dispatch({ type: 'INIT', payload: shop });
    }
  }, [shop, form.initialized]);

  const { name, address, selectedGenreIds, lat, lng, phone, website, businessHours, closedDays, initialized } = form;

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

  const hasChanges = initialized && shop !== undefined && (
    name !== shop.name ||
    address !== shop.address ||
    JSON.stringify(selectedGenreIds.slice().sort()) !== JSON.stringify(shop.genres.map((g) => g.id).slice().sort()) ||
    lat !== (shop.latitude !== null ? String(shop.latitude) : '') ||
    lng !== (shop.longitude !== null ? String(shop.longitude) : '') ||
    phone !== (shop.phone ?? '') ||
    website !== (shop.website ?? '') ||
    businessHours !== (shop.businessHours ?? '') ||
    closedDays !== (shop.closedDays ?? '')
  );

  const handleCancel = useCallback(() => {
    if (hasChanges) {
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
  }, [hasChanges]);

  const handleSave = useCallback(() => {
    if (!isOnline) {
      setError(ERR_OFFLINE_ACTION);
      return;
    }
    if (!canSubmit) return;

    setError(null);
    const latitude = lat.trim().length > 0 ? parseFloat(lat.trim()) : null;
    const longitude = lng.trim().length > 0 ? parseFloat(lng.trim()) : null;

    updateShop(
      {
        id: shopId,
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
        onError: () => {
          setError(ERR_SHOP_UPDATE_FAILED);
        },
      }
    );
  }, [
    isOnline, canSubmit, shopId, name, address, selectedGenreIds,
    lat, lng, phone, website, businessHours, closedDays, updateShop,
  ]);

  if (isLoading || !initialized) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerButton} accessibilityRole="button" accessibilityLabel="キャンセル">
            <Text style={styles.headerCancelText}>キャンセル</Text>
          </Pressable>
          <Text style={styles.headerTitle}>店舗情報を編集</Text>
          <View style={styles.headerButton} />
        </View>
        <ScreenLoading variant="spinner" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
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
        <Text style={styles.headerTitle}>店舗情報を編集</Text>
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

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>店舗名 ＊</Text>
            <TextInput
              value={name}
              onChangeText={(v) => dispatch({ type: 'SET_NAME', value: v })}
              maxLength={NAME_MAX}
              editable={!isPending}
              style={[styles.textInput, isPending && styles.inputDisabled]}
              accessibilityLabel="店舗名（必須）"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>住所 ＊</Text>
            <TextInput
              value={address}
              onChangeText={(v) => dispatch({ type: 'SET_ADDRESS', value: v })}
              maxLength={ADDRESS_MAX}
              multiline
              numberOfLines={2}
              editable={!isPending}
              style={[styles.textAreaInput, isPending && styles.inputDisabled]}
              accessibilityLabel="住所（必須）"
              textAlignVertical="top"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>ジャンル ＊</Text>
            <View style={styles.chipRow}>
              {genres.map((genre) => {
                const isSelected = selectedGenreIds.includes(genre.id);
                return (
                  <Pressable
                    key={genre.id}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => dispatch({ type: 'TOGGLE_GENRE', genreId: genre.id })}
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

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>緯度（任意）</Text>
            <TextInput
              value={lat}
              onChangeText={(v) => dispatch({ type: 'SET_LAT', value: v })}
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
              onChangeText={(v) => dispatch({ type: 'SET_LNG', value: v })}
              keyboardType="decimal-pad"
              editable={!isPending}
              style={[styles.textInput, isPending && styles.inputDisabled]}
              accessibilityLabel="経度（任意）"
            />
            {lng.trim().length > 0 && !isLngValid && (
              <Text style={styles.fieldError}>経度は -180〜180 の数値を入力してください。</Text>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>電話番号（任意）</Text>
            <TextInput
              value={phone}
              onChangeText={(v) => dispatch({ type: 'SET_PHONE', value: v })}
              maxLength={PHONE_MAX}
              keyboardType="phone-pad"
              editable={!isPending}
              style={[styles.textInput, isPending && styles.inputDisabled]}
              accessibilityLabel="電話番号（任意）"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Web サイト URL（任意）</Text>
            <TextInput
              value={website}
              onChangeText={(v) => dispatch({ type: 'SET_WEBSITE', value: v })}
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

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>営業時間（任意）</Text>
            <TextInput
              value={businessHours}
              onChangeText={(v) => dispatch({ type: 'SET_BUSINESS_HOURS', value: v })}
              maxLength={HOURS_MAX}
              multiline
              numberOfLines={2}
              editable={!isPending}
              style={[styles.textAreaInput, isPending && styles.inputDisabled]}
              accessibilityLabel="営業時間（任意）"
              textAlignVertical="top"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>定休日（任意）</Text>
            <TextInput
              value={closedDays}
              onChangeText={(v) => dispatch({ type: 'SET_CLOSED_DAYS', value: v })}
              maxLength={CLOSED_DAYS_MAX}
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
  container: { flex: 1, backgroundColor: colorBackground },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorSurfaceWashi,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    paddingHorizontal: spacing4,
    minHeight: 44,
  },
  headerButton: { minWidth: 70, minHeight: 44, justifyContent: 'center' },
  headerCancelText: { ...textBase, color: colorTextSecondary },
  headerTitle: { flex: 1, textAlign: 'center', ...textLg, color: colorTextPrimary },
  headerSaveText: { ...textBase, color: colorActionPrimary, fontWeight: '600', textAlign: 'right' },
  headerSaveTextDisabled: { opacity: 0.4 },
  scrollContent: { paddingHorizontal: spacing4, paddingTop: spacing4, gap: spacing4 },
  fieldGroup: { gap: spacing2 },
  fieldLabel: { ...textSm, color: colorTextPrimary, fontWeight: '600' },
  fieldError: { ...textSm, color: '#c0392b' },
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
  inputDisabled: { backgroundColor: colorSurfaceMuted, opacity: 0.7 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing2 },
  chip: {
    height: CHIP_HEIGHT,
    paddingHorizontal: spacing3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colorActionSecondary,
    borderRadius: radiusSm,
  },
  chipSelected: { backgroundColor: colorActionPrimary },
  chipText: { ...textXs, color: colorActionSecondaryText },
  chipTextSelected: { color: colorActionPrimaryText },
});
