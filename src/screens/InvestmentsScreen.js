import { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Pressable, FlatList, RefreshControl, Image } from 'react-native';
import Text, { useLanguage } from '../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../data/hapticsProxy';
import { showRewardedAd } from '../data/ads';
import { t, tf, tRealEstate } from '../data/i18n';
import {
  REAL_ESTATE,
  formatMoney,
  getHourlyIncome,
} from '../data/market';
import StocksMarket from './investments/StocksMarket';
import CryptoExchange from './investments/CryptoExchange';

const CATEGORIES = [
  { id: 'stocks', labelKey: 'stocks', icon: 'bar-chart' },
  { id: 'crypto', labelKey: 'crypto', icon: 'logo-bitcoin' },
  { id: 'realestate', labelKey: 'real_estate', icon: 'home' },
];

// Category theming - each market feels distinct
const THEME = {
  stocks: { accent: '#fbbf24', accentBg: 'rgba(251,191,36,0.12)', accentBorder: 'rgba(251,191,36,0.3)' },
  crypto: { accent: '#a78bfa', accentBg: 'rgba(167,139,250,0.12)', accentBorder: 'rgba(167,139,250,0.3)' },
  realestate: { accent: '#38bdf8', accentBg: 'rgba(56,189,248,0.12)', accentBorder: 'rgba(56,189,248,0.3)' },
};

