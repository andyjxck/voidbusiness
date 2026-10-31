import { useState, useEffect, useMemo, useRef } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import Text, { useLanguage } from '../../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../../data/hapticsProxy';
import { STOCKS, formatMoney, formatPrice, formatPercent, formatQty, getChangePercent, getHourlyIncome } from '../../data/market';
import { PriceChart } from '../../components/Charts';
import { recordInvestmentBought, recordInvestmentSold } from '../../data/stats';
import { t } from '../../data/i18n';

const SECTORS = [
  'All', 'Tech', 'Semiconductors', 'Social', 'Streaming', 'Retail',
  'Auto', 'Finance', 'Energy', 'Healthcare', 'Gaming', 'Food',
  'Aerospace', 'Defense', 'Travel', 'Telecom', 'Industrial', 'Apparel',
];

const RANGES = [
  { id: '1D', frac: 0.15 },
  { id: '1W', frac: 0.35 },
  { id: '1M', frac: 0.6 },
  { id: '1Y', frac: 0.85 },
  { id: 'ALL', frac: 1 },
];

const ACCENT = '#fbbf24';

const TICKER_COLORS = [
  '#2563eb', '#7c3aed', '#db2777', '#0891b2', '#65a30d',
  '#ea580c', '#0d9488', '#4f46e5', '#c026d3', '#0ea5e9',
];

function getTickerColor(id) {
  return TICKER_COLORS[hashString(id) % TICKER_COLORS.length];
}

