import { StyleSheet, View, Pressable, Image } from 'react-native';
import Text from '../../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from '../../data/hapticsProxy';
import { formatMoney } from '../../data/market';
import { ARTIFACT_IMAGES_BATCH_1 } from '../../data/artifact_images_batch1';
import { ARTIFACT_IMAGES_BATCH_2 } from '../../data/artifact_images_batch2';
import { ARTIFACT_IMAGES_BATCH_3 } from '../../data/artifact_images_batch3';
import { ARTIFACT_IMAGES_BATCH_4 } from '../../data/artifact_images_batch4';
import { ARTIFACT_IMAGES_BATCH_5 } from '../../data/artifact_images_batch5';
import { TIMEPIECE_IMAGES } from '../../data/timepiece_images';
import { JEWEL_IMAGES } from '../../data/jewel_images';
import { METEORITE_IMAGES } from '../../data/meteorite_images';
import { BOOK_IMAGES } from '../../data/book_images';
import { ESTATE_IMAGES } from '../../data/estate_images';

export const CATEGORY_ICON = {
  spirits: 'wine',
  artifacts: 'diamond',
  timepieces: 'time',
  jewels: 'diamond-outline',
  meteorites: 'planet',
  books: 'library',
  domains: 'globe',
  space: 'rocket',
  estates: 'business',
};

// Rare Spirits get bespoke bottle artwork. Items without a dedicated
// image fall back to the category skin's Ionicon.
export const SPIRIT_IMAGES = {
  amberveil1923: require('../../../assets/collections/spirits/amberveil.jpg'),
  goldbarrel: require('../../../assets/collections/spirits/goldbarrel.jpg'),
  nightshade: require('../../../assets/collections/spirits/nightshade.jpg'),
  crowmoor18: require('../../../assets/collections/spirits/crowmoor.jpg'),
  ironroot: require('../../../assets/collections/spirits/ironroot.jpg'),
  silverstark: require('../../../assets/collections/spirits/silverstark.jpg'),
  emberfall: require('../../../assets/collections/spirits/emberfall.jpg'),
  highglen1945: require('../../../assets/collections/spirits/highglen.jpg'),
  blackwatch: require('../../../assets/collections/spirits/blackwatch.jpg'),
  stormcask: require('../../../assets/collections/spirits/stormcask.jpg'),
  dawnbringer: require('../../../assets/collections/spirits/dawnbringer.jpg'),
  thornfield: require('../../../assets/collections/spirits/thornfield.jpg'),
  ravencrest: require('../../../assets/collections/spirits/ravencrest.jpg'),
  oakheart: require('../../../assets/collections/spirits/oakheart.jpg'),
  wolfscrag: require('../../../assets/collections/spirits/wolfscrag.jpg'),
  mistmoor: require('../../../assets/collections/spirits/mistmoor.jpg'),
  crestview: require('../../../assets/collections/spirits/crestview.jpg'),
  greythorn: require('../../../assets/collections/spirits/greythorn.jpg'),
};

// Ancient Artifacts get bespoke artwork, merged from parallel batch files.
export const ARTIFACT_IMAGES = {
  ...ARTIFACT_IMAGES_BATCH_1,
  ...ARTIFACT_IMAGES_BATCH_2,
  ...ARTIFACT_IMAGES_BATCH_3,
  ...ARTIFACT_IMAGES_BATCH_4,
  ...ARTIFACT_IMAGES_BATCH_5,
};

// Vintage Timepieces, Crown Jewels, and Meteorites get bespoke artwork.
export { TIMEPIECE_IMAGES, JEWEL_IMAGES, METEORITE_IMAGES, BOOK_IMAGES, ESTATE_IMAGES };

// Shared item icon: shows the spirit bottle photo when available,
// otherwise falls back to the category's Ionicon. Used by the dealer,
// exchange, auction house, storage rooms, and collection catalogue.
export function ItemIcon({ categoryId, itemId, color, size = 20, style }) {
  // Domains and Space have no visual at all.
  if (categoryId === 'domains' || categoryId === 'space') {
    return null;
  }
  const image =
    categoryId === 'spirits' ? SPIRIT_IMAGES[itemId]
    : categoryId === 'artifacts' ? ARTIFACT_IMAGES[itemId]
    : categoryId === 'timepieces' ? TIMEPIECE_IMAGES[itemId]
    : categoryId === 'jewels' ? JEWEL_IMAGES[itemId]
    : categoryId === 'meteorites' ? METEORITE_IMAGES[itemId]
    : categoryId === 'books' ? BOOK_IMAGES[itemId]
    : categoryId === 'estates' ? ESTATE_IMAGES[itemId]
    : null;
  if (image) {
    return (
      <View style={[styles.itemIconBox, style]}>
        <Image source={image} style={styles.itemIconImage} resizeMode="cover" />
      </View>
    );
  }
  return (
    <View style={[styles.itemIconBox, style]}>
      <Ionicons
        name={CATEGORY_ICON[categoryId] || 'diamond'}
        size={size}
        color={color}
      />
    </View>
  );
}

