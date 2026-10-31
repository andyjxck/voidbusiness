import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Pressable, ScrollView, StyleSheet } from 'react-native';
import Text from '../../components/AppText';
import { t } from '../../data/i18n';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../../data/hapticsProxy';
import { formatMoney } from '../../data/market';
import {
  getAuctionLots,
  getAuctionEndsAt,
  getCategory,
  getAuctionBid,
  placeAuctionBid,
  getLocalizedName,
} from '../../data/progression';
import {
  ScreenHeader,
  CashPill,
  Countdown,
  EmptyState,
  PrimaryButton,
  GhostButton,
  ACCENT,
  ItemIcon,
  styles as ui,
} from './LegacyUI';

const RIVAL_NAMES = [
  'Blackwood Trust',
  'Anonymous Bidder',
  'Halloran Group',
  'Vance Holdings',
  'The Consortium',
  'Marchetti Family',
  'Paddle 12',
  'Northgate Capital',
];

// The room itself is simulated from the app tick, so rivals keep bidding
// and lots settle even when this screen is closed. This view is the paddle:
// it reads the standing bid and lets the player raise.
export default function AuctionHouseScreen({ money, progression, onProgressionChange, onBack }) {
  const [now, setNow] = useState(Date.now());
  const [log, setLog] = useState([]);
  const logIdRef = useRef(0);

  const lots = useMemo(() => getAuctionLots(progression, now), [progression, now]);
  const endsAt = getAuctionEndsAt(now);
  const timeLeft = endsAt - now;

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const pushLog = useCallback((lotId, text, tone) => {
    setLog((prev) => [{ id: logIdRef.current++, lotId, text, tone }, ...prev].slice(0, 40));
  }, []);

  const minIncrement = (bid) => Math.max(1, Math.round(bid * 0.05));

  const currentFor = (lot) => {
    const record = getAuctionBid(progression, lot.lotId);
    if (record) return record;
    return {
      currentBid: lot.openingBid,
      leader: 'room',
      leaderName: t('legacy_opening_bid'),
      bidCount: 0,
    };
  };

  const placeBid = (lot) => {
    const record = currentFor(lot);
    if (record.leader === 'player') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    const target = record.currentBid + minIncrement(record.currentBid);
    // Nothing is charged until the hammer falls - the player just needs to
    // be able to cover the bid if it stands.
    if (money < target) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      pushLog(lot.lotId, t('legacy_insufficient_increment'), 'lose');
      return;
    }
    onProgressionChange(placeAuctionBid(progression, lot, target, 'player', t('legacy_you')));
    pushLog(lot.lotId, `You bid ${formatMoney(target)}`, 'player');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const accent = ACCENT.auction;

  return (
    <View style={ui.screen}>
      <ScreenHeader
        title={t('legacy_auction_house')}
        subtitle={t('legacy_live_lots')}
        accent={accent}
        onBack={onBack}
        right={<CashPill money={money} />}
      />

      <View style={styles.roomBar}>
        <Countdown label={t('legacy_lots_close_in')} ms={timeLeft} accent={accent} />
        <Text style={styles.roomMeta}>{lots.length}{t('legacy_lots_on_block')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
        {lots.length === 0 ? (
          <EmptyState
            icon="hammer"
            title={t('legacy_nothing_on_block')}
            message={t('legacy_own_everything_house')}
          />
        ) : null}

        {lots.map((lot) => {
          const s = currentFor(lot);
          const cat = getCategory(lot.categoryId);
          const leading = s.leader === 'player';
          const nextBid = leading
            ? s.currentBid
            : s.currentBid + minIncrement(s.currentBid);
          const vsMarket = ((s.currentBid / lot.market) * 100 - 100).toFixed(0);
          // Once the bid clears the room's ceiling the lot is effectively won.
          const roomOut = s.currentBid >= lot.rivalCeiling;
          const willWin = leading && roomOut;

          return (
            <View
              key={lot.lotId}
              style={[
                ui.card,
                leading && { borderColor: `${accent}66` },
              ]}
            >
              <View style={ui.rowBetween}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <ItemIcon
                    categoryId={lot.categoryId}
                    itemId={lot.itemId}
                    color={cat.color}
                    style={[styles.lotIcon, { backgroundColor: `${cat.color}1f` }]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={ui.cardTitle}>{getLocalizedName(lot)}</Text>
                    <Text style={ui.cardMeta}>{getLocalizedName(cat)}</Text>
                  </View>
                </View>
                {leading ? (
                  <View
                    style={[
                      styles.leadPill,
                      { backgroundColor: willWin ? 'rgba(52,211,153,0.15)' : `${accent}22` },
                    ]}
                  >
                    <Ionicons
                      name={willWin ? 'trophy' : 'checkmark-circle'}
                      size={12}
                      color={willWin ? '#34d399' : accent}
                    />
                    <Text style={[styles.leadText, { color: willWin ? '#34d399' : accent }]}>
                      {willWin ? t('legacy_winning') : t('legacy_leading')}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.bidRow}>
                <View>
                  <Text style={styles.bidLabel}>{t('legacy_current_bid')}</Text>
                  <Text style={styles.bidValue}>{formatMoney(s.currentBid)}</Text>
                  <Text style={styles.bidHolder}>
                    {leading ? t('legacy_you_hold_lot') : `${t('legacy_held_by')}${s.leaderName}`}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.bidLabel}>{t('legacy_est_value')}</Text>
                  <Text style={styles.estValue}>{formatMoney(lot.market)}</Text>
                  <Text
                    style={[
                      styles.vsMarket,
                      { color: Number(vsMarket) < 0 ? '#34d399' : '#f87171' },
                    ]}
                  >
                    {Number(vsMarket) >= 0 ? '+' : ''}
                    {vsMarket}{t('legacy_vs_market')}
                  </Text>
                </View>
              </View>

              <View style={styles.paddleRow}>
                <Text style={styles.paddleMeta}>
                  {s.bidCount}{t('legacy_bids')}{lot.rivalCount}{t('legacy_rivals')}
                  {roomOut ? t('legacy_room_out_suffix') : ''}
                </Text>
                {leading ? (
                  <GhostButton
                    label={willWin ? t('legacy_room_is_out') : t('legacy_you_are_top_bid')}
                    icon={willWin ? 'trophy' : 'hand-left'}
                    disabled
                  />
                ) : (
                  <PrimaryButton
                    label={`${t('legacy_bid')}${formatMoney(nextBid)}`}
                    icon="hammer"
                    accent={accent}
                    disabled={money < nextBid}
                    onPress={() => placeBid(lot)}
                  />
                )}
              </View>
            </View>
          );
        })}

        {log.length > 0 ? (
          <>
            <Text style={[ui.sectionTitle, { marginTop: 16 }]}>{t('legacy_room_activity')}</Text>
            <View style={ui.card}>
              {log.slice(0, 12).map((entry) => (
                <View key={entry.id} style={styles.logRow}>
                  <View
                    style={[
                      styles.logDot,
                      {
                        backgroundColor:
                          entry.tone === 'player'
                            ? accent
                            : entry.tone === 'win'
                            ? '#34d399'
                            : entry.tone === 'lose'
                            ? '#f87171'
                            : '#475569',
                      },
                    ]}
                  />
                  <Text style={styles.logText}>{entry.text}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  roomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 14,
  },
  roomMeta: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
  },
  lotIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  leadText: {
    fontSize: 10,
    fontWeight: '800',
  },
  bidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  bidLabel: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  bidValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    marginTop: 2,
  },
  bidHolder: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 2,
  },
  estValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#94a3b8',
    marginTop: 2,
  },
  vsMarket: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  paddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  paddleMeta: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    flex: 1,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
  },
  logDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  logText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  resultsCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 13,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 7,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  resultText: {
    flex: 1,
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
  },
  dismissText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
  },
});
