import { useState, useEffect, useMemo, useRef } from 'react';
import { View, Pressable, ScrollView, StyleSheet, Image } from 'react-native';
import Text from '../../components/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../../data/hapticsProxy';
import { formatMoney } from '../../data/market';
import {
  getItemsByCategory,
  getItemPrice,
  getOwnedEntry,
  getItemGain,
  getEstateSlots,
  getEstateHourlyIncome,
  getTotalDisplayCapacity,
  buyItem,
  getLocalizedName,
} from '../../data/progression';
import { ScreenHeader, CashPill, StatStrip, EmptyState, ESTATE_IMAGES, styles as ui } from './LegacyUI';
import { t, tf } from '../../data/i18n';

const GOLD = '#fbbf24';

// Each estate gets its own palette so scrolling the listings feels like
// leafing through a luxury property brochure rather than a price list.
const PALETTES = [
  ['#1f2937', '#374151', '#4b5563'],
  ['#1e1b4b', '#312e81', '#3730a3'],
  ['#164e63', '#155e75', '#0e7490'],
  ['#3b2f0b', '#57430f', '#78350f'],
  ['#1e3a2f', '#14532d', '#166534'],
  ['#3b0764', '#4c1d95', '#5b21b6'],
];

const CRESTS = ['shield-half', 'diamond', 'flower', 'flash', 'leaf', 'star'];

function tierLabel(idx) {
  if (idx < 6) return t('legacy_country_seat');
  if (idx < 12) return t('legacy_grand_residence');
  return t('legacy_landmark_estate');
}

// The estate yield rate mirrors the data layer so the brochure can quote a
// per-hour figure before purchase.
const ESTATE_YIELD_PER_HOUR = 0.0015;