// Shared building blocks for every Legacy screen, so the auction house,
// dealer, exchange and storage rooms all read as one coherent section
// while still allowing each to feel like a different kind of shop.

export const ACCENT = {
  auction: '#f97316',
  dealer: '#34d399',
  exchange: '#38bdf8',
  vault: '#94a3b8',
  gallery: '#a78bfa',
  showroom: '#fbbf24',
  estates: '#fbbf24',
  collection: '#a78bfa',
};

export function ScreenHeader({ title, subtitle, accent, onBack, right, gradient, icon }) {
  if (gradient) {
    return (
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, styles.headerHero]}
      >
        {onBack ? (
          <Pressable
            style={styles.backBtn}
            hitSlop={12}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onBack();
            }}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
        ) : null}
        {icon ? (
          <View style={styles.headerIconWrap}>
            <Ionicons name={icon} size={30} color="#fff" />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, styles.headerTitleHero]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.7)' }]}>{subtitle}</Text>
          ) : null}
        </View>
        {right}
      </LinearGradient>
    );
  }

  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable
          style={styles.backBtn}
          hitSlop={12}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onBack();
          }}
        >
          <Ionicons name="chevron-back" size={22} color="#e2e8f0" />
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.headerSubtitle, accent ? { color: accent } : null]}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function CashPill({ money }) {
  return (
    <View style={styles.cashPill}>
      <Ionicons name="wallet-outline" size={12} color="#94a3b8" />
      <Text style={styles.cashText}>{formatMoney(money)}</Text>
    </View>
  );
}

export function StatStrip({ stats }) {
  return (
    <View style={styles.statStrip}>
      {stats.map((s) => (
        <View key={s.label} style={styles.statCell}>
          <Text style={styles.statLabel}>{s.label}</Text>
          <Text style={[styles.statValue, s.color ? { color: s.color } : null]}>{s.value}</Text>
        </View>
      ))}
    </View>
  );
}

export function SegmentedTabs({ tabs, active, onChange, accent }) {
  return (
    <View style={styles.tabBar}>
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <Pressable
            key={t.id}
            style={isActive ? [styles.tab, { backgroundColor: accent }] : styles.tab}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onChange(t.id);
            }}
          >
            {t.icon ? (
              <Ionicons name={t.icon} size={13} color={isActive ? '#000' : '#64748b'} />
            ) : null}
            <Text style={isActive ? [styles.tabText, styles.tabTextActive] : styles.tabText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function formatWait(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function Countdown({ label, ms, accent }) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return (
    <View style={[styles.countdown, accent ? { borderColor: `${accent}55` } : null]}>
      <Ionicons name="time-outline" size={12} color={accent || '#94a3b8'} />
      <Text style={[styles.countdownText, accent ? { color: accent } : null]}>
        {label} {m}:{String(s).padStart(2, '0')}
      </Text>
    </View>
  );
}

export function EmptyState({ icon, title, message }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={44} color="#334155" />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

export function PrimaryButton({ label, icon, accent, disabled, onPress }) {
  return (
    <Pressable
      style={[
        styles.primaryBtn,
        { backgroundColor: accent || '#fbbf24' },
        disabled && styles.primaryBtnDisabled,
      ]}
      disabled={disabled}
      onPress={onPress}
    >
      {icon ? <Ionicons name={icon} size={15} color={disabled ? '#475569' : '#000'} /> : null}
      <Text style={[styles.primaryBtnText, disabled && styles.primaryBtnTextDisabled]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function GhostButton({ label, icon, onPress, disabled }) {
  return (
    <Pressable
      style={[styles.ghostBtn, disabled && { opacity: 0.4 }]}
      disabled={disabled}
      onPress={onPress}
    >
      {icon ? <Ionicons name={icon} size={14} color="#94a3b8" /> : null}
      <Text style={styles.ghostBtnText}>{label}</Text>
    </Pressable>
  );
}

export function GainText({ gain, percent }) {
  const up = gain >= 0;
  return (
    <Text style={[styles.gain, { color: up ? '#34d399' : '#f87171' }]}>
      {up ? '+' : '-'}
      {formatMoney(Math.abs(gain))} ({up ? '+' : ''}
      {percent.toFixed(1)}%)
    </Text>
  );
}

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '600',
  },
  cashPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  cashText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '800',
  },
  statStrip: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 12,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#e2e8f0',
    marginTop: 3,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    flexShrink: 1,
  },
  tabTextActive: {
    color: '#000',
  },
  countdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  countdownText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    gap: 8,
  },
  emptyTitle: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 6,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  primaryBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800',
  },
  primaryBtnTextDisabled: {
    color: '#475569',
  },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  ghostBtnText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
  gain: {
    fontSize: 12,
    fontWeight: '800',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#e2e8f0',
  },
  cardMeta: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 4,
  },
  headerHero: {
    paddingBottom: 22,
    marginBottom: 8,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
    minHeight: 132,
  },
  headerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitleHero: {
    fontSize: 32,
    letterSpacing: -0.8,
  },
  itemIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  itemIconImage: {
    width: '100%',
    height: '100%',
  },
});
