import React, { useState, useEffect } from 'react';
import { View, Pressable, ScrollView, StyleSheet, Modal, FlatList } from 'react-native';
import Text, { useLanguage, useThemeColors } from '../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { t, getSupportedLanguages, getCurrentLanguage, setLanguage } from '../data/i18n';
import { getSettings, loadSettings, saveSettings } from '../data/settings';
import { haptic } from '../data/haptics';
import { formatMoney } from '../data/market';
import { getStats, loadStats, subscribeStats } from '../data/stats';
import PoliciesScreen from './PoliciesScreen';
import { showAlert } from '../data/alert';
import { webModalOverlay, webModalSheet } from '../components/webModal';

function Toggle({ value, onChange, label }) {
  const tc = useThemeColors();
  return (
    <Pressable
      style={[styles.row, { borderTopColor: tc.surfaceBorder }]}
      onPress={() => {
        haptic('light');
        onChange(!value);
      }}
    >
      <Text style={[styles.label, { color: tc.text }]}>{label}</Text>
      <View style={styles.toggle}>
        <View style={styles.toggleHalfBlack} />
        <View style={styles.toggleHalfWhite} />
        <View style={[styles.knob, value ? styles.knobOn : styles.knobOff]} />
      </View>
    </Pressable>
  );
}

function SegmentedControl({ value, options, onChange }) {
  const tc = useThemeColors();
  return (
    <View style={[styles.segmented, { backgroundColor: tc.surface }]}>
      {options.map((opt) => (
        <Pressable
          key={opt.value}
          style={[styles.segment, value === opt.value && { backgroundColor: '#fff' }]}
          onPress={() => { haptic('light'); onChange(opt.value); }}
        >
          {opt.icon && (
            <Ionicons
              name={opt.icon}
              size={18}
              color={value === opt.value ? '#0a0a0a' : tc.isLight ? '#475569' : '#fff'}
            />
          )}
          {opt.label && (
            <Text style={[styles.segmentText, { color: tc.isLight ? '#475569' : '#fff' }, value === opt.value && { color: '#0a0a0a' }]}>
              {opt.label}
            </Text>
          )}
        </Pressable>
      ))}
    </View>
  );
}

function StatRow({ label, value }) {
  const tc = useThemeColors();
  return (
    <View style={[styles.statRow, { borderTopColor: tc.surfaceBorder }]}>
      <Text style={[styles.statLabel, { color: tc.isLight ? '#1e293b' : '#e2e8f0' }]}>{label}</Text>
      <Text style={[styles.statValue, { color: tc.accent }]}>{value}</Text>
    </View>
  );
}