export default function EstatesScreen({ money, setMoney, progression, onProgressionChange, onBack }) {
  const [now, setNow] = useState(Date.now());
  const [confirmId, setConfirmId] = useState(null);
  const busyRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  const estates = getItemsByCategory('estates');
  const ownedCount = estates.filter((e) => getOwnedEntry(progression, 'estates', e.id)).length;
  const capacity = getTotalDisplayCapacity(progression);

  // Sold properties move to the portfolio screen, so the market only ever
  // lists what is still available.
  const available = useMemo(
    () =>
      estates
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => !getOwnedEntry(progression, 'estates', item.id)),
    [estates, progression]
  );

  const portfolioValue = useMemo(() => {
    return estates.reduce((sum, item) => {
      const entry = getOwnedEntry(progression, 'estates', item.id);
      if (!entry) return sum;
      return sum + getItemGain(progression, entry, now).value;
    }, 0);
  }, [estates, progression, now]);

  const acquire = (item) => {
    if (busyRef.current) return;
    const price = getItemPrice('estates', item);
    if (money < price) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    const { progression: updated, error } = buyItem(progression, 'estates', item.id, price);
    if (error) return;
    busyRef.current = true;
    requestAnimationFrame(() => { busyRef.current = false; });
    setMoney((m) => Math.max(0, m - price));
    onProgressionChange(updated);
    setConfirmId(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={ui.screen}>
      <ScreenHeader
        title={t('legacy_private_estates')}
        subtitle={t('legacy_property_unlocks_rooms')}
        accent={GOLD}
        onBack={onBack}
        right={<CashPill money={money} />}
      />

      <StatStrip
        stats={[
          { label: t('legacy_holdings'), value: `${ownedCount}/${estates.length}` },
          { label: t('portfolio'), value: formatMoney(portfolioValue), color: GOLD },
          {
            label: t('legacy_yield_hr'),
            value: formatMoney(getEstateHourlyIncome(progression, now)),
            color: '#34d399',
          },
        ]}
      />

      <View style={styles.slotsBanner}>
        <Ionicons name="albums" size={14} color={GOLD} />
        <Text style={styles.slotsText}>
          {capacity > 0
            ? `${capacity} ${capacity === 1 ? t('legacy_display_slot_singular') : t('legacy_display_slots_plural')}${t('legacy_across_properties')}`
            : t('legacy_acquire_first_property')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
        {available.length === 0 ? (
          <EmptyState
            icon="business"
            title={t('legacy_every_property_acquired')}
            message={t('legacy_nothing_left_market')}
          />
        ) : null}

        {available.map(({ item, idx }) => {
          const price = getItemPrice('estates', item);
          const slots = getEstateSlots(item.id);
          const yieldPerHr = price * ESTATE_YIELD_PER_HOUR;
          const canAfford = money >= price;
          const palette = PALETTES[idx % PALETTES.length];
          const crest = CRESTS[idx % CRESTS.length];
          const confirming = confirmId === item.id;
          const monogram = getLocalizedName(item).charAt(0);
          const photo = ESTATE_IMAGES[item.id];

          return (
            <View key={item.id} style={styles.listing}>
              {/* Hero band - stands in for a photograph */}
              {/* Hero: fixed-height band. Everything inside is absolutely
                  positioned - gradient base, monogram underlay, photo,
                  shine, pills top-left/right, name bottom-left. No flow
                  children, so nothing can be pushed out of the frame. */}
              <LinearGradient
                colors={palette}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hero}
              >
                <View style={styles.monogramWrap}>
                  <View style={styles.monogramRing}>
                    <Text style={styles.monogram}>{monogram}</Text>
                  </View>
                </View>
                {photo && (
                  <Image source={photo} style={styles.heroPhoto} resizeMode="cover" />
                )}
                <LinearGradient
                  colors={['rgba(255,255,255,0.10)', 'transparent', 'rgba(0,0,0,0.45)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.6, y: 1 }}
                  style={styles.heroShine}
                />

                <View style={styles.heroTop}>
                  <View style={styles.tierPill}>
                    <Ionicons name={crest} size={10} color={GOLD} />
                    <Text style={styles.tierText}>{tierLabel(idx).toUpperCase()}</Text>
                  </View>
                  <View style={styles.availablePill}>
                    <Text style={styles.availableText}>{t('legacy_for_sale')}</Text>
                  </View>
                </View>

                <View style={styles.heroBottom}>
                  <Text style={styles.estateName}>{getLocalizedName(item)}</Text>
                  <View style={styles.heroMetaRow}>
                    <Ionicons name="albums-outline" size={11} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.heroMeta}>{slots} {t('legacy_display_slots_plural')}</Text>
                    <Text style={styles.heroDot}>·</Text>
                    <Text style={styles.heroMeta}>{t('legacy_lot')}{String(idx + 1).padStart(2, '0')}</Text>
                  </View>
                </View>
              </LinearGradient>

              {/* Specification */}
              <View style={styles.body}>
                <View style={styles.specRow}>
                  <View style={styles.spec}>
                    <Text style={styles.specLabel}>{t('legacy_guide_price')}</Text>
                    <Text style={styles.specValue}>{formatMoney(price)}</Text>
                  </View>
                  <View style={styles.specDivider} />
                  <View style={styles.spec}>
                    <Text style={styles.specLabel}>{t('legacy_yield')}</Text>
                    <Text style={[styles.specValue, { color: '#34d399' }]}>
                      {formatMoney(yieldPerHr)}/hr
                    </Text>
                  </View>
                  <View style={styles.specDivider} />
                  <View style={styles.spec}>
                    <Text style={styles.specLabel}>{t('legacy_slots_label')}</Text>
                    <Text style={[styles.specValue, { color: GOLD }]}>{slots}</Text>
                  </View>
                </View>

                {confirming ? (
                  <View style={styles.confirmRow}>
                    <Pressable style={styles.confirmBtn} onPress={() => acquire(item)}>
                      <Ionicons name="checkmark" size={15} color="#000" />
                      <Text style={styles.confirmBtnText}>
                        {t('legacy_confirm')}{formatMoney(price)}
                      </Text>
                    </Pressable>
                    <Pressable style={styles.cancelBtn} onPress={() => setConfirmId(null)}>
                      <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    style={[styles.offerBtn, !canAfford && styles.offerBtnDisabled]}
                    disabled={!canAfford}
                    onPress={() => {
                      setConfirmId(item.id);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Ionicons
                      name={canAfford ? 'key' : 'lock-closed'}
                      size={15}
                      color={canAfford ? '#000' : '#475569'}
                    />
                    <Text
                      style={[
                        styles.offerBtnText,
                        !canAfford && { color: '#475569' },
                      ]}
                    >
                      {canAfford
                        ? `${t('legacy_make_offer')}${formatMoney(price)}`
                        : tf('need_money_more', { v0: formatMoney(price - money) })}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  slotsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 11,
    borderRadius: 12,
    backgroundColor: 'rgba(251,191,36,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.18)',
  },
  slotsText: {
    flex: 1,
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  listing: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  hero: {
    height: 168,
    overflow: 'hidden',
  },
  heroShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Explicit size required: on the New Architecture, an Image with only
  // absolute insets falls back to its intrinsic pixel size, so the photo
  // draws huge and clips to the top-left of the frame.
  heroPhoto: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: 168,
  },
  heroTop: {
    position: 'absolute',
    top: 12,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
  },
  tierText: {
    color: GOLD,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  availablePill: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  availableText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  // Absolute so it underlays the photo without disturbing the hero's
  // space-between flow (pills top, name bottom).
  monogramWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogramRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(251,191,36,0.45)',
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogram: {
    color: GOLD,
    fontSize: 26,
    fontWeight: '300',
    letterSpacing: 1,
  },
  heroBottom: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 12,
  },
  estateName: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  heroMeta: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '600',
  },
  heroDot: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
  },
  body: {
    padding: 14,
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spec: {
    flex: 1,
  },
  specDivider: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 10,
  },
  specLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  specValue: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 3,
  },
  offerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 14,
    paddingVertical: 13,
    borderRadius: 13,
    backgroundColor: GOLD,
  },
  offerBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  offerBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800',
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 14,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 13,
    backgroundColor: GOLD,
  },
  confirmBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  cancelBtnText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
});
