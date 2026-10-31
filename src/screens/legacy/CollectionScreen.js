import { useState, useEffect, useMemo, useRef } from 'react';
import { View, Pressable, FlatList, StyleSheet, Image, Platform } from 'react-native';
import Text from '../../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from '../../data/hapticsProxy';
import { formatMoney } from '../../data/market';
import { SPIRIT_IMAGES, ARTIFACT_IMAGES, TIMEPIECE_IMAGES, JEWEL_IMAGES, METEORITE_IMAGES, BOOK_IMAGES, ESTATE_IMAGES } from './LegacyUI';

// Rare Spirits get bespoke bottle artwork. Items without a dedicated
// image fall back to the category skin's Ionicon.
// SPIRIT_IMAGES is imported from LegacyUI for sharing across screens.
import {
  getCategory,
  getItemsByCategory,
  getOwnedEntry,
  isOwned,
  getItemGain,
  getEstateSlots,
  getEstateHourlyIncome,
  startAcquisition,
  getPendingAcquisition,
  rushAcquisition,
  getRetailPrice,
  hasOwnedEstate,
  getLocalizedName,
} from '../../data/progression';
import {
  ScreenHeader,
  CashPill,
  StatStrip,
  ACCENT,
  formatWait,
  styles as ui,
} from './LegacyUI';
import { showRewardedAd } from '../../data/ads';
import { t } from '../../data/i18n';

