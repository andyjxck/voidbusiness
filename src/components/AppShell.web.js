// Web build: on wide windows the app gets a desktop layout - a left sidebar
// with brand, live stats and vertical nav replaces the floating bottom pill.
// Below WEB_SIDEBAR_MIN_WIDTH it falls through to the mobile layout.
import React, { useEffect, useState } from 'react';
import { View, Pressable, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text, { useLanguage, useThemeColors } from './AppText';
import { TABS } from './FloatingNavBar';
import { WEB_SIDEBAR_WIDTH, WEB_SIDEBAR_MIN_WIDTH, contentColumnWidth, realWindowWidth } from '../data/webDims';
import { formatMoney } from '../data/market';
import { t } from '../data/i18n';

function NavItem({ tab, active, onPress, tc }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered, pressed }) => [
        styles.navItem,
        active && styles.navItemActive,
        (hovered || pressed) && !active && styles.navItemHover,
      ]}
    >
      <Ionicons
        name={active ? tab.icon : tab.icon + '-outline'}
        size={20}
        color={active ? tc.accent : tc.textSecondary}
      />
      <Text style={[styles.navLabel, { color: active ? tc.accent : tc.textSecondary }]}>
        {t(tab.labelKey)}
      </Text>
    </Pressable>
  );
}

export default function AppShell({ children, activeTab, onTabChange, showProgression, money, hourlyIncome }) {
  useLanguage();
  // Real browser width - useWindowDimensions is patched to the content column
  // on web, so track window.innerWidth directly for layout decisions.
  const [realW, setRealW] = useState(() => realWindowWidth());
  useEffect(() => {
    const onResize = () => setRealW(realWindowWidth());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const tc = useThemeColors();
  if (realW < WEB_SIDEBAR_MIN_WIDTH) return <>{children}</>;

  const tabs = TABS.filter((tab) => tab.id !== 'progression' || showProgression);
  return (
    <View style={styles.page}>
      <View style={[styles.sidebar, { backgroundColor: tc.isLight ? '#ffffff' : '#0d0d14', borderRightColor: tc.surfaceBorder }]}>
        <View style={styles.brand}>
          <Image source={require('../../assets/app/logo-web.png')} style={styles.brandLogo} />
          <View>
            <Text style={[styles.brandTitle, { color: tc.text }]}>VOID BUSINESS</Text>
            <Text style={[styles.brandTag, { color: tc.textMuted }]}>Tap. Invest. Dominate.</Text>
          </View>
        </View>

        <View style={[styles.statsCard, { backgroundColor: tc.surface, borderColor: tc.surfaceBorder }]}>
          <Text style={[styles.statLabel, { color: tc.textMuted }]}>{t('balance')}</Text>
          <Text style={[styles.statValue, { color: tc.accent }]} numberOfLines={1}>{formatMoney(money)}</Text>
          {hourlyIncome > 0 && (
            <Text style={[styles.statSub, { color: tc.textSecondary }]} numberOfLines={1}>
              +{formatMoney(hourlyIncome)} {t('income_hr')}
            </Text>
          )}
        </View>

        <View style={styles.nav}>
          {tabs.map((tab) => (
            <NavItem
              key={tab.id}
              tab={tab}
              active={activeTab === tab.id}
              onPress={() => { if (activeTab !== tab.id) onTabChange(tab.id); }}
              tc={tc}
            />
          ))}
        </View>

        <View style={styles.sidebarFooter}>
          <Text style={[styles.version, { color: tc.textMuted }]}>v1.0.0</Text>
        </View>
      </View>
      <View style={styles.content}>
        <View style={[styles.contentInner, { width: contentColumnWidth() }]}>
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    height: '100%',
  },
  sidebar: {
    width: WEB_SIDEBAR_WIDTH,
    paddingTop: 28,
    paddingHorizontal: 18,
    paddingBottom: 20,
    borderRightWidth: 1,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  brandLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  brandTag: {
    fontSize: 11,
    marginTop: 1,
  },
  statsCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 22,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 2,
  },
  statSub: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  nav: {
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    cursor: 'pointer',
  },
  navItemHover: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  navItemActive: {
    backgroundColor: 'rgba(251,191,36,0.12)',
  },
  navLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  sidebarFooter: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  version: {
    fontSize: 11,
  },
  content: {
    flex: 1,
    position: 'relative',
    minWidth: 0,
    alignItems: 'center',
    overflow: 'hidden',
  },
  contentInner: {
    flex: 1,
    position: 'relative',
    alignSelf: 'center',
  },
});
