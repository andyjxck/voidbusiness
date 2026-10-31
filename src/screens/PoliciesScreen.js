// In-app policies: Privacy Policy (UK GDPR), Terms of Use, Transparency.
// Rendered as a bottom-sheet modal from Settings with three tabs.
// These are real legal documents - keep them accurate to what the app does.

import React, { useState } from 'react';
import { View, Pressable, ScrollView, StyleSheet, Modal } from 'react-native';
import Text, { useLanguage, useThemeColors } from '../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { haptic } from '../data/haptics';
import { webModalOverlay, webModalSheet } from '../components/webModal';

const LAST_UPDATED = 'January 2025';

const PRIVACY = [
  { title: 'Who we are', body: `Void Business is published by an independent developer trading as AndySocial ("we", "us"). We are the data controller for the limited data processing described in this policy.

Contact: andy@andysocialapps.website` },
  { title: 'What we collect', body: `We designed the game to collect as little as possible:

• Game data - your balance, businesses, investments, collections, purchases, and settings. Stored on your device only.
• iCloud sync - if iCloud is enabled on your device, a copy of your save syncs to your private iCloud key-value store under your Apple ID. We cannot see, access, or retrieve it.
• Purchases - Apple processes payments and tells the app what you bought (for example, that a VIP subscription is active). We never see your card details.
• Advertising - optional rewarded ads are served by Google AdMob. To serve an ad, Google may process your device's advertising identifier, IP address, and coarse device data. We request non-personalised ads only.` },
  { title: 'Lawful bases (UK GDPR)', body: `• Contract - processing game data and purchase entitlements is necessary to provide the game you chose to use.
• Legitimate interests - Apple's fraud prevention and receipt validation.
• Consent - ad-related processing relies on Apple's App Tracking Transparency controls and your device settings; we request non-personalised ads.

You can withdraw consent for ad processing at any time in iOS Settings > Privacy & Security > Tracking.` },
  { title: 'What we do NOT do', body: `• No accounts, sign-ins, or profiles
• No analytics, crash tracking, or telemetry
• No advertising profiles or cross-app tracking
• No sale or sharing of personal data with anyone
• No data held on our own servers - we have none` },
  { title: 'Sharing and transfers', body: `We share data only with the processors needed to run the features you use:

• Apple - App Store payments, subscriptions, and iCloud sync (under Apple's privacy policy)
• Google - AdMob ad delivery (under Google's privacy policy; may involve processing in the USA under appropriate UK GDPR transfer safeguards)

No other third party receives your data.` },
  { title: 'Retention', body: `Game data persists until you delete it: use Reset Progress in Settings, or delete the app. The iCloud copy can be removed via Settings > Apple ID > iCloud > Manage Storage.

Purchase entitlements are retained on-device and via Apple while your App Store account holds them, as required for your continued access and Apple's fiscal records.` },
  { title: 'Your rights', body: `Under UK GDPR you have the right to access, rectification, erasure, restriction, portability, and to object to processing. Because your data lives on your device (and optionally your own iCloud), you already hold it:

• Access - your save file is on your device
• Rectification - reset or change progress in Settings
• Erasure - delete the app and/or remove the iCloud copy
• Restriction/objection - disable iCloud sync or ad permissions in iOS Settings

For anything else, email andy@andysocialapps.website. You also have the right to complain to the UK Information Commissioner's Office (ico.org.uk).` },
  { title: 'Children', body: `The app is not directed at children and does not knowingly collect personal information from them. All data stays on the device. Purchases are gated by Apple's parental controls and Ask to Buy.` },
  { title: 'Security', body: `Your data never leaves your device except through Apple's iCloud (encrypted in transit and at rest under your Apple ID) and the ad/purchase requests described above. No system is perfectly secure, but the app's data footprint is intentionally minimal.` },
  { title: 'Changes', body: `If this policy changes, the updated version will appear here in the app with a new "last updated" date. Material changes will be flagged on screen.` },
];

