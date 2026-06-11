/**
 * @module components/auth/AuthTermsAgreement
 * 利用規約・プライバシーポリシーへの同意チェックボックス行。
 * store-compliance.md 要件（Google Play UGC ポリシー）で必須の同意導線。
 */

import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colorActionPrimary,
  colorBorder,
  colorTextLink,
  colorTextSecondary,
  radiusXs,
  spacing2,
  spacing3,
  textSm,
} from '@/lib/constants/design-tokens';
import { TERMS_URL, PRIVACY_URL } from '@/lib/constants/external-links';

const CHECKBOX_SIZE = 20;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type AuthTermsAgreementProps = {
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AuthTermsAgreement({
  checked,
  onToggle,
  disabled = false,
}: AuthTermsAgreementProps) {
  async function openTerms() {
    await Linking.openURL(TERMS_URL);
  }

  async function openPrivacy() {
    await Linking.openURL(PRIVACY_URL);
  }

  return (
    <Pressable
      style={[styles.container, disabled && styles.containerDisabled]}
      onPress={disabled ? undefined : onToggle}
      accessibilityRole="checkbox"
      accessibilityLabel="利用規約およびプライバシーポリシーに同意します"
      accessibilityState={{ checked, disabled }}
    >
      <View
        style={[
          styles.checkbox,
          checked && styles.checkboxChecked,
        ]}
      >
        {checked && (
          <Ionicons
            name="checkmark"
            size={14}
            color="#ffffff"
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        )}
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.text}>
          <Text
            style={styles.link}
            onPress={disabled ? undefined : openTerms}
            accessibilityRole="link"
            accessibilityLabel="利用規約を開く"
          >
            利用規約
          </Text>
          <Text style={styles.text}>および</Text>
          <Text
            style={styles.link}
            onPress={disabled ? undefined : openPrivacy}
            accessibilityRole="link"
            accessibilityLabel="プライバシーポリシーを開く"
          >
            プライバシーポリシー
          </Text>
          <Text style={styles.text}>に同意します</Text>
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing2,
    paddingVertical: spacing3,
  },
  containerDisabled: {
    opacity: 0.5,
  },
  checkbox: {
    width: CHECKBOX_SIZE,
    height: CHECKBOX_SIZE,
    borderRadius: radiusXs,
    borderWidth: 1,
    borderColor: colorBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: colorActionPrimary,
    borderColor: colorActionPrimary,
  },
  textContainer: {
    flex: 1,
  },
  text: {
    ...textSm,
    color: colorTextSecondary,
  },
  link: {
    ...textSm,
    color: colorTextLink,
    textDecorationLine: 'underline',
  },
});