function formatPlayTime(ms) {
  if (!ms || ms <= 0) return '0m';
  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatDate(ts) {
  if (!ts) return '-';
  const d = new Date(ts);
  return d.toLocaleDateString();
}

export default function SettingsScreen({ money, onReset }) {
  const insets = useSafeAreaInsets();
  useLanguage(); // re-render on language change
  const [settings, setLocalSettings] = useState(getSettings);
  const [language, setLocalLanguage] = useState(getCurrentLanguage);
  const [langModal, setLangModal] = useState(false);
  const [policyTab, setPolicyTab] = useState(null); // 'privacy' | 'terms' | 'licenses' | null
  const [stats, setStats] = useState(getStats);
  const tc = useThemeColors();

  useEffect(() => {
    loadSettings().then(setLocalSettings);
    setLocalLanguage(getCurrentLanguage());
    loadStats().then(setStats);
    const unsub = subscribeStats(setStats);
    return () => { unsub(); };
  }, []);

  const update = async (patch) => {
    const next = await saveSettings(patch);
    setLocalSettings(next);
  };

  const onChangeLanguage = async (lang) => {
    await setLanguage(lang);
    setLocalLanguage(lang);
    setLangModal(false);
    haptic('success');
  };

  const onResetPress = () => {
    haptic('warning');
    showAlert(t('reset_confirm_title'), t('reset_confirm_message'), [
      { text: t('reset_no'), style: 'cancel' },
      {
        text: t('reset_yes'),
        style: 'destructive',
        onPress: async () => {
          try {
            const keys = await AsyncStorage.getAllKeys();
            // Keep purchase entitlements (StoreKit owns those) and device
            // preferences, whose in-memory singletons would otherwise drift
            // from storage. Everything else is progress and goes.
            const keep = new Set(['tapGameStore', 'tapGameSettings', 'tapGameLanguage']);
            await AsyncStorage.multiRemove(keys.filter((k) => !keep.has(k)));
            if (onReset) onReset();
          } catch (e) { /* reset best-effort */ }
        },
      },
    ]);
  };

  const langName = getSupportedLanguages().find((l) => l.id === language)?.name || 'English';

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: tc.bg }]}>
      <LinearGradient colors={tc.bgGradient} style={styles.bg} />

      <View style={[styles.header, { borderBottomColor: tc.surfaceBorder }]}>
        <Text style={[styles.title, { color: tc.text }]}>{t('settings')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.section, { backgroundColor: tc.surface }]}>
          <Text style={[styles.sectionTitle, { color: tc.textSecondary }]}>{t('language')}</Text>
          <Pressable style={[styles.row, { borderTopColor: tc.surfaceBorder }]} onPress={() => { haptic('light'); setLangModal(true); }}>
            <Text style={[styles.label, { color: tc.text }]}>{t('language')}</Text>
            <View style={styles.valueRow}>
              <Text style={[styles.value, { color: tc.textSecondary }]}>{langName}</Text>
              <Ionicons name="chevron-forward" size={18} color={tc.textSecondary} />
            </View>
          </Pressable>
        </View>

        <View style={[styles.section, { backgroundColor: tc.surface }]}>
          <Text style={[styles.sectionTitle, { color: tc.textSecondary }]}>{t('accessibility')}</Text>
          <Toggle value={settings.haptics} onChange={(v) => update({ haptics: v })} label={t('haptics')} />
          <Toggle value={settings.reducedMotion} onChange={(v) => update({ reducedMotion: v })} label={t('reduced_motion')} />
          <Toggle value={settings.largerText} onChange={(v) => update({ largerText: v })} label={t('larger_text')} />
          <Toggle value={settings.highContrast} onChange={(v) => update({ highContrast: v })} label={t('high_contrast')} />
        </View>

        <View style={[styles.section, { backgroundColor: tc.surface }]}>
          <Text style={[styles.sectionTitle, { color: tc.textSecondary }]}>{t('news_ticker')}</Text>
          <Toggle value={settings.newsTicker !== false} onChange={(v) => update({ newsTicker: v })} label={t('news_ticker')} />
          <View style={[styles.row, { borderTopColor: tc.surfaceBorder }]}>
            <Text style={[styles.label, { color: tc.text }]}>{t('ticker_speed')}</Text>
            <SegmentedControl
              value={settings.tickerSpeed || 'fast'}
              options={[
                { value: 'slow', icon: 'hourglass' },
                { value: 'fast', icon: 'flash' },
              ]}
              onChange={(v) => update({ tickerSpeed: v })}
            />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: tc.surface }]}>
          <Text style={[styles.sectionTitle, { color: tc.textSecondary }]}>{t('theme')}</Text>
          <View style={[styles.row, { borderTopColor: tc.surfaceBorder }]}>
            <Text style={[styles.label, { color: tc.text }]}>{t('theme')}</Text>
            <SegmentedControl
              value={settings.theme || 'dark'}
              options={[
                { value: 'dark', icon: 'moon' },
                { value: 'light', icon: 'sunny' },
              ]}
              onChange={(v) => update({ theme: v })}
            />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: tc.surface }]}>
          <Text style={[styles.sectionTitle, { color: tc.textSecondary }]}>{t('stats')}</Text>
          <StatRow label={t('stat_total_taps')} value={stats.totalTaps?.toLocaleString() || '0'} />
          <StatRow label={t('stat_total_earned')} value={formatMoney(stats.totalEarned || 0)} />
          <StatRow label={t('stat_tap_earnings')} value={formatMoney(stats.totalTapEarnings || 0)} />
          <StatRow label={t('stat_passive_earnings')} value={formatMoney(stats.totalPassiveEarnings || 0)} />
          <StatRow label={t('stat_business_income')} value={formatMoney(stats.totalBusinessIncome || 0)} />
          <StatRow label={t('stat_investment_income')} value={formatMoney(stats.totalInvestmentIncome || 0)} />
          <StatRow label={t('stat_estate_income')} value={formatMoney(stats.totalEstateIncome || 0)} />
          <StatRow label={t('stat_highest_balance')} value={formatMoney(stats.highestBalance || 0)} />
          <StatRow label={t('stat_net_worth')} value={formatMoney(money)} />
          <StatRow label={t('stat_businesses_owned')} value={String(stats.businessesOwned || 0)} />
          <StatRow label={t('stat_businesses_bought')} value={String(stats.businessesBought || 0)} />
          <StatRow label={t('stat_businesses_sold')} value={String(stats.businessesSold || 0)} />
          <StatRow label={t('stat_businesses_upgraded')} value={String(stats.businessesUpgraded || 0)} />
          <StatRow label={t('stat_investments_bought')} value={String(stats.investmentsBought || 0)} />
          <StatRow label={t('stat_investments_sold')} value={String(stats.investmentsSold || 0)} />
          <StatRow label={t('stat_estates_owned')} value={String(stats.estatesOwned || 0)} />
          <StatRow label={t('stat_estates_bought')} value={String(stats.estatesBought || 0)} />
          <StatRow label={t('stat_jobs_held')} value={String(stats.jobsHeld || 0)} />
          <StatRow label={t('stat_job_taps')} value={String(stats.jobTapsCompleted || 0)} />
          <StatRow label={t('stat_boosts_used')} value={String(stats.boostsUsed || 0)} />
          <StatRow label={t('stat_ads_watched')} value={String(stats.adsWatched || 0)} />
          <StatRow label={t('stat_events_triggered')} value={String(stats.eventsTriggered || 0)} />
          <StatRow label={t('stat_play_time')} value={formatPlayTime(stats.totalPlayTimeMs)} />
          <StatRow label={t('stat_first_play')} value={formatDate(stats.firstPlayTimestamp)} />
        </View>


        <View style={[styles.section, { backgroundColor: tc.surface }]}>
          <Text style={[styles.sectionTitle, { color: tc.textSecondary }]}>{t('settings_legal')}</Text>
          {[
            { tab: 'privacy', labelKey: 'legal_privacy_policy', icon: 'shield-checkmark-outline' },
            { tab: 'terms', labelKey: 'legal_terms_of_use', icon: 'document-text-outline' },
            { tab: 'licenses', labelKey: 'policy_tab_licenses', icon: 'ribbon-outline' },
          ].map((row) => (
            <Pressable
              key={row.tab}
              style={[styles.row, { borderTopColor: tc.surfaceBorder }]}
              accessibilityRole="link"
              onPress={() => {
                haptic('light');
                setPolicyTab(row.tab);
              }}
            >
              <Text style={[styles.label, { color: tc.text }]}>{t(row.labelKey)}</Text>
              <View style={styles.valueRow}>
                <Ionicons name={row.icon} size={18} color={tc.textSecondary} />
                <Ionicons name="chevron-forward" size={18} color={tc.textSecondary} />
              </View>
            </Pressable>
          ))}
        </View>

        <View style={[styles.section, { backgroundColor: tc.surface }]}>
          <Text style={[styles.sectionTitle, { color: tc.textSecondary }]}>{t('data')}</Text>
          <Pressable
            style={[styles.resetBtn, { marginBottom: 14 }]}
            onPress={() => { haptic('medium'); onResetPress(); }}
          >
            <Ionicons name="trash-outline" size={18} color="#fff" />
            <Text style={styles.resetText}>{t('reset_progress')}</Text>
          </Pressable>
          <View style={[styles.row, { borderTopColor: tc.surfaceBorder }]}>
            <Text style={[styles.label, { color: tc.text }]}>{t('balance_label')}</Text>
            <Text style={[styles.value, { color: tc.textSecondary }]}>{formatMoney(money)}</Text>
          </View>
        </View>
      </ScrollView>

      <Modal visible={langModal} transparent animationType="slide" onRequestClose={() => setLangModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: tc.overlay }, webModalOverlay()]}>
          <View style={[styles.modal, { backgroundColor: tc.modalBg }, webModalSheet()]}>
            <View style={[styles.modalHeader, { borderBottomColor: tc.surfaceBorder }]}>
              <Text style={[styles.modalTitle, { color: tc.text }]}>{t('language')}</Text>
              <Pressable onPress={() => setLangModal(false)}>
                <Ionicons name="close" size={24} color={tc.text} />
              </Pressable>
            </View>
            <FlatList
              data={getSupportedLanguages()}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.langRow, { borderBottomColor: tc.surfaceBorder }, item.id === language && { backgroundColor: tc.isLight ? 'rgba(217,119,6,0.1)' : 'rgba(251,191,36,0.1)' }]}
                  onPress={() => onChangeLanguage(item.id)}
                >
                  <Text style={[styles.langText, { color: tc.isLight ? '#1e293b' : '#e2e8f0' }, item.id === language && { color: tc.accent, fontWeight: '700' }]}>{item.name}</Text>
                  {item.id === language && <Ionicons name="checkmark" size={18} color={tc.accent} />}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      <PoliciesScreen visible={!!policyTab} initialTab={policyTab || 'privacy'} onClose={() => setPolicyTab(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  bg: { ...StyleSheet.absoluteFillObject },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  title: { color: '#fff', fontSize: 28, fontWeight: '900' },
  content: { padding: 20, paddingBottom: 140 },
  section: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18, marginBottom: 16, overflow: 'hidden' },
  sectionTitle: { color: '#94a3b8', fontSize: 13, fontWeight: '700', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  label: { color: '#fff', fontSize: 16, fontWeight: '600' },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  value: { color: '#94a3b8', fontSize: 15, fontWeight: '500' },
  toggle: { width: 60, height: 24, borderRadius: 4, flexDirection: 'row', overflow: 'hidden', position: 'relative' },
  toggleHalfBlack: { flex: 1, backgroundColor: '#0a0a0a' },
  toggleHalfWhite: { flex: 1, backgroundColor: '#fff' },
  knob: { position: 'absolute', top: 2, width: 20, height: 20, borderRadius: 3 },
  knobOff: { backgroundColor: '#ef4444', left: 2 },
  knobOn: { backgroundColor: '#22c55e', left: 38 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginTop: 12, paddingVertical: 14, backgroundColor: '#ef4444', borderRadius: 14 },
  resetText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#111118', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  langRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  langText: { color: '#e2e8f0', fontSize: 16 },
  segmented: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 2 },
  segment: { flexDirection: 'row', width: 40, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  segmentText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  statLabel: { color: '#e2e8f0', fontSize: 14, fontWeight: '500', flex: 1 },
  statValue: { color: '#fbbf24', fontSize: 14, fontWeight: '700', textAlign: 'right' },
});
