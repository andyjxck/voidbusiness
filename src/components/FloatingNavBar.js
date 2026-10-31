import { Pressable, View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text, { useLanguage } from './AppText';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../data/hapticsProxy';
import { t } from '../data/i18n';

export const TABS = [
  { id: 'home', icon: 'home', labelKey: 'tab_home' },
  { id: 'invest', icon: 'trending-up', labelKey: 'tab_invest' },
  { id: 'business', icon: 'briefcase', labelKey: 'tab_business' },
  { id: 'progression', icon: 'diamond', labelKey: 'tab_legacy' },
  { id: 'shop', icon: 'bag-handle', labelKey: 'tab_shop' },
  { id: 'settings', icon: 'settings', labelKey: 'tab_settings' },
];

// On wide browser windows AppShell renders a real sidebar instead - the
// floating pill would hover awkwardly over desktop-width content.
// Note: use realWindowWidth, not useWindowDimensions - on web, Dimensions is
// patched to report the content column width, not the browser width.
export { WEB_SIDEBAR_MIN_WIDTH } from '../data/webDims';
import { WEB_SIDEBAR_MIN_WIDTH, realWindowWidth } from '../data/webDims';

export default function FloatingNavBar({ activeTab, onTabChange, showProgression }) {
  useLanguage(); // re-render on language change
  const insets = useSafeAreaInsets();
  useWindowDimensions(); // re-render on resize so the web sidebar gate re-evaluates
  const tabs = TABS.filter((t) => t.id !== 'progression' || showProgression);
  if (Platform.OS === 'web' && realWindowWidth() >= WEB_SIDEBAR_MIN_WIDTH) return null;
  return (
    // Android edge-to-edge: the system nav bar can be 48px tall under 3-button
    // navigation, so the bar must clear it rather than sit at a fixed offset.
    <View style={[styles.wrapper, { bottom: Math.max(insets.bottom, 12) + 6 }]}>
      <BlurView intensity={60} tint="dark" style={styles.bar}>
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => {
                if (!active) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onTabChange(tab.id);
                }
              }}
            >
              <Ionicons
                name={active ? tab.icon : tab.icon + '-outline'}
                size={20}
                color={active ? '#fbbf24' : '#94a3b8'}
              />
              {/* Only the active tab shows its label, so six tabs still fit */}
              {active && <Text style={styles.labelActive}>{t(tab.labelKey)}</Text>}
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 28,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  bar: {
    flexDirection: 'row',
    borderRadius: 28,
    paddingVertical: 6,
    paddingHorizontal: 5,
    gap: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(20,20,20,0.9)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 16,
        shadowOpacity: 0.3,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 11,
    borderRadius: 22,
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  labelActive: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '800',
  },
});