const TERMS = [
  { title: 'Acceptance', body: `By using Void Business you agree to these Terms of Use and Apple's standard Licensed Application End User License Agreement (EULA). If you do not agree, do not use the app.` },
  { title: 'The game', body: `Void Business grants you a personal, non-exclusive, non-transferable licence to use the app on Apple devices you own. It is entertainment software - a single-player simulation.` },
  { title: 'Virtual items', body: `In-game cash, businesses, upgrades, skins, and other items are virtual goods. They have no real-world monetary value, cannot be exchanged for money or real goods, and are licensed - not sold - to you. We may adjust game balance at any time.` },
  { title: 'Purchases', body: `In-app purchases and the VIP subscription are billed by Apple through your App Store account. Prices are shown in the app before you confirm. Refunds are handled under Apple's policies and your statutory rights.` },
  { title: 'VIP subscription', body: `VIP is an auto-renewable subscription (monthly or yearly). It renews automatically at the end of each period unless you cancel at least 24 hours before renewal, via Settings > Apple ID > Subscriptions. Cancelling stops future charges; benefits continue until the paid period ends.

If we change subscription pricing, Apple's standard notice rules apply and you may cancel before the new price takes effect.` },
  { title: 'Digital content & cancellations', body: `Under UK consumer law, when you buy digital content for immediate delivery you agree that supply begins immediately and acknowledge you lose the 14-day cancellation right once download/streaming begins. Refunds for faulty content remain available under your statutory rights.` },
  { title: 'Fair play', body: `Do not exploit bugs, tamper with the app, or use automation to gain advantage. We may reset progress obtained through exploits. The game is offline-first - your save is your responsibility, though iCloud sync is provided as a convenience.` },
  { title: 'Availability', body: `We may update, suspend, or discontinue features at any time. Where a paid entitlement is materially affected, you may be entitled to a proportionate refund under consumer law.` },
  { title: 'Liability', body: `Nothing in these terms excludes liability for death or personal injury caused by negligence, fraud, or any liability that cannot be excluded under UK law. Otherwise, the app is provided "as is" and we are not liable for loss of virtual progress caused by device failure or deletion, to the extent permitted by law.` },
  { title: 'Governing law', body: `These terms are governed by the laws of England and Wales, and the courts of England and Wales have jurisdiction - without prejudice to any mandatory consumer rights in your place of residence.` },
  { title: 'Contact', body: `Questions about these terms: andy@andysocialapps.website` },
];

const TRANSPARENCY = [
  { title: 'The one-paragraph version', body: `Everything you do in this game stays on your device. We have no servers, no accounts, and no analytics. The only things that leave your phone are (a) your optional iCloud backup, which stays inside your own Apple account, (b) an ad request to Google if you choose to watch a rewarded ad, and (c) purchases, which Apple processes like any App Store payment.` },
  { title: 'Where your save lives', body: `• On-device storage - always
• Your private iCloud key-value store - only if iCloud is on for this app
• Nowhere else

Deleting the app wipes the local copy. The iCloud copy can be removed in iOS Settings > Apple ID > iCloud > Manage Storage.` },
  { title: 'What Apple sees', body: `Apple processes your App Store purchases and subscriptions exactly as it does for every app. They handle payment, receipts, and family sharing. We only learn which product you bought - never card details.` },
  { title: 'What Google sees', body: `Google AdMob serves the optional rewarded video ads. When you choose to watch one, Google's SDK sends an ad request that may include your advertising identifier, IP address, and basic device info. We request non-personalised ads.

VIP members skip ads entirely - no ad requests are made for them.` },
  { title: 'What we see', body: `Nothing. There is no analytics SDK, no crash reporter, and no server to send anything to. We cannot tell who plays the game, how often, or what they bought - beyond what Apple shows us in aggregate App Store sales reports.` },
  { title: 'Purchases & restores', body: `Your entitlement state (VIP status, upgrades owned, card skins unlocked) is stored in your save file and syncs via the same iCloud mechanism. "Restore Purchases" in the shop re-checks with Apple and rebuilds it.` },
  { title: 'Changes & questions', body: `If the data story ever changes, this page changes first. Questions: andy@andysocialapps.website` },
];

const TABS = [
  { id: 'privacy', label: 'Privacy', sections: PRIVACY },
  { id: 'terms', label: 'Terms of Use', sections: TERMS },
  { id: 'transparency', label: 'Transparency', sections: TRANSPARENCY },
];

export default function PoliciesScreen({ visible, onClose }) {
  useLanguage();
  const tc = useThemeColors();
  const [tab, setTab] = useState('privacy');
  const active = TABS.find((x) => x.id === tab);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: tc.overlay }, webModalOverlay()]}>
        <View style={[styles.sheet, { backgroundColor: tc.modalBg }, webModalSheet()]}>
          <View style={[styles.header, { borderBottomColor: tc.surfaceBorder }]}>
            <Text style={[styles.title, { color: tc.text }]}>Policies</Text>
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
                  {x.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={[styles.updated, { color: tc.textMuted }]}>Last updated: {LAST_UPDATED}</Text>
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
  updated: { fontSize: 12, fontWeight: '600', marginBottom: 12, marginLeft: 4 },
  card: { borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1 },
  cardTitle: { fontSize: 14, fontWeight: '800', marginBottom: 6, letterSpacing: 0.3 },
  cardBody: { fontSize: 14, lineHeight: 21, fontWeight: '500' },
});