function sliceHistory(history, frac) {
  if (!history || history.length < 3) return history;
  const n = Math.max(2, Math.round(history.length * frac));
  return history.slice(-n);
}

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export default function StocksMarket({ money, setMoney, marketState, holdings, setHoldings }) {
  useLanguage();
  const [sector, setSector] = useState('All');
  const [manualId, setManualId] = useState(null);
  const [range, setRange] = useState('1D');
  const [qty, setQty] = useState(1);
  const [side, setSide] = useState('buy');
  const busyRef = useRef(false);

  const watchlist = useMemo(() => {
    if (sector === 'All') return STOCKS;
    return STOCKS.filter((s) => s.sector === sector);
  }, [sector]);

  const bestId = useMemo(() => {
    let best = null;
    let bestChange = -Infinity;
    for (const s of watchlist) {
      const st = marketState[s.id];
      if (!st) continue;
      const ch = getChangePercent(st.price, st.prevPrice);
      if (ch > bestChange) {
        bestChange = ch;
        best = s.id;
      }
    }
    return best || (watchlist[0] && watchlist[0].id) || STOCKS[0].id;
  }, [watchlist, marketState]);

  // The selected stock is the active inline-expanded row; null means nothing is open
  const selectedId = manualId && watchlist.find((s) => s.id === manualId) ? manualId : null;
  const setSelectedId = setManualId;

  useEffect(() => {
    setQty(1);
    setSide('buy');
  }, [selectedId]);

  const asset = selectedId ? (STOCKS.find((s) => s.id === selectedId) || STOCKS[0]) : STOCKS[0];
  const state = marketState[asset.id];
  const holding = selectedId ? holdings.find((h) => h.assetId === asset.id) : null;

  const bestAsset = STOCKS.find((s) => s.id === bestId) || STOCKS[0];
  const bestState = marketState[bestAsset.id];
  const bestChange = bestState ? getChangePercent(bestState.price, bestState.prevPrice) : 0;
  const bestIsUp = bestChange >= 0;

  if (!state) return null;

  const change = selectedId ? getChangePercent(state.price, state.prevPrice) : 0;
  const isUp = change >= 0;
  const color = isUp ? '#34d399' : '#f87171';
  const rangeFrac = RANGES.find((r) => r.id === range).frac;
  const chartData = selectedId ? sliceHistory(state.history, rangeFrac) : [];
  const high = chartData.length ? Math.max(...chartData) : 0;
  const low = chartData.length ? Math.min(...chartData) : 0;
  const marketCap = selectedId ? state.price * (5000 + (hashString(asset.id) % 20000)) : 0;
  const cost = state.price * qty;
  const canAfford = cost <= money;
  const canSell = holding && holding.quantity >= qty;

  const handleBuy = () => {
    if (busyRef.current) return;
    if (!canAfford) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    busyRef.current = true;
    requestAnimationFrame(() => { busyRef.current = false; });
    setMoney((m) => Math.max(0, m - cost));
    recordInvestmentBought();
    const existing = holdings.find((h) => h.assetId === asset.id);
    if (existing) {
      setHoldings((hs) =>
        hs.map((h) =>
          h.assetId === asset.id
            ? { ...h, quantity: h.quantity + qty, avgCost: (h.avgCost * h.quantity + cost) / (h.quantity + qty) }
            : h
        )
      );
    } else {
      setHoldings((hs) => [...hs, { assetId: asset.id, quantity: qty, avgCost: state.price }]);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSell = () => {
    if (!canSell) return;
    const revenue = state.price * qty;
    setMoney((m) => m + revenue);
    recordInvestmentSold();
    if (holding.quantity === qty) {
      setHoldings((hs) => hs.filter((h) => h.assetId !== asset.id));
    } else {
      setHoldings((hs) => hs.map((h) => (h.assetId === asset.id ? { ...h, quantity: h.quantity - qty } : h)));
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const setMaxQty = () => {
    if (side === 'buy') {
      const maxQty = Math.floor(money / state.price);
      if (maxQty > 0) setQty(maxQty);
    } else if (holding) {
      setQty(holding.quantity);
    }
  };

  const DetailPanel = () => (
              <View style={styles.expandPanel}>
                <View style={styles.priceBlock}>
                  <Text style={styles.bigPrice}>{formatPrice(state.price)}</Text>
                  <View style={[styles.changeBadge, { backgroundColor: isUp ? '#0f5132' : '#5c1a1a' }]}>
                    <Text style={[styles.changeBadgeText, { color: isUp ? '#4ade80' : '#fca5a5' }]}>
                      {formatPercent(change)} · {range}
                    </Text>
                  </View>
                </View>

                <View style={styles.chartWrap}>
                  <PriceChart data={chartData} width={330} height={150} color={isUp ? '#34d399' : '#f87171'} />
                </View>

                <View style={styles.rangeRow}>
                  {RANGES.map((r) => {
                    const activeRange = range === r.id;
                    return (
                      <Pressable
                        key={r.id}
                        style={activeRange ? [styles.rangePill, styles.rangePillActive] : styles.rangePill}
                        onPress={() => setRange(r.id)}
                      >
                        <Text style={activeRange ? [styles.rangePillText, styles.rangePillTextActive] : styles.rangePillText}>
                          {r.id}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statCol}>
                    <Text style={styles.statLabel}>{t('high')}</Text>
                    <Text style={styles.statValue}>{formatPrice(high)}</Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={styles.statLabel}>{t('low')}</Text>
                    <Text style={styles.statValue}>{formatPrice(low)}</Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={styles.statLabel}>{t('mkt_cap')}</Text>
                    <Text style={styles.statValue}>{formatMoney(marketCap)}</Text>
                  </View>
                </View>

                {holding && (
                  <View style={styles.holdingBox}>
                    <View style={styles.holdingItem}>
                      <Text style={styles.holdingLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{t('position')}</Text>
                      <Text style={styles.holdingValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{formatQty(holding.quantity)} {t('shares')}</Text>
                    </View>
                    <View style={styles.holdingItem}>
                      <Text style={styles.holdingLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{t('avg_cost')}</Text>
                      <Text style={styles.holdingValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{formatPrice(holding.avgCost)}</Text>
                    </View>
                    <View style={styles.holdingItem}>
                      <Text style={styles.holdingLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{t('value')}</Text>
                      <Text style={styles.holdingValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{formatMoney(state.price * holding.quantity)}</Text>
                    </View>
                    <View style={styles.holdingItem}>
                      <Text style={styles.holdingLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{t('dividend_hr')}</Text>
                      <Text style={[styles.holdingValue, { color: '#4ade80' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                        {formatMoney(getHourlyIncome(asset, state) * holding.quantity)}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.orderPanel}>
                  <View style={styles.sideRow}>
                    <Pressable
                      style={[styles.sideBtn, side === 'buy' && styles.sideBtnBuyActive]}
                      onPress={() => setSide('buy')}
                    >
                      <Text style={[styles.sideBtnText, side === 'buy' && styles.sideBtnTextBuyActive]}>{t('buy')}</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.sideBtn, side === 'sell' && styles.sideBtnSellActive]}
                      onPress={() => setSide('sell')}
                    >
                      <Text style={[styles.sideBtnText, side === 'sell' && styles.sideBtnTextSellActive]}>{t('sell')}</Text>
                    </Pressable>
                  </View>

                  <View style={styles.qtyRow}>
                    <Pressable style={styles.qtyBtn} onPress={() => setQty((q) => Math.max(1, q - 1))}>
                      <Ionicons name="remove" size={16} color="#fff" />
                    </Pressable>
                    <Text style={styles.qtyValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{formatQty(qty)}</Text>
                    <Pressable style={styles.qtyBtn} onPress={() => setQty((q) => q + 1)}>
                      <Ionicons name="add" size={16} color="#fff" />
                    </Pressable>
                    <Pressable style={styles.maxBtn} onPress={setMaxQty}>
                      <Text style={styles.maxBtnText}>{t('max')}</Text>
                    </Pressable>
                  </View>

                  <Text style={styles.totalText}>{t('total')}: {formatMoney(cost)}</Text>

                  <View style={styles.actionRow}>
                    {side === 'buy' ? (
                      <Pressable style={[styles.buyBtn, !canAfford && styles.btnDisabled]} onPress={handleBuy} disabled={!canAfford}>
                        <Text style={styles.buyBtnText}>{canAfford ? t('buy') : t('not_enough')}</Text>
                      </Pressable>
                    ) : (
                      <Pressable style={[styles.sellBtn, !canSell && styles.btnDisabled]} onPress={handleSell} disabled={!canSell}>
                        <Text style={styles.sellBtnText}>{canSell ? t('sell') : t('none_to_sell')}</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      {/* Sector filter */}
      <View style={styles.sectorScroll}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sectorContent}>
          {SECTORS.map((s) => {
            const active = sector === s;
            return (
              <Pressable
                key={s}
                style={active ? [styles.sectorChip, styles.sectorChipActive] : styles.sectorChip}
                onPress={() => {
                  setSector(s);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={active ? [styles.sectorChipText, styles.sectorChipTextActive] : styles.sectorChipText}>
                  {t('sector_' + s.toLowerCase())}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {bestState && (
        <Pressable
          style={styles.bestCard}
          onPress={() => {
            setSelectedId(bestId);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <View style={styles.bestHeader}>
            <Text style={styles.bestLabel}>{t('todays_leader')}</Text>
            <View style={[styles.bestBadge, { backgroundColor: bestIsUp ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)' }]}>
              <Text style={[styles.bestBadgeText, { color: bestIsUp ? '#34d399' : '#f87171' }]}>
                {formatPercent(bestChange)}
              </Text>
            </View>
          </View>
          <View style={styles.bestBody}>
            <View style={[styles.bestAvatar, { backgroundColor: getTickerColor(bestAsset.id) }]}>
              <Text style={styles.bestAvatarText}>{bestAsset.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bestTicker}>{bestAsset.ticker}</Text>
              <Text style={styles.bestName} numberOfLines={1}>{bestAsset.name}</Text>
            </View>
            <Text style={styles.bestPrice}>{formatPrice(bestState.price)}</Text>
          </View>
          {selectedId === bestId && <DetailPanel />}
        </Pressable>
      )}

      <Text style={styles.watchlistTitle}>{t('watchlist')}</Text>
      {watchlist.map((s) => {
        const st = marketState[s.id];
        if (!st) return null;
        const ch = getChangePercent(st.price, st.prevPrice);
        const up = ch >= 0;
        const active = s.id === selectedId;
        const held = holdings.find((h) => h.assetId === s.id);
        return (
          <View key={s.id} style={styles.rowWrapper}>
            <Pressable
              style={[styles.watchRow, active && styles.watchRowActive]}
              onPress={() => {
                setSelectedId(active ? null : s.id);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <View style={styles.watchRowMain}>
                <View style={[styles.watchAvatar, { backgroundColor: getTickerColor(s.id) }]}>
                  <Text style={styles.watchAvatarText}>{s.emoji}</Text>
                </View>
                <View style={styles.watchLeft}>
                  <Text style={styles.watchTicker}>{s.ticker}</Text>
                  <Text style={styles.watchName} numberOfLines={1}>{s.name}</Text>
                  {held && <Text style={styles.watchOwned}>{formatQty(held.quantity)} {t('shares')}</Text>}
                </View>
                <View style={styles.watchRight}>
                  <Text style={styles.watchPrice}>{formatPrice(st.price)}</Text>
                  <View style={[styles.watchPill, { backgroundColor: up ? '#0f5132' : '#5c1a1a' }]}>
                    <Text style={[styles.watchPillText, { color: up ? '#4ade80' : '#fca5a5' }]}>
                      {formatPercent(ch)}
                    </Text>
                  </View>
                </View>
              </View>
            </Pressable>
            {active && s.id !== bestId && <DetailPanel />}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 140,
  },
  sectorScroll: {
    marginBottom: 14,
  },
  sectorContent: {
    paddingRight: 20,
    gap: 6,
  },
  sectorChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginRight: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sectorChipActive: {
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderColor: 'rgba(251,191,36,0.3)',
  },
  sectorChipText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  sectorChipTextActive: {
    color: ACCENT,
    fontWeight: '700',
  },
  tickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  tickerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tickerAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  tickerName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  tickerSector: {
    color: '#475569',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  priceBlock: {
    marginBottom: 12,
  },
  bigPrice: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '900',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  changeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chartWrap: {
    alignItems: 'center',
    marginBottom: 12,
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 18,
  },
  rangePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  rangePillActive: {
    backgroundColor: 'rgba(251,191,36,0.15)',
  },
  rangePillText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  rangePillTextActive: {
    color: ACCENT,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 16,
  },
  statCol: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  holdingBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
  },
  holdingItem: { flex: 1, marginRight: 6 },
  holdingLabel: {
    color: '#475569',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  holdingValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  orderPanel: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: 24,
  },
  sideRow: {
    flexDirection: 'row',
    marginBottom: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 4,
  },
  sideBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  sideBtnBuyActive: {
    backgroundColor: 'rgba(16,185,129,0.18)',
  },
  sideBtnSellActive: {
    backgroundColor: 'rgba(248,113,113,0.18)',
  },
  sideBtnText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '700',
  },
  sideBtnTextBuyActive: {
    color: '#34d399',
  },
  sideBtnTextSellActive: {
    color: '#f87171',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 12,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    minWidth: 40,
    textAlign: 'center',
  },
  maxBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.25)',
  },
  maxBtnText: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: '700',
  },
  totalText: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 14,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  buyBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.4)',
    alignItems: 'center',
  },
  buyBtnText: {
    color: '#34d399',
    fontSize: 16,
    fontWeight: '700',
  },
  sellBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
    alignItems: 'center',
  },
  sellBtnText: {
    color: '#f87171',
    fontSize: 16,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.35,
  },
  watchlistTitle: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  bestCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: 18,
  },
  bestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  bestLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  bestBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bestBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  bestBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bestAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bestAvatarText: {
    fontSize: 18,
  },
  bestTicker: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  bestName: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 1,
    fontWeight: '600',
  },
  bestPrice: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  rowWrapper: {
    marginBottom: 6,
  },
  watchRow: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  watchRowActive: {
    backgroundColor: 'rgba(251,191,36,0.08)',
    borderColor: 'rgba(251,191,36,0.25)',
  },
  watchRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandPanel: {
    padding: 14,
    paddingTop: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  watchAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  watchAvatarText: {
    fontSize: 16,
  },
  watchLeft: {
    flex: 1,
  },
  watchTicker: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  watchName: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 1,
  },
  watchOwned: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '700',
  },
  watchRight: {
    alignItems: 'flex-end',
    minWidth: 70,
    marginLeft: 8,
  },
  watchPrice: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  watchPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  watchPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
