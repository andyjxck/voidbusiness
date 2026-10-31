import { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Pressable, ScrollView } from 'react-native';
import { useContentWidth } from '../data/layout';
import Text, { useLanguage } from '../components/AppText';
import { t, tf } from '../data/i18n';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../data/hapticsProxy';
import { formatMoney } from '../data/market';
import {
  COLLECTION_CATEGORIES,
  STORAGE_AREAS,
  getItemsByCategory,
  getOwnedItemsByCategory,
  getOwnedCount,
  getTotalCollectionValue,
  getTotalInvested,
  getAppreciationPerHour,
  getEstateHourlyIncome,
  getCompletedSets,
  getSetBonusMultiplier,
  getPrestige,
  getTotalDisplayCapacity,
  getAreaCapacity,
  getAreaUsage,
  hasOwnedEstate,
  getLocalizedName,
} from '../data/progression';
import { SegmentedTabs, ACCENT, CATEGORY_ICON } from './legacy/LegacyUI';
import AuctionHouseScreen from './legacy/AuctionHouseScreen';
import PrivateDealerScreen from './legacy/PrivateDealerScreen';
import ExchangeScreen from './legacy/ExchangeScreen';
import StorageScreen from './legacy/StorageScreen';
import CollectionScreen from './legacy/CollectionScreen';
import EstatesScreen from './legacy/EstatesScreen';
import EstatePortfolioScreen from './legacy/EstatePortfolioScreen';


const PREMIUM_IDS = ['estates', 'space', 'domains'];