// The catalogue view for a single category. Estates get extra treatment
// because they are the gate: they add display slots and pay hourly yield.
export default function CollectionScreen({
  categoryId,
  money,
  setMoney,
  progression,
  onProgressionChange,
  onBack,
}) {
  const [now, setNow] = useState(Date.now());

  const CATEGORY_SKINS = {
    spirits: {
      accent: '#f59e0b',
      gradient: ['#5c3a10', '#1e1408'],
      heroIcon: 'wine',
      icon: 'wine',
      iconBg: 'rgba(245,158,11,0.18)',
      iconBorder: 'rgba(245,158,11,0.4)',
      iconColor: '#fbbf24',
      iconRadius: 14,
      cardBg: 'rgba(245,158,11,0.06)',
      cardBorder: 'rgba(245,158,11,0.18)',
      titleColor: '#fffbeb',
      priceLabel: t('legacy_cat_whiskey_price'),
      acquireLabel: t('legacy_cat_whiskey_acquire'),
      buttonIcon: 'wine',
      tagline: t('legacy_cat_whiskey_tagline'),
      meta: t('legacy_cat_whiskey_meta'),
    },
    artifacts: {
      accent: '#a78bfa',
      gradient: ['#312e4a', '#141225'],
      heroIcon: 'diamond',
      icon: 'diamond',
      iconBg: 'rgba(167,139,250,0.16)',
      iconBorder: 'rgba(167,139,250,0.4)',
      iconColor: '#c4b5fd',
      iconRadius: 10,
      cardBg: 'rgba(167,139,250,0.05)',
      cardBorder: 'rgba(167,139,250,0.18)',
      titleColor: '#ede9fe',
      priceLabel: t('legacy_cat_relics_price'),
      acquireLabel: t('legacy_cat_relics_acquire'),
      buttonIcon: 'diamond',
      tagline: t('legacy_cat_relics_tagline'),
      meta: t('legacy_cat_relics_meta'),
    },
    timepieces: {
      accent: '#38bdf8',
      gradient: ['#162b3d', '#0b1623'],
      heroIcon: 'time',
      icon: 'time',
      iconBg: 'rgba(56,189,248,0.16)',
      iconBorder: 'rgba(56,189,248,0.4)',
      iconColor: '#7dd3fc',
      iconRadius: 4,
      cardBg: 'rgba(56,189,248,0.05)',
      cardBorder: 'rgba(56,189,248,0.18)',
      titleColor: '#e0f2fe',
      priceLabel: t('legacy_cat_watches_price'),
      acquireLabel: t('legacy_cat_watches_acquire'),
      buttonIcon: 'time',
      tagline: t('legacy_cat_watches_tagline'),
      meta: t('legacy_cat_watches_meta'),
    },
    jewels: {
      accent: '#f472b6',
      gradient: ['#4a1930', '#1e0b14'],
      heroIcon: 'disc',
      icon: 'disc',
      iconBg: 'rgba(244,114,182,0.16)',
      iconBorder: 'rgba(244,114,182,0.4)',
      iconColor: '#fbcfe8',
      iconRadius: 999,
      cardBg: 'rgba(244,114,182,0.05)',
      cardBorder: 'rgba(244,114,182,0.18)',
      titleColor: '#fdf2f8',
      priceLabel: t('legacy_cat_gems_price'),
      acquireLabel: t('legacy_cat_gems_acquire'),
      buttonIcon: 'disc',
      tagline: t('legacy_cat_gems_tagline'),
      meta: t('legacy_cat_gems_meta'),
    },
    meteorites: {
      accent: '#60a5fa',
      gradient: ['#1e293b', '#0f172a'],
      heroIcon: 'aperture',
      icon: 'aperture',
      iconBg: 'rgba(96,165,250,0.16)',
      iconBorder: 'rgba(96,165,250,0.4)',
      iconColor: '#93c5fd',
      iconRadius: 12,
      cardBg: 'rgba(96,165,250,0.05)',
      cardBorder: 'rgba(96,165,250,0.18)',
      titleColor: '#eff6ff',
      priceLabel: t('legacy_cat_meteorites_price'),
      acquireLabel: t('legacy_cat_meteorites_acquire'),
      buttonIcon: 'aperture',
      tagline: t('legacy_cat_meteorites_tagline'),
      meta: t('legacy_cat_meteorites_meta'),
    },
    books: {
      accent: '#34d399',
      gradient: ['#1c3a2a', '#0f1f17'],
      heroIcon: 'library',
      icon: 'book',
      iconBg: 'rgba(52,211,153,0.16)',
      iconBorder: 'rgba(52,211,153,0.4)',
      iconColor: '#6ee7b7',
      iconRadius: 2,
      cardBg: 'rgba(52,211,153,0.05)',
      cardBorder: 'rgba(52,211,153,0.18)',
      titleColor: '#ecfdf5',
      priceLabel: t('legacy_cat_books_price'),
      acquireLabel: t('legacy_cat_books_acquire'),
      buttonIcon: 'book',
      tagline: t('legacy_cat_books_tagline'),
      meta: t('legacy_cat_books_meta'),
    },
    domains: {
      accent: '#22d3ee',
      gradient: ['#083344', '#022c22'],
      heroIcon: 'globe',
      icon: 'globe',
      iconBg: 'rgba(34,211,238,0.16)',
      iconBorder: 'rgba(34,211,238,0.4)',
      iconColor: '#67e8f9',
      iconRadius: 4,
      cardBg: 'rgba(34,211,238,0.05)',
      cardBorder: 'rgba(34,211,238,0.18)',
      titleColor: '#ecfeff',
      priceLabel: t('legacy_cat_domains_price'),
      acquireLabel: t('legacy_cat_domains_acquire'),
      buttonIcon: 'globe',
      tagline: t('legacy_cat_domains_tagline'),
      meta: t('legacy_cat_domains_meta'),
    },
    space: {
      accent: '#fb923c',
      gradient: ['#2e1065', '#0f172a'],
      heroIcon: 'rocket',
      icon: 'rocket',
      iconBg: 'rgba(251,146,60,0.16)',
      iconBorder: 'rgba(251,146,60,0.4)',
      iconColor: '#fdba74',
      iconRadius: 10,
      cardBg: 'rgba(251,146,60,0.05)',
      cardBorder: 'rgba(251,146,60,0.18)',
      titleColor: '#fff7ed',
      priceLabel: t('legacy_cat_space_price'),
      acquireLabel: t('legacy_cat_space_acquire'),
      buttonIcon: 'rocket',
      tagline: t('legacy_cat_space_tagline'),
      meta: t('legacy_cat_space_meta'),
    },
    estates: {
      accent: '#fbbf24',
      gradient: ['#5c4a1a', '#1a1506'],
      heroIcon: 'business',
      icon: 'business',
      iconBg: 'rgba(251,191,36,0.18)',
      iconBorder: 'rgba(251,191,36,0.4)',
      iconColor: '#fde68a',
      iconRadius: 12,
      cardBg: 'rgba(251,191,36,0.06)',
      cardBorder: 'rgba(251,191,36,0.18)',
      titleColor: '#fffbeb',
      priceLabel: t('legacy_cat_estates_price'),
      acquireLabel: t('legacy_cat_estates_acquire'),
      buttonIcon: 'business',
      tagline: t('legacy_cat_estates_tagline'),
      meta: t('legacy_cat_estates_meta'),
    },
  };

  const busyRef = useRef(false);

  const rushPending = (pending) => {
    showRewardedAd(() => {
      onProgressionChange(rushAcquisition(progression, pending.id).progression);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });
  };

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const cat = getCategory(categoryId);
  const items = getItemsByCategory(categoryId);
  const isEstates = categoryId === 'estates';
  const skin = CATEGORY_SKINS[categoryId] || CATEGORY_SKINS.estates;
  const accent = isEstates ? ACCENT.estates : skin.accent;

  const ownedCount = items.filter((i) => isOwned(progression, categoryId, i.id)).length;
  const complete = ownedCount === items.length;

  const holdingsValue = useMemo(() => {
    return items.reduce((sum, item) => {
      const entry = getOwnedEntry(progression, categoryId, item.id);
      if (!entry) return sum;
      return sum + getItemGain(progression, entry, now).value;
    }, 0);
  }, [items, progression, categoryId, now]);

  const buy = (item) => {
    if (busyRef.current) return;
    const { progression: updated, error, cost } = startAcquisition(
      progression,
      categoryId,
      item.id
    );
    if (error) {
      Haptics.notificationAsync(
        error === 'already_pending'
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Error
      );
      return;
    }
    if (money < cost) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    busyRef.current = true;
    requestAnimationFrame(() => { busyRef.current = false; });
    setMoney((m) => Math.max(0, m - cost));
    onProgressionChange(updated);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <View style={ui.screen}>
      <ScreenHeader
        title={getLocalizedName(cat)}
        subtitle={
          complete
            ? t('legacy_set_complete')
            : isEstates
            ? t('legacy_property_unlocks_display')
            : skin.tagline
        }
        accent={accent}
        onBack={onBack}
        right={<CashPill money={money} />}
      />

      <StatStrip
        stats={
          isEstates
            ? [
                { label: t('owned_label'), value: `${ownedCount}/${items.length}` },
                { label: t('portfolio'), value: formatMoney(holdingsValue), color: accent },
                {
                  label: t('legacy_yield_hr'),
                  value: formatMoney(getEstateHourlyIncome(progression, now)),
                  color: '#34d399',
                },
              ]
            : [
                { label: t('owned_label'), value: `${ownedCount}/${items.length}` },
                { label: t('legacy_holdings'), value: formatMoney(holdingsValue), color: accent },
                {
                  label: t('legacy_set_bonus'),
                  value: complete ? t('legacy_set_bonus_active') : t('legacy_incomplete'),
                  color: complete ? '#34d399' : undefined,
                },
              ]
        }
      />

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        extraData={[progression, money, now]}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews
        contentContainerStyle={{ paddingBottom: 130 }}
        renderItem={({ item }) => {
          const price = getRetailPrice(categoryId, item.id);
          const entry = getOwnedEntry(progression, categoryId, item.id);
          const pending = getPendingAcquisition(progression, categoryId, item.id);
          const owned = !!entry;
          const gain = owned ? getItemGain(progression, entry, now) : null;
          const canAfford = money >= price;
          const locked = !isEstates && !hasOwnedEstate(progression);

          const buyLabel = locked
            ? t('legacy_requires_estate')
            : canAfford
            ? `${skin.acquireLabel} ${formatMoney(price)}`
            : t('insufficient_funds');

          return (
            <View
              style={[
                styles.listingCard,
                owned
                  ? { borderColor: `${accent}44` }
                  : { borderColor: skin.cardBorder, backgroundColor: skin.cardBg },
              ]}
            >
              {categoryId === 'domains' || categoryId === 'space' ? (
                owned && (
                  <View style={styles.ownedBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#000" />
                    <Text style={styles.ownedBadgeText}>{t('owned')}</Text>
                  </View>
                )
              ) : (
              <LinearGradient
                colors={skin.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.listingHero}
              >
                {owned && (
                  <View style={styles.ownedBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#000" />
                    <Text style={styles.ownedBadgeText}>{t('owned')}</Text>
                  </View>
                )}
                {/* Icon sits under the photo so the card looks designed while
                    the image decodes instead of showing a bare gradient. */}
                <Ionicons name={skin.icon} size={48} color="rgba(255,255,255,0.5)" />
                {categoryId === 'spirits' && SPIRIT_IMAGES[item.id] ? (
                  <Image
                    source={SPIRIT_IMAGES[item.id]}
                    style={styles.listingHeroImage}
                    resizeMode="cover"
                  />
                ) : categoryId === 'artifacts' && ARTIFACT_IMAGES[item.id] ? (
                  <Image
                    source={ARTIFACT_IMAGES[item.id]}
                    style={styles.listingHeroImage}
                    resizeMode="cover"
                  />
                ) : categoryId === 'timepieces' && TIMEPIECE_IMAGES[item.id] ? (
                  <Image
                    source={TIMEPIECE_IMAGES[item.id]}
                    style={styles.listingHeroImage}
                    resizeMode="cover"
                  />
                ) : categoryId === 'jewels' && JEWEL_IMAGES[item.id] ? (
                  <Image
                    source={JEWEL_IMAGES[item.id]}
                    style={styles.listingHeroImage}
                    resizeMode="cover"
                  />
                ) : categoryId === 'meteorites' && METEORITE_IMAGES[item.id] ? (
                  <Image
                    source={METEORITE_IMAGES[item.id]}
                    style={styles.listingHeroImage}
                    resizeMode="cover"
                  />
                ) : categoryId === 'books' && BOOK_IMAGES[item.id] ? (
                  <Image
                    source={BOOK_IMAGES[item.id]}
                    style={styles.listingHeroImage}
                    resizeMode="cover"
                  />
                ) : categoryId === 'estates' && ESTATE_IMAGES[item.id] ? (
                  <Image
                    source={ESTATE_IMAGES[item.id]}
                    style={styles.listingHeroImage}
                    resizeMode="cover"
                  />
                ) : null}
              </LinearGradient>
              )}

              <View style={styles.listingBody}>
                <Text style={styles.listingName}>{getLocalizedName(item)}</Text>

                <View style={styles.listingStats}>
                  <View style={styles.listingStat}>
                    <Text style={styles.listingStatLabel}>{owned ? t('legacy_value') : skin.priceLabel}</Text>
                    <Text style={styles.listingStatValue}>
                      {owned ? formatMoney(gain.value) : formatMoney(price)}
                    </Text>
                  </View>
                  <View style={styles.listingStatDivider} />
                  <View style={styles.listingStat}>
                    <Text style={styles.listingStatLabel}>{owned ? t('legacy_gain') : t('legacy_details')}</Text>
                    <Text
                      style={[
                        styles.listingStatValue,
                        owned
                          ? { color: gain.gain >= 0 ? '#34d399' : '#f87171' }
                          : { color: '#94a3b8' },
                      ]}
                    >
                      {owned ? `${gain.percent.toFixed(1)}%` : skin.meta}
                    </Text>
                  </View>
                </View>

                {owned ? (
                  <View style={styles.ownedRow}>
                    <Ionicons name="checkmark-circle" size={15} color={accent} />
                    <Text style={[styles.ownedText, { color: accent }]}>{t('legacy_in_collection')}</Text>
                  </View>
                ) : pending ? (
                  <View style={[styles.pendingBox, { backgroundColor: `${accent}10`, borderColor: `${accent}25` }]}>
                    <View style={styles.pendingRow}>
                      <Ionicons name="time-outline" size={14} color={accent} />
                      <Text style={[styles.pendingText, { color: accent }]}>
                        {t('legacy_delivery_in')}{formatWait(pending.completesAt - now)}
                      </Text>
                    </View>
                    <Pressable
                      style={[styles.skipBtn, { backgroundColor: accent }]}
                      onPress={() => rushPending(pending)}
                    >
                      <Ionicons name="play" size={12} color="#000" />
                      <Text style={styles.skipBtnText}>{t('watch_ad_skip')}</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    style={[
                      styles.listingBuyBtn,
                      { backgroundColor: `${accent}18`, borderColor: `${accent}45` },
                      (locked || !canAfford) && styles.listingBuyBtnDisabled,
                    ]}
                    disabled={locked || !canAfford}
                    onPress={() => buy(item)}
                  >
                    <Text
                      style={[
                        styles.listingBuyBtnText,
                        { color: accent },
                        (locked || !canAfford) && { color: '#475569' },
                      ]}
                    >
                      {buyLabel}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  listingCard: {
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  listingHero: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  listingHeroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  ownedBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#34d399',
  },
  ownedBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  listingBody: {
    padding: 14,
  },
  listingName: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 12,
  },
  listingStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  listingStat: {
    marginRight: 16,
  },
  listingStatLabel: {
    color: '#475569',
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listingStatValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  listingStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginRight: 16,
  },
  listingBuyBtn: {
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  listingBuyBtnDisabled: {
    opacity: 0.45,
  },
  listingBuyBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  pendingBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  pendingText: {
    fontSize: 13,
    fontWeight: '700',
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  skipBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '800',
  },
  ownedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ownedText: {
    fontSize: 12,
    fontWeight: '800',
  },
  domainHero: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  domainBrowserBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  domainUrlText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
