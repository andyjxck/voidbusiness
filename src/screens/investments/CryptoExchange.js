import { useState, useEffect, useRef, useMemo } from 'react';
import { View, ScrollView, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import Text, { useLanguage } from '../../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../../data/hapticsProxy';
import { CRYPTO, formatMoney, formatPrice, formatPercent, formatQty, getChangePercent, getHourlyIncome } from '../../data/market';
import { PriceChart } from '../../components/Charts';
import { isReducedMotion } from '../../data/settings';
import { recordInvestmentBought, recordInvestmentSold } from '../../data/stats';
import { t, tf } from '../../data/i18n';

const RANGES = [
  { id: '1D', frac: 0.15 },
  { id: '1W', frac: 0.35 },
  { id: '1M', frac: 0.6 },
  { id: '1Y', frac: 0.85 },
  { id: 'ALL', frac: 1 },
];

const ACCENT = '#a78bfa';

const COIN_COLORS = [
  '#f7931a', '#627eea', '#00ffbd', '#f3ba2f', '#8247e5',
  '#2775ca', '#e6007a', '#0033ad', '#ff007a', '#00d4ff',
];

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function getCoinColor(id) {
  return COIN_COLORS[hashString(id) % COIN_COLORS.length];
}

function sliceHistory(history, frac) {
  if (!history || history.length < 3) return history;
  const n = Math.max(2, Math.round(history.length * frac));
  return history.slice(-n);
}

function MarqueeTape({ marketState }) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const [setWidth, setSetWidth] = useState(0);
  const animRef = useRef(null);

  useEffect(() => {
    if (setWidth === 0) return;
    scrollX.setValue(0);
    if (isReducedMotion()) {
      // Static tape; no looping scroll.
      animRef.current = null;
      return () => {};
    }
    animRef.current = Animated.loop(
      Animated.timing(scrollX, {
        toValue: -setWidth,
        duration: setWidth * 25,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animRef.current.start();
    return () => animRef.current && animRef.current.stop();
  }, [setWidth]);

  const items = [...CRYPTO, ...CRYPTO];

  return (
    <View style={styles.marqueeWrap}>
      <Animated.View
        style={[styles.marqueeRow, { transform: [{ translateX: scrollX }] }]}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (setWidth === 0 && w > 0) setSetWidth(w / 2);
        }}
      >
        {items.map((c, i) => {
          const st = marketState[c.id];
          if (!st) return null;
          const ch = getChangePercent(st.price, st.prevPrice);
          const up = ch >= 0;
          return (
            <View key={`${c.id}_${i}`} style={styles.marqueeItem}>
              <Text style={styles.marqueeTicker}>{c.emoji} {c.ticker}</Text>
              <Text style={styles.marqueePrice}>{formatPrice(st.price)}</Text>
              <Text style={[styles.marqueeChange, { color: up ? '#34d399' : '#f87171' }]}>
                {formatPercent(ch)}
              </Text>
            </View>
          );
        })}
      </Animated.View>
    </View>
  );
}

export default function CryptoExchange({ money, setMoney, marketState, holdings, setHoldings }) {
  useLanguage();
  const [manualId, setManualId] = useState(null);
  const [range, setRange] = useState('1D');
  const [side, setSide] = useState('buy');
  const [qty, setQty] = useState(1);
  const busyRef = useRef(false);

  const bestId = useMemo(() => {
    let best = null;
    let bestChange = -Infinity;
    for (const c of CRYPTO) {
      const st = marketState[c.id];
      if (!st) continue;
      const ch = getChangePercent(st.price, st.prevPrice);
      if (ch > bestChange) {
        bestChange = ch;
        best = c.id;
      }
    }
    return best || CRYPTO[0].id;
  }, [marketState]);

  // The selected coin is the active inline-expanded row; null means nothing is open
  const selectedId = manualId && CRYPTO.find((c) => c.id === manualId) ? manualId : null;
  const setSelectedId = setManualId;

  useEffect(() => {
    setQty(1);
  }, [selectedId]);

  const asset = selectedId ? (CRYPTO.find((c) => c.id === selectedId) || CRYPTO[0]) : CRYPTO[0];
  const state = marketState[asset.id];
  const holding = selectedId ? holdings.find((h) => h.assetId === asset.id) : null;

  const bestAsset = CRYPTO.find((c) => c.id === bestId) || CRYPTO[0];
  const bestState = marketState[bestAsset.id];
  const bestChange = bestState ? getChangePercent(bestState.price, bestState.prevPrice) : 0;
  const bestIsUp = bestChange >= 0;

  if (!state) return null;

  const change = selectedId ? getChangePercent(state.price, state.prevPrice) : 0;
  const isUp = change >= 0;
  const color = isUp ? '#34d399' : '#f87171';
  const coinColor = getCoinColor(asset.id);
  const rangeFrac = RANGES.find((r) => r.id === range).frac;
  const chartData = selectedId ? sliceHistory(state.history, rangeFrac) : [];
  const volume = selectedId ? state.price * (8000 + (hashString(asset.id) % 50000)) : 0;

  const cost = state.price * qty;
  const canAfford = cost <= money;
  const canSell = holding && holding.quantity >= qty;
  const isBuySide = side === 'buy';

  const handleSubmit = () => {
    if (busyRef.current) return;
    busyRef.current = true;
    requestAnimationFrame(() => { busyRef.current = false; });
    if (isBuySide) {
      if (!canAfford) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
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
    } else {
      if (!canSell) return;
      setMoney((m) => m + cost);
      recordInvestmentSold();
      if (holding.quantity === qty) {
        setHoldings((hs) => hs.filter((h) => h.assetId !== asset.id));
      } else {
        setHoldings((hs) => hs.map((h) => (h.assetId === asset.id ? { ...h, quantity: h.quantity - qty } : h)));
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const setMaxQty = () => {
    if (isBuySide) {
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
                  <PriceChart data={chartData} width={330} height={140} color={isUp ? '#34d399' : '#f87171'} />
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

                <Text style={styles.volText}>{tf('volume_24h', { volume: formatMoney(volume) })}</Text>

                {holding && (
                  <View style={styles.holdingBox}>
                    <View style={styles.holdingItem}>
                      <Text style={styles.holdingLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{t('position')}</Text>
                      <Text style={styles.holdingValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{formatQty(holding.quantity)} {asset.ticker}</Text>
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
                      <Text style={styles.holdingLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{t('staking_hr')}</Text>
                      <Text style={[styles.holdingValue, { color: '#4ade80' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                        {formatMoney(getHourlyIncome(asset, state) * holding.quantity)}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.tradePanel}>
                  <View style={styles.sideRow}>
                    <Pressable
                      style={isBuySide ? [styles.sideBtn, styles.sideBtnBuyActive] : styles.sideBtn}
                      onPress={() => setSide('buy')}
                    >
                      <Text style={isBuySide ? [styles.sideBtnText, styles.sideBtnTextBuyActive] : styles.sideBtnText}>{t('buy')}</Text>
                    </Pressable>
                    <Pressable
                      style={!isBuySide ? [styles.sideBtn, styles.sideBtnSellActive] : styles.sideBtn}
                      onPress={() => setSide('sell')}
                    >
                      <Text style={!isBuySide ? [styles.sideBtnText, styles.sideBtnTextSellActive] : styles.sideBtnText}>{t('sell')}</Text>
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

                  <Pressable
                    style={[
                      styles.submitBtn,
                      isBuySide ? styles.submitBtnBuy : styles.submitBtnSell,
                      ((isBuySide && !canAfford) || (!isBuySide && !canSell)) && styles.btnDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={(isBuySide && !canAfford) || (!isBuySide && !canSell)}
                  >
                    <Text style={[styles.submitBtnText, { color: isBuySide ? '#34d399' : '#f87171' }]}>
                      {isBuySide ? (canAfford ? `${t('buy')} ${asset.ticker}` : t('not_enough')) : (canSell ? `${t('sell')} ${asset.ticker}` : t('no_position'))}
                    </Text>
                  </Pressable>
                </View>
              </View>
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      <MarqueeTape marketState={marketState} />

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
            <View style={[styles.bestAvatar, { backgroundColor: getCoinColor(bestAsset.id) }]}>
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

      <Text style={styles.marketsTitle}>{t('markets')}</Text>
      {CRYPTO.map((c) => {
        const st = marketState[c.id];
        if (!st) return null;
        const ch = getChangePercent(st.price, st.prevPrice);
        const up = ch >= 0;
        const active = c.id === selectedId;
        const cColor = getCoinColor(c.id);
        return (
          <View key={c.id} style={styles.rowWrapper}>
            <Pressable
              style={[styles.marketRow, active && styles.marketRowActive]}
              onPress={() => {
                setSelectedId(active ? null : c.id);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <View style={styles.marketRowMain}>
                <View style={[styles.marketAvatar, { backgroundColor: cColor }]}>
                  <Text style={styles.marketAvatarText}>{c.emoji}</Text>
                </View>
                <View style={styles.marketLeft}>
                  <Text style={styles.marketTicker}>{c.ticker}</Text>
                  <Text style={styles.marketName} numberOfLines={1}>{c.name}</Text>
                </View>
                <View style={styles.marketRight}>
                  <Text style={styles.marketPrice}>{formatPrice(st.price)}</Text>
                  <View style={[styles.marketPill, { backgroundColor: up ? '#0f5132' : '#5c1a1a' }]}>
                    <Text style={[styles.marketPillText, { color: up ? '#4ade80' : '#fca5a5' }]}>
                      {formatPercent(ch)}
                    </Text>
                  </View>
                </View>
              </View>
            </Pressable>
            {active && c.id !== bestId && <DetailPanel />}
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
  // Marquee
  marqueeWrap: {
    height: 30,
    overflow: 'hidden',
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(167,139,250,0.06)',
  },
  marqueeRow: {
    flexDirection: 'row',
    position: 'absolute',
  },
  marqueeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
  },
  marqueeTicker: {
    color: '#a78bfa',
    fontSize: 11,
    fontWeight: '800',
  },
  marqueePrice: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '600',
  },
  marqueeChange: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Coin header
  coinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  coinAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  coinAvatarText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  coinName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  coinPair: {
    color: '#475569',
    fontSize: 12,
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
    marginBottom: 10,
  },
  rangePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  rangePillActive: {
    backgroundColor: 'rgba(167,139,250,0.15)',
  },
  rangePillText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  rangePillTextActive: {
    color: ACCENT,
  },
  volText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  // Holding
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
  // Trade panel
  tradePanel: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: 24,
  },
  sideRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  sideBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
  },
  sideBtnBuyActive: {
    backgroundColor: 'rgba(52,211,153,0.18)',
  },
  sideBtnSellActive: {
    backgroundColor: 'rgba(248,113,113,0.18)',
  },
  sideBtnText: {
    color: '#64748b',
    fontSize: 13,
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
    backgroundColor: 'rgba(167,139,250,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.25)',
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
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  submitBtnBuy: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderColor: 'rgba(16,185,129,0.4)',
  },
  submitBtnSell: {
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderColor: 'rgba(248,113,113,0.3)',
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.35,
  },
  // Markets list
  marketsTitle: {
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
  marketRow: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  marketRowActive: {
    backgroundColor: 'rgba(167,139,250,0.08)',
    borderColor: 'rgba(167,139,250,0.25)',
  },
  marketRowMain: {
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
  marketAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  marketAvatarText: {
    fontSize: 15,
  },
  marketLeft: {
    flex: 1,
  },
  marketTicker: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  marketName: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 1,
  },
  marketRight: {
    alignItems: 'flex-end',
    minWidth: 70,
  },
  marketPrice: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  marketPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  marketPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