export default function ProgressionScreen({ money, setMoney, progression, onProgressionChange }) {
  const contentW = useContentWidth();
  const tileW = (contentW - 32 - 18) / 3;
  useLanguage();

  const CHANNELS = [
    {
      id: 'auction',
      name: t('legacy_auction_house'),
      icon: 'hammer',
      blurb: t('legacy_bid_against_rivals'),
    },
    {
      id: 'dealer',
      name: t('legacy_private_dealer'),
      icon: 'briefcase',
      blurb: t('legacy_negotiate_price'),
    },
    {
      id: 'exchange',
      name: t('legacy_the_exchange'),
      icon: 'swap-horizontal',
      blurb: t('legacy_sell_live_quotes'),
    },
  ];
  const [tab, setTab] = useState('estate');
  const [route, setRoute] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  const estateOwned = hasOwnedEstate(progression);
  const totalValue = getTotalCollectionValue(progression, now);
  const invested = getTotalInvested(progression);
  const unrealised = totalValue - invested;
  const prestige = getPrestige(progression, now);
  const completedSets = getCompletedSets(progression);
  const capacity = getTotalDisplayCapacity(progression);

  // ─── Sub-screen routing, matching how BusinessScreen swaps in details ───

  if (route) {
    const shared = {
      money,
      setMoney,
      progression,
      onProgressionChange,
      onBack: () => setRoute(null),
    };
    if (route.kind === 'auction') return <AuctionHouseScreen {...shared} />;
    if (route.kind === 'dealer') return <PrivateDealerScreen {...shared} />;
    if (route.kind === 'exchange') return <ExchangeScreen {...shared} />;
    if (route.kind === 'storage') return <StorageScreen areaId={route.id} {...shared} />;
    if (route.kind === 'portfolio') return <EstatePortfolioScreen {...shared} />;
    // Estates get a bespoke brochure-style showroom rather than the
    // generic catalogue used by the other categories.
    if (route.kind === 'collection' && route.id === 'estates') return <EstatesScreen {...shared} />;
    if (route.kind === 'collection') return <CollectionScreen categoryId={route.id} {...shared} />;
  }

  const go = (kind, id) => {
    if (!estateOwned && kind !== 'collection') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setRoute({ kind: 'collection', id: 'estates' });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRoute({ kind, id });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('legacy')}</Text>

        {/* Collection card, styled as a sibling of the Business balance card */}
        <View style={styles.cardContainer}>
          <LinearGradient
            colors={['#3b2f0b', '#4a3410', '#2a1f3d', '#1e1b4b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.08)', 'transparent', 'rgba(255,255,255,0.04)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardShine}
            />
            <View style={styles.cardTop}>
              <View style={styles.cardChipRow}>
                <View style={styles.cardChip} />
                <Ionicons name="diamond" size={15} color="rgba(255,255,255,0.3)" />
              </View>
              <View style={styles.prestigePill}>
                <Ionicons name="star" size={11} color="#fbbf24" />
                <Text style={styles.prestigeText}>{prestige.toLocaleString()} {t('legacy_prestige')}</Text>
              </View>
            </View>

            <Text style={styles.cardLabel}>{t('legacy_collection_value')}</Text>
            <Text style={styles.cardBalance}>{formatMoney(totalValue)}</Text>

            <View style={styles.cardBottom}>
              <View>
                <Text style={styles.cardLabel}>{t('legacy_unrealised')}</Text>
                <Text
                  style={[
                    styles.cardValue,
                    { color: unrealised >= 0 ? '#4ade80' : '#f87171' },
                  ]}
                >
                  {unrealised >= 0 ? '+' : '-'}
                  {formatMoney(Math.abs(unrealised))}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.cardLabel}>{t('legacy_estate_yield_hr')}</Text>
                <Text style={styles.cardValue}>
                  {formatMoney(getEstateHourlyIncome(progression, now))}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Gate notice */}
        {!estateOwned ? (
          <Pressable
            style={styles.gateBanner}
            onPress={() => setRoute({ kind: 'collection', id: 'estates' })}
          >
            <Ionicons name="lock-closed" size={16} color="#fbbf24" />
            <View style={{ flex: 1 }}>
              <Text style={styles.gateTitle}>{t('legacy_acquire_estate_begin')}</Text>
              <Text style={styles.gateText}>
                {t('legacy_estate_unlock_msg')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#64748b" />
          </Pressable>
        ) : null}

        <SegmentedTabs
          tabs={[
            { id: 'estate', label: t('legacy_tab_estate'), icon: 'business' },
            { id: 'collections', label: t('legacy_tab_collections'), icon: 'diamond' },
            { id: 'market', label: t('legacy_tab_market'), icon: 'trending-up' },
          ]}
          active={tab}
          onChange={setTab}
          accent="#fbbf24"
        />

        {/* ─── Estate tab: the three display rooms ─── */}
        {tab === 'estate' ? (
          <>
            <Text style={styles.sectionTitle}>{t('legacy_display_rooms')}</Text>
            {STORAGE_AREAS.map((area) => {
              const used = getAreaUsage(progression, area.id);
              const areaCap = getAreaCapacity(progression, area.id);
              const accent = ACCENT[area.id];
              return (
                <Pressable
                  key={area.id}
                  style={[styles.roomCard, { borderColor: `${accent}33` }]}
                  onPress={() => go('storage', area.id)}
                >
                  <View style={[styles.roomIcon, { backgroundColor: `${accent}1f` }]}>
                    <Ionicons name={area.icon} size={22} color={accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.roomName}>{getLocalizedName(area)}</Text>
                    <Text style={styles.roomBlurb}>{area.blurb}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.roomCount, { color: accent }]}>
                      {used}/{areaCap}
                    </Text>
                    <Text style={styles.roomCountLabel}>{t('legacy_slots')}</Text>
                  </View>
                </Pressable>
              );
            })}

            <Text style={styles.sectionTitle}>{t('legacy_property')}</Text>
            <Pressable
              style={[styles.roomCard, { borderColor: 'rgba(251,191,36,0.33)' }]}
              onPress={() => go('portfolio')}
            >
              <View style={[styles.roomIcon, { backgroundColor: 'rgba(251,191,36,0.12)' }]}>
                <Ionicons name="construct" size={22} color="#fbbf24" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.roomName}>{t('legacy_my_estates')}</Text>
                <Text style={styles.roomBlurb}>{t('legacy_improve_properties')}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.roomCount, { color: '#fbbf24' }]}>
                  {getOwnedItemsByCategory(progression, 'estates').length}
                </Text>
                <Text style={styles.roomCountLabel}>{t('legacy_owned_lowercase')}</Text>
              </View>
            </Pressable>
            {renderCategoryRow('estates')}
          </>
        ) : null}

        {/* ─── Collections tab ─── */}
        {tab === 'collections' ? (
          <>
            <View style={styles.bonusStrip}>
              <Ionicons name="ribbon" size={15} color="#34d399" />
              <Text style={styles.bonusText}>
                {completedSets.length}{t('legacy_of')}{COLLECTION_CATEGORIES.length} sets complete ·{' '}
                <Text style={{ color: '#34d399' }}>
                  +{Math.round((getSetBonusMultiplier(progression) - 1) * 100)}{t('legacy_business_income_pct')}
                </Text>
              </Text>
            </View>

            <Text style={styles.sectionTitle}>{t('legacy_collections')}</Text>
            <View style={styles.grid}>
              {COLLECTION_CATEGORIES.filter((c) => !PREMIUM_IDS.includes(c.id)).map((cat) =>
                renderCategoryTile(cat)
              )}
            </View>

            <Text style={styles.sectionTitle}>{t('legacy_premium_assets')}</Text>
            {PREMIUM_IDS.map((id) => renderCategoryRow(id))}
          </>
        ) : null}

        {/* ─── Market tab: the three channels ─── */}
        {tab === 'market' ? (
          <>
            <Text style={styles.sectionTitle}>{t('legacy_acquisition_channels')}</Text>
            {CHANNELS.map((ch) => {
              const accent = ACCENT[ch.id];
              return (
                <Pressable
                  key={ch.id}
                  style={[styles.roomCard, { borderColor: `${accent}33` }]}
                  onPress={() => go(ch.id)}
                >
                  <View style={[styles.roomIcon, { backgroundColor: `${accent}1f` }]}>
                    <Ionicons name={ch.icon} size={22} color={accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.roomName}>{getLocalizedName(ch)}</Text>
                    <Text style={styles.roomBlurb}>{ch.blurb}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#475569" />
                </Pressable>
              );
            })}

            <View style={styles.tipCard}>
              <Ionicons name="bulb" size={15} color="#fbbf24" />
              <Text style={styles.tipText}>
                {t('legacy_appreciate_msg')}
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );

  function renderCategoryTile(cat) {
    const total = getItemsByCategory(cat.id).length;
    const owned = getOwnedItemsByCategory(progression, cat.id).length;
    const complete = owned === total;
    return (
      <Pressable
        key={cat.id}
        style={[styles.tile, { width: tileW, borderColor: complete ? `${cat.color}66` : 'rgba(255,255,255,0.07)' }]}
        onPress={() => go('collection', cat.id)}
      >
        <View style={[styles.tileIcon, { backgroundColor: `${cat.color}1f` }]}>
          <Ionicons name={CATEGORY_ICON[cat.id] || 'diamond'} size={20} color={cat.color} />
        </View>
        <Text style={styles.tileName} numberOfLines={1}>
          {getLocalizedName(cat)}
        </Text>
        <Text style={[styles.tileCount, complete && { color: cat.color }]}>
          {owned}/{total}
        </Text>
        {complete ? (
          <View style={[styles.tileBadge, { backgroundColor: cat.color }]}>
            <Ionicons name="checkmark" size={10} color="#000" />
          </View>
        ) : null}
      </Pressable>
    );
  }

  function renderCategoryRow(catId) {
    const cat = COLLECTION_CATEGORIES.find((c) => c.id === catId);
    if (!cat) return null;
    const total = getItemsByCategory(cat.id).length;
    const owned = getOwnedItemsByCategory(progression, cat.id).length;
    const complete = owned === total;
    return (
      <Pressable
        key={cat.id}
        style={[styles.roomCard, { borderColor: complete ? `${cat.color}55` : `${cat.color}22` }]}
        onPress={() => go('collection', cat.id)}
      >
        <View style={[styles.roomIcon, { backgroundColor: `${cat.color}1f` }]}>
          <Ionicons name={CATEGORY_ICON[cat.id] || 'diamond'} size={22} color={cat.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.roomName}>{getLocalizedName(cat)}</Text>
          <Text style={styles.roomBlurb}>
            {cat.id === 'estates'
              ? t('legacy_browse_property')
              : tf('legacy_pieces_to_collect', { x: total })}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.roomCount, complete && { color: cat.color }]}>
            {owned}/{total}
          </Text>
          <Text style={styles.roomCountLabel}>{t('legacy_owned_lowercase')}</Text>
        </View>
      </Pressable>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 130,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  // Card
  cardContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  balanceCard: {
    borderRadius: 22,
    padding: 20,
    overflow: 'hidden',
  },
  cardShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  cardChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardChip: {
    width: 30,
    height: 22,
    borderRadius: 5,
    backgroundColor: 'rgba(251,191,36,0.35)',
  },
  prestigePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  prestigeText: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  cardBalance: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 3,
    letterSpacing: -0.5,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cardValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  // Gate
  gateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(251,191,36,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.22)',
  },
  gateTitle: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '800',
  },
  gateText: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 8,
  },
  // Rows
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 9,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1.5,
  },
  roomIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomName: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '800',
  },
  roomBlurb: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 15,
  },
  roomCount: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '900',
  },
  roomCountLabel: {
    color: '#475569',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  // Tiles
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tile: {
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
    position: 'relative',
  },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileName: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 6,
  },
  tileCount: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
  },
  tileBadge: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bonusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(52,211,153,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.18)',
  },
  bonusText: {
    flex: 1,
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginHorizontal: 16,
    marginTop: 6,
    padding: 13,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  tipText: {
    flex: 1,
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
});
