import { useState, useEffect, useMemo, useRef } from 'react';
import { View, Pressable, ScrollView, StyleSheet } from 'react-native';
import Text from '../../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../../data/hapticsProxy';
import { formatMoney } from '../../data/market';
import {
  getDealerStock,
  getDealerRestockAt,
  getCategory,
  buyItem,
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
import { t, tf } from '../../data/i18n';

// The dealer is a negotiation, not a price tag. Every piece has a hidden
// walk-away figure. Offer above it and the deal closes; lowball too often
// and the dealer pulls the piece for the rest of the window.
export default function PrivateDealerScreen({ money, setMoney, progression, onProgressionChange, onBack }) {
  const [now, setNow] = useState(Date.now());
  const [negotiations, setNegotiations] = useState({});
  const [openDeal, setOpenDeal] = useState(null);
  const [offerPct, setOfferPct] = useState(0.9);
  const busyRef = useRef(false);

  const stock = useMemo(() => getDealerStock(progression, now), [progression, now]);
  const restockAt = getDealerRestockAt(now);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const accent = ACCENT.dealer;

  const getNegotiation = (deal) =>
    negotiations[deal.dealId] || {
      patienceLeft: deal.patience,
      lastResponse: null,
      counter: null,
      walkedAway: false,
      closedAt: null,
    };

  const makeOffer = (deal, amount) => {
    if (busyRef.current) return;
    const neg = getNegotiation(deal);
    if (neg.walkedAway) return;

    if (amount > money) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setNegotiations((prev) => ({
        ...prev,
        [deal.dealId]: {
          ...neg,
          lastResponse: t('legacy_cannot_cover'),
          counter: null,
        },
      }));
      return;
    }

    // Accepted outright.
    if (amount >= deal.floorPrice) {
      const { progression: updated, error } = buyItem(
        progression,
        deal.categoryId,
        deal.itemId,
        amount
      );
      if (error) return;
      busyRef.current = true;
      requestAnimationFrame(() => { busyRef.current = false; });
      setMoney((m) => Math.max(0, m - amount));
      onProgressionChange(updated);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNegotiations((prev) => ({
        ...prev,
        [deal.dealId]: {
          ...neg,
          lastResponse: tf('legacy_deal_is_yours', { name: getLocalizedName(deal), price: formatMoney(amount) }),
          counter: null,
          closedAt: Date.now(),
        },
      }));
      setOpenDeal(null);
      return;
    }

    // Rejected. The dealer counters somewhere between the offer and their floor.
    const patienceLeft = neg.patienceLeft - 1;
    if (patienceLeft <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setNegotiations((prev) => ({
        ...prev,
        [deal.dealId]: {
          ...neg,
          patienceLeft: 0,
          walkedAway: true,
          lastResponse: t('legacy_dealer_withdrawn'),
          counter: null,
        },
      }));
      setOpenDeal(null);
      return;
    }

    const counter = Math.round(deal.floorPrice + (deal.askPrice - deal.floorPrice) * 0.35);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setNegotiations((prev) => ({
      ...prev,
      [deal.dealId]: {
        ...neg,
        patienceLeft,
        counter,
        lastResponse: tf('legacy_not_close_enough', { price: formatMoney(counter) }),
      },
    }));
  };

  const openNegotiation = (deal) => {
    setOpenDeal(deal.dealId);
    setOfferPct(0.9);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={ui.screen}>
      <ScreenHeader
        title={t('legacy_private_dealer')}
        subtitle={t('legacy_hand_picked')}
        accent={accent}
        onBack={onBack}
        right={<CashPill money={money} />}
      />

      <View style={styles.dealerIntro}>
        <View style={[styles.avatar, { borderColor: `${accent}55` }]}>
          <Ionicons name="person" size={20} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.dealerName}>{t('legacy_corbin_vale')}</Text>
          <Text style={styles.dealerBlurb}>
            {t('legacy_dealer_intro')}
          </Text>
        </View>
      </View>

      <View style={styles.restockRow}>
        <Countdown label={t('legacy_restock_in')} ms={restockAt - now} accent={accent} />
        <Text style={styles.restockMeta}>{stock.length}{t('legacy_pieces_available')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
        {stock.length === 0 ? (
          <EmptyState
            icon="briefcase"
            title={t('legacy_nothing_back_room')}
            message={t('legacy_own_everything_dealer')}
          />
        ) : null}

        {stock.map((deal) => {
          const cat = getCategory(deal.categoryId);
          const neg = getNegotiation(deal);
          const isOpen = openDeal === deal.dealId;
          const offerAmount = Math.round(deal.askPrice * offerPct);
          const vsMarket = ((deal.askPrice / deal.market) * 100 - 100).toFixed(0);

          return (
            <View
              key={deal.dealId}
              style={[ui.card, neg.walkedAway && { opacity: 0.5 }]}
            >
              <View style={ui.rowBetween}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <ItemIcon
                    categoryId={deal.categoryId}
                    itemId={deal.itemId}
                    color={cat.color}
                    style={[styles.itemIcon, { backgroundColor: `${cat.color}1f` }]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={ui.cardTitle}>{getLocalizedName(deal)}</Text>
                    <Text style={ui.cardMeta}>{getLocalizedName(cat)}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.askLabel}>{t('legacy_asking')}</Text>
                  <Text style={styles.askValue}>{formatMoney(deal.askPrice)}</Text>
                  <Text style={styles.vsMarket}>{tf('legacy_vs_market_pct', { x: vsMarket })}</Text>
                </View>
              </View>

              {neg.lastResponse ? (
                <View style={[styles.speech, { borderColor: `${accent}33` }]}>
                  <Ionicons name="chatbubble-ellipses" size={13} color={accent} />
                  <Text style={styles.speechText}>{neg.lastResponse}</Text>
                </View>
              ) : null}

              {neg.closedAt ? (
                <View style={styles.soldRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#34d399" />
                  <Text style={styles.soldText}>{t('legacy_acquired')}</Text>
                </View>
              ) : neg.walkedAway ? (
                <View style={styles.soldRow}>
                  <Ionicons name="close-circle" size={16} color="#f87171" />
                  <Text style={[styles.soldText, { color: '#f87171' }]}>{t('legacy_withdrawn')}</Text>
                </View>
              ) : isOpen ? (
                <View style={styles.negotiatePanel}>
                  <View style={ui.rowBetween}>
                    <Text style={styles.offerLabel}>{t('legacy_your_offer')}</Text>
                    <Text style={[styles.offerValue, { color: accent }]}>
                      {formatMoney(offerAmount)}
                    </Text>
                  </View>

                  <View style={styles.pctRow}>
                    {[0.7, 0.8, 0.9, 1.0].map((p) => (
                      <Pressable
                        key={p}
                        style={[
                          styles.pctBtn,
                          offerPct === p && { backgroundColor: accent, borderColor: accent },
                        ]}
                        onPress={() => {
                          setOfferPct(p);
                          Haptics.selectionAsync();
                        }}
                      >
                        <Text
                          style={[
                            styles.pctText,
                            offerPct === p && { color: '#000' },
                          ]}
                        >
                          {Math.round(p * 100)}%
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={styles.patienceText}>
                    {tf('legacy_dealer_patience', { x: neg.patienceLeft })}{neg.patienceLeft === 1 ? t('legacy_offer_left_singular') : t('legacy_offers_left_plural')}
                  </Text>

                  <View style={styles.actionRow}>
                    <View style={{ flex: 1 }}>
                      <PrimaryButton
                        label={t('legacy_make_offer_btn')}
                        icon="cash"
                        accent={accent}
                        disabled={offerAmount > money}
                        onPress={() => makeOffer(deal, offerAmount)}
                      />
                    </View>
                    {neg.counter ? (
                      <View style={{ flex: 1 }}>
                        <GhostButton
                          label={`${t('legacy_accept')}${formatMoney(neg.counter)}`}
                          icon="checkmark"
                          disabled={neg.counter > money}
                          onPress={() => makeOffer(deal, neg.counter)}
                        />
                      </View>
                    ) : (
                      <GhostButton label={t('legacy_close')} onPress={() => setOpenDeal(null)} />
                    )}
                  </View>
                </View>
              ) : (
                <View style={styles.actionRow}>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton
                      label={t('legacy_negotiate')}
                      icon="chatbubbles"
                      accent={accent}
                      onPress={() => openNegotiation(deal)}
                    />
                  </View>
                  <GhostButton
                    label={`${t('legacy_pay')}${formatMoney(deal.askPrice)}`}
                    disabled={deal.askPrice > money}
                    onPress={() => makeOffer(deal, deal.askPrice)}
                  />
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  dealerIntro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(52,211,153,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.18)',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  dealerName: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '800',
  },
  dealerBlurb: {
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
    lineHeight: 17,
  },
  restockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 14,
  },
  restockMeta: {
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
  askLabel: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  askValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
    marginTop: 2,
  },
  vsMarket: {
    fontSize: 10,
    color: '#f87171',
    fontWeight: '700',
    marginTop: 1,
  },
  speech: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  speechText: {
    flex: 1,
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  negotiatePanel: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    gap: 10,
  },
  offerLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  offerValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  pctRow: {
    flexDirection: 'row',
    gap: 6,
  },
  pctBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  pctText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
  },
  patienceText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  soldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  soldText: {
    color: '#34d399',
    fontSize: 13,
    fontWeight: '800',
  },
});
