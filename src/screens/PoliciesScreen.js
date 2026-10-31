// In-app policies: Privacy Policy (UK GDPR), Terms of Use, Transparency and
// Licences. Rendered as a bottom-sheet modal from Settings and the shop.
// The text lives in src/data/legalText.js, which also generates the hosted
// pages in docs/ - keep it accurate to what the app does.

import React, { useState, useEffect } from 'react';
import { View, Pressable, ScrollView, StyleSheet, Modal, Linking } from 'react-native';
import Text, { useLanguage, useThemeColors } from '../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { haptic } from '../data/haptics';
import { t } from '../data/i18n';
import { webModalOverlay, webModalSheet } from '../components/webModal';
import { PRIVACY, TERMS, TRANSPARENCY, ACKNOWLEDGEMENTS } from '../data/legalText';
import { LEGAL_LAST_UPDATED, PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '../config/legal';

const TABS = [
  { id: 'privacy', labelKey: 'policy_tab_privacy', sections: PRIVACY, url: PRIVACY_POLICY_URL },
  { id: 'terms', labelKey: 'policy_tab_terms', sections: TERMS, url: TERMS_OF_USE_URL },
  { id: 'transparency', labelKey: 'policy_tab_transparency', sections: TRANSPARENCY },
  { id: 'licenses', labelKey: 'policy_tab_licenses', sections: ACKNOWLEDGEMENTS },
];

export default function PoliciesScreen({ visible, onClose, initialTab = 'privacy' }) {
  useLanguage();
  const tc = useThemeColors();
  const [tab, setTab] = useState(initialTab);
  useEffect(() => { if (visible) setTab(initialTab); }, [visible, initialTab]);
  const active = TABS.find((x) => x.id === tab) || TABS[0];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: tc.overlay }, webModalOverlay()]}>
        <View style={[styles.sheet, { backgroundColor: tc.modalBg }, webModalSheet()]}>
          <View style={[styles.header, { borderBottomColor: tc.surfaceBorder }]}>
            <Text style={[styles.title, { color: tc.text }]}>{t('settings_policies')}</Text>
            <Pressable onPress={() => { haptic('light'); onClose(); }} hitSlop={12}>
              <Ionicons name="close" size={24} color={tc.text} />
            </Pressable>
          </View>

          <View style={[styles.tabBar, { borderBottomColor: tc.surfaceBorder }]}>
            {TABS.map((x) => (
              <Pressable
                key={x.id}
                style={[styles.tabBtn, tab === x.id && { borderBottomColor: tc.accent, borderBottomWidth: 2 }]}
                onPress={() => { haptic('light'); setTab(x.id); }}
              >
                <Text
                  style={[styles.tabText, { color: tab === x.id ? tc.accent : tc.textMuted }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {t(x.labelKey)}
                </Text>
              </Pressable>
            ))}
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {active.id !== 'licenses' && (
              <Text style={[styles.updated, { color: tc.textMuted }]}>{t('policy_last_updated')} {LEGAL_LAST_UPDATED}</Text>
            )}
            {active.url && (
              <Pressable onPress={() => { haptic('light'); Linking.openURL(active.url).catch(() => {}); }} hitSlop={8}>
                <Text style={[styles.webLink, { color: tc.accent }]}>{t('policy_open_web')}</Text>
              </Pressable>
            )}
            {active.sections.map((s) => (
              <View key={s.title} style={[styles.card, { backgroundColor: tc.surface, borderColor: tc.surfaceBorder }]}>
                <Text style={[styles.cardTitle, { color: tc.accent }]}>{s.title}</Text>
                <Text style={[styles.cardBody, { color: tc.isLight ? '#334155' : '#cbd5e1' }]}>{s.body}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', paddingBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: '800' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 12 },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  content: { padding: 16, paddingBottom: 40 },
  updated: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginLeft: 4 },
  webLink: { fontSize: 13, fontWeight: '700', marginBottom: 12, marginLeft: 4, textDecorationLine: 'underline' },
  card: { borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1 },
  cardTitle: { fontSize: 14, fontWeight: '800', marginBottom: 6, letterSpacing: 0.3 },
  cardBody: { fontSize: 14, lineHeight: 21, fontWeight: '500' },
});
