import { useState, useEffect, useMemo } from 'react';
import { View, Pressable, ScrollView, StyleSheet } from 'react-native';
import Text from '../../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../../data/hapticsProxy';
import { formatMoney } from '../../data/market';
import {
  getStorableItems,
  getItem,
  getCategory,
  getItemGain,
  getExchangeQuote,
  getExchangeMultiplier,
  getExchangeNextTickAt,
  getItemArea,
  sellItem,
  EXCHANGE_COMMISSION,
  getLocalizedName,
} from '../../data/progression';
import {
  ScreenHeader,
  CashPill,
  Countdown,
  EmptyState,
  PrimaryButton,
  GhostButton,
  GainText,
  ACCENT,
  ItemIcon,
  styles as ui,
} from './LegacyUI';
import { t, tf } from '../../data/i18n';

const SPARK_POINTS = 16;

// A trading desk rather than a shop: quotes reprice every minute, each
// piece carries a live spread against its appreciated value, and selling
// costs commission. Holding longer is usually better, but a good tick can
// beat waiting.
export default function ExchangeScreen({ money, setMoney, progression, onProgressionChange, onBack }) {
  const [now, setNow] = useState(Date.now());
  const [confirmKey, setConfirmKey] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Property is deliberately excluded - estates back your display capacity
  // and are handled from the portfolio, not liquidated here.
  const owned = getStorableItems(progression);
  const nextTick = getExchangeNextTickAt(now);

  const rows = useMemo(() => {
    return owned
      .map((entry) => {
        const def = getItem(entry.categoryId, entry.itemId);
        if (!def) return null;
        const quote = getExchangeQuote(progression, entry, now);
        const gain = getItemGain(progression, entry, now);
        // Build a short history from the previous minute windows so the
        // sparkline reflects the same deterministic price curve.
        const spark = [];
        for (let i = SPARK_POINTS - 1; i >= 0; i--) {
          spark.push(
            getExchangeMultiplier(entry.categoryId, entry.itemId, now - i * 60 * 1000)
          );
        }
        return { entry, def, quote, gain, spark };
      })
      .filter(Boolean)
      .sort((a, b) => b.quote.gross - a.quote.gross);
  }, [owned, progression, now]);

  const totalQuote = rows.reduce((s, r) => s + r.quote.proceeds, 0);
  const accent = ACCENT.exchange;

  const doSell = (row) => {
    const { entry } = row;
    const result = sellItem(progression, entry.categoryId, entry.itemId, Date.now());
    if (result.error) return;
    setMoney(money + result.proceeds);
    onProgressionChange(result.progression);
    setConfirmKey(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={ui.screen}>
      <ScreenHeader
        title={t('legacy_the_exchange_title')}
        subtitle={tf('legacy_quotes_reprice', { x: Math.round(EXCHANGE_COMMISSION * 100) })}
        accent={accent}
        onBack={onBack}
        right={<CashPill money={money} />}
      />

      <View style={styles.deskBar}>
        <Countdown label={t('legacy_reprice_in')} ms={nextTick - now} accent={accent} />
        <Text style={styles.deskMeta}>{t('legacy_liquidation_value')}{formatMoney(totalQuote)}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
        {rows.length === 0 ? (
          <EmptyState
            icon="swap-horizontal"
            title={t('legacy_nothing_to_trade')}
            message={t('legacy_acquire_to_liquidate')}
          />
        ) : null}

        {rows.map((row) => {
          const { entry, def, quote, gain, spark } = row;
          const cat = getCategory(entry.categoryId);
          const key = `${entry.categoryId}:${entry.itemId}`;
          const spreadPct = (quote.multiplier * 100 - 100).toFixed(1);
          const hot = quote.multiplier >= 1.0;
          const area = getItemArea(progression, entry.categoryId, entry.itemId);
          const confirming = confirmKey === key;

          return (
            <View key={key} style={[ui.card, confirming && { borderColor: `${accent}66` }]}>
              <View style={ui.rowBetween}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <ItemIcon
                    categoryId={entry.categoryId}
                    itemId={entry.itemId}
                    color={cat.color}
                    style={[styles.itemIcon, { backgroundColor: `${cat.color}1f` }]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={ui.cardTitle}>{getLocalizedName(def)}</Text>
                    <Text style={ui.cardMeta}>
                      {getLocalizedName(cat)} · {area === 'vault' ? t('legacy_vault') : area === 'gallery' ? t('legacy_gallery') : t('legacy_showroom')}
                    </Text>
                  </View>
                </View>
                <Sparkline data={spark} color={hot ? '#34d399' : '#f87171'} />
              </View>

              <View style={styles.quoteRow}>
                <View>
                  <Text style={styles.quoteLabel}>{t('legacy_live_quote')}</Text>
                  <Text style={styles.quoteValue}>{formatMoney(quote.gross)}</Text>
                  <Text
                    style={[styles.spread, { color: hot ? '#34d399' : '#f87171' }]}
                  >
                    {Number(spreadPct) >= 0 ? '+' : ''}
                    {spreadPct}{t('legacy_pct_spread')}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.quoteLabel}>{t('legacy_since_purchase')}</Text>
                  <GainText gain={gain.gain} percent={gain.percent} />
                  <Text style={styles.netText}>{t('legacy_net')}{formatMoney(quote.proceeds)}</Text>
                </View>
              </View>

              {confirming ? (
                <View style={styles.confirmRow}>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton
                      label={`${t('legacy_confirm')}${formatMoney(quote.proceeds)}`}
                      icon="checkmark"
                      accent={accent}
                      onPress={() => doSell(row)}
                    />
                  </View>
                  <GhostButton label={t('cancel')} onPress={() => setConfirmKey(null)} />
                </View>
              ) : (
                <View style={styles.confirmRow}>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton
                      label={t('legacy_sell')}
                      icon="trending-down"
                      accent={accent}
                      onPress={() => {
                        setConfirmKey(key);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    />
                  </View>
                  <Text style={styles.holdHint}>
                    {gain.gain >= 0 ? t('legacy_appreciating') : t('legacy_below_cost')}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// Lightweight inline chart built from plain views so there is no new
// dependency just to draw sixteen bars.
function Sparkline({ data, color }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  return (
    <View style={styles.spark}>
      {data.map((v, i) => {
        const h = 4 + ((v - min) / range) * 20;
        return (
          <View
            key={i}
            style={[
              styles.sparkBar,
              { height: h, backgroundColor: i === data.length - 1 ? color : `${color}55` },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  deskBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 14,
  },
  deskMeta: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spark: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 26,
  },
  sparkBar: {
    width: 3,
    borderRadius: 2,
  },
  quoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  quoteLabel: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  quoteValue: {
    fontSize: 19,
    fontWeight: '900',
    color: '#fff',
    marginTop: 2,
  },
  spread: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  netText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
    marginTop: 3,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  holdHint: {
    flex: 1,
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'right',
  },
});