function formatDuration(ms) {
  if (ms <= 0) return '0s';
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function InvestmentsScreen({
  money,
  setMoney,
  marketState,
  holdings,
  setHoldings,
  pendingPurchases,
  onStartEstatePurchase,
  onRushEstatePurchase,
}) {
  useLanguage();
  const [category, setCategory] = useState('stocks');
  const [refreshing, setRefreshing] = useState(false);
  const busyRef = useRef(false);

  // Live tick for countdown text display
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleBuyEstate = (asset) => {
    if (busyRef.current) return;
    const state = marketState[asset.id];
    if (!state) return;
    const price = state.price;
    if (price > money || pendingPurchases.some((p) => p.assetId === asset.id)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    busyRef.current = true;
    requestAnimationFrame(() => { busyRef.current = false; });
    const ok = onStartEstatePurchase(asset, price);
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const startWatchAdToSkip = (pendingId) => {
    showRewardedAd(() => onRushEstatePurchase(pendingId));
  };

  const filteredAssets = REAL_ESTATE;

  const getHolding = (assetId) => holdings.find((h) => h.assetId === assetId);

  const getPortfolioValue = () => {
    let total = 0;
    for (const h of holdings) {
      const state = marketState[h.assetId];
      if (state) total += state.price * h.quantity;
    }
    return total;
  };

  const onRefresh = () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <View style={styles.container}>
      {/* Portfolio header */}
      <View style={styles.portfolioHeader}>
        <Text style={styles.portfolioLabel}>{t('portfolio')}</Text>
        <Text style={styles.portfolioValue}>{formatMoney(getPortfolioValue())}</Text>
        <View style={styles.cashRow}>
          <View style={styles.cashPill}>
            <Ionicons name="wallet-outline" size={12} color="#94a3b8" />
            <Text style={styles.cashText}>{t('cash')} {formatMoney(money)}</Text>
          </View>
          {holdings.length > 0 && (
            <View style={styles.holdingsPill}>
              <Text style={styles.holdingsText}>{holdings.length} {t('positions')}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Main category tabs - segmented control */}
      <View style={styles.tabBar}>
        {CATEGORIES.map((cat) => {
          const active = category === cat.id;
          const theme = THEME[cat.id];
          return (
            <Pressable
              key={cat.id}
              style={active ? [styles.tab, { backgroundColor: theme.accent }] : styles.tab}
              onPress={() => {
                setCategory(cat.id);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Ionicons name={cat.icon} size={13} color={active ? '#000' : '#64748b'} />
              <Text style={active ? [styles.tabText, styles.tabTextActive] : styles.tabText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {t(cat.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Stocks - Robinhood-style master/detail market */}
      {category === 'stocks' && (
        <StocksMarket money={money} setMoney={setMoney} marketState={marketState} holdings={holdings} setHoldings={setHoldings} />
      )}

      {/* Crypto - exchange-style ticker tape + order book */}
      {category === 'crypto' && (
        <CryptoExchange money={money} setMoney={setMoney} marketState={marketState} holdings={holdings} setHoldings={setHoldings} />
      )}

      {/* Real estate - listing cards with purchase timers */}
      {category === 'realestate' && (
        <FlatList
          data={filteredAssets}
          renderItem={({ item: asset }) => renderEstateCard(asset)}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.realestate.accent} />}
        />
      )}
    </View>
  );

  function renderEstateCard(asset) {
    const state = marketState[asset.id];
    if (!state) return null;
    const holding = getHolding(asset.id);
    const pending = pendingPurchases.find((p) => p.assetId === asset.id);
    const hourly = getHourlyIncome(asset, state);
    const theme = THEME.realestate;
    const canAfford = state.price <= money;
    const imgShiftIds = ['re_apt', 're_house', 're_mall'];

    return (
      <View style={styles.estateCard}>
        <View style={styles.estateImage}>
          {asset.image && (
            <Image
              source={asset.image}
              style={imgShiftIds.includes(asset.id) ? styles.estateImageImgShifted : styles.estateImageImg}
              resizeMode="cover"
            />
          )}
          {holding && (
            <View style={styles.estateOwnedBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#000" />
              <Text style={styles.estateOwnedBadgeText}>{t('owned')}</Text>
            </View>
          )}
        </View>

        <View style={styles.estateBody}>
          <Text style={styles.estateName}>{tRealEstate(asset.id)}</Text>

          <View style={styles.estateStatsRow}>
            <View style={styles.estateStat}>
              <Text style={styles.estateStatLabel}>{t('price')}</Text>
              <Text style={styles.estateStatValue}>{formatMoney(state.price)}</Text>
            </View>
            <View style={styles.estateStatDivider} />
            <View style={styles.estateStat}>
              <Text style={styles.estateStatLabel}>{t('est_income')}</Text>
              <Text style={[styles.estateStatValue, { color: '#34d399' }]}>{formatMoney(hourly)}/hr</Text>
            </View>
            {holding && (
              <>
                <View style={styles.estateStatDivider} />
                <View style={styles.estateStat}>
                  <Text style={styles.estateStatLabel}>{t('owned_label')}</Text>
                  <Text style={styles.estateStatValue}>{holding.quantity}</Text>
                </View>
              </>
            )}
          </View>

          {/* Pending purchase - closing timer */}
          {pending ? (
            <View style={styles.estateClosingBox}>
              <View style={styles.estateClosingRow}>
                <Ionicons name="time-outline" size={14} color={theme.accent} />
                <Text style={styles.estateClosingText}>
                  {tf('closing_in', { duration: formatDuration(pending.completesAt - nowTick) })}
                </Text>
              </View>
              <Pressable
                style={styles.estateSkipBtn}
                onPress={() => startWatchAdToSkip(pending.id)}
              >
                <Ionicons name="play" size={12} color="#000" />
                <Text style={styles.estateSkipBtnText}>{t('watch_ad_skip')}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[styles.estateBuyBtn, !canAfford && styles.btnDisabled]}
              onPress={() => handleBuyEstate(asset)}
              disabled={!canAfford}
            >
              <Text style={styles.estateBuyBtnText}>
                {canAfford ? tf('make_offer', { price: formatMoney(state.price) }) : t('insufficient_funds')}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 70,
    paddingHorizontal: 20,
  },
  // Portfolio header
  portfolioHeader: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 16,
  },
  portfolioLabel: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  portfolioValue: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '900',
    marginTop: 4,
  },
  cashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  cashPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cashText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  holdingsPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.2)',
  },
  holdingsText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '600',
  },
  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  tabTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  // List
  list: {
    paddingBottom: 120,
  },
  btnDisabled: {
    opacity: 0.35,
  },
  // Real estate listing cards
  estateCard: {
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: 16,
    overflow: 'hidden',
  },
  estateImage: {
    height: 140,
    backgroundColor: '#2a2f38',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    overflow: 'hidden',
  },
  estateImageImg: {
    width: '100%',
    height: '100%',
  },
  estateImageImgShifted: {
    width: '100%',
    height: 180,
    marginTop: -40,
  },
  estateOwnedBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#38bdf8',
  },
  estateOwnedBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  estateBody: {
    padding: 14,
  },
  estateName: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 2,
    marginBottom: 12,
  },
  estateStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  estateStat: {
    marginRight: 16,
  },
  estateStatLabel: {
    color: '#475569',
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  estateStatValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  estateStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginRight: 16,
  },
  estateBuyBtn: {
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: 'rgba(56,189,248,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.35)',
    alignItems: 'center',
  },
  estateBuyBtnText: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '700',
  },
  estateClosingBox: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(56,189,248,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.15)',
  },
  estateClosingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  estateClosingText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
  },
  estateSkipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#38bdf8',
  },
  estateSkipBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '700',
  },
});
