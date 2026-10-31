// VIP & Shop - its own nav-bar tab.
// Product cards reuse the home-screen credit-card visual and flip on tap:
// front = card face, back = what you get + the buy button.
// Prices come only from StoreKit: a product the App Store didn't return has
// no price and its button is disabled.

import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, ScrollView, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import Text, { useLanguage, useThemeColors } from '../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { haptic } from '../data/haptics';
import { formatMoney } from '../data/market';
import {
  PRODUCTS,
  CASH_PACK_GRANTS,
  FOUNDERS_CASH_GRANT,
  CARD_SKINS,
  subscribeStore,
  getStoreSnapshot,
  getProduct,
  buy,
  restore,
  isVip,
  setErrorHandler,
  reloadProducts,
  yearlySavingPercent,
} from '../data/store';
import { showAlert } from '../data/alert';
import { t } from '../data/i18n';
import PoliciesScreen from './PoliciesScreen';

const VIP_PERK_KEYS = [
  'shop_vip_perk_income',
  'shop_vip_perk_timers',
  'shop_vip_perk_ads',
  'shop_vip_perk_tax',
  'shop_vip_perk_suspension',
  'shop_vip_perk_skin',
];

// '{name}' placeholders in translated strings.
function fill(str, vars) {
  return String(str).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
}

// The App Store's localized price, or null when the product didn't load.
function priceOf(productId) {
  const p = getProduct(productId);
  return (p && p.displayPrice) || null;
}

// Gold EMV chip with contact lines - the detail that sells "real card".
function CardChip({ small }) {
  return (
    <LinearGradient
      colors={['#f2dd9a', '#c9a44a', '#8a6a24', '#f2dd9a']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.chip, small && styles.chipSmall]}
    >
      <View style={styles.chipLineH} />
      <View style={styles.chipLineV} />
    </LinearGradient>
  );
}

// Network mark: a single "void" ring (deliberately unlike any real card scheme).
function CardLogo({ size = 18 }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: Math.max(2, size * 0.2), borderColor: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(0,0,0,0.35)' }} />
    </View>
  );
}

// Mini credit-card face reused across every product tile.
function CardFace({ colors, brand, last4, holder, children, style, big }) {
  return (
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.face, style]}>
      <LinearGradient
        colors={['rgba(255,255,255,0.10)', 'transparent', 'rgba(255,255,255,0.05)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.faceTop}>
        <View style={styles.chipRow}>
          <CardChip small={!big} />
          <Ionicons name="wifi" size={big ? 15 : 11} color="rgba(255,255,255,0.30)" style={{ transform: [{ rotate: '90deg' }] }} />
        </View>
        <Text style={[styles.miniBrand, big && styles.brandBig]} numberOfLines={1}>{brand}</Text>
      </View>
      {children}
      <View style={styles.faceBottom}>
        <View style={styles.faceBottomLeft}>
          {last4 ? <Text style={[styles.cardNo, big && styles.cardNoBig]}>•••• {last4}</Text> : null}
          {holder ? <Text style={[styles.holder, big && styles.holderBig]} numberOfLines={1}>{holder}</Text> : null}
        </View>
        <CardLogo size={big ? 20 : 15} />
      </View>
    </LinearGradient>
  );
}

// The flipped-over side: mag stripe + signature strip, then the offer.
function CardBack({ colors, children, style }) {
  return (
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.face, styles.faceBackPad, style]}>
      <View style={styles.magStripe} />
      <View style={styles.sigRow}>
        <View style={styles.sigStrip}>
          <Text style={styles.sigText}>VOID BUSINESS</Text>
        </View>
        <View style={styles.cvvBox}>
          <Text style={styles.cvvText}>•••</Text>
        </View>
      </View>
      {children}
    </LinearGradient>
  );
}

// A tappable card that flips 180°: front face <-> back face (details + buy).
function FlipCard({ front, back, height, flipped, onFlip }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: flipped ? 1 : 0, duration: 350, useNativeDriver: true }).start();
  }, [flipped, anim]);
  const frontRot = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRot = anim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  return (
    <Pressable onPress={onFlip} style={{ height }}>
      <Animated.View
        pointerEvents={flipped ? 'none' : 'auto'}
        style={[styles.flipFace, { transform: [{ perspective: 900 }, { rotateY: frontRot }] }]}
      >
        {front}
      </Animated.View>
      <Animated.View
        pointerEvents={flipped ? 'auto' : 'none'}
        style={[styles.flipFace, styles.flipBack, { transform: [{ perspective: 900 }, { rotateY: backRot }] }]}
      >
        {back}
      </Animated.View>
    </Pressable>
  );
}

function BackContent({ lines, productId, owned, busy, onBuy }) {
  const price = priceOf(productId);
  return (
    <View style={styles.backInner}>
      <View style={styles.backLines}>
        {lines.map((l) => (
          <View key={l} style={styles.backLineRow}>
            <Ionicons name="checkmark" size={9} color="#fbbf24" />
            <Text style={styles.backLine} numberOfLines={2}>{l}</Text>
          </View>
        ))}
      </View>
      {owned ? (
        <View style={styles.ownedPill}>
          <Ionicons name="checkmark-circle" size={12} color="#4ade80" />
          <Text style={styles.ownedText}>{t('shop_owned')}</Text>
        </View>
      ) : (
        <Pressable
          style={[styles.buyBtn, !price && styles.btnDisabled]}
          onPress={() => onBuy(productId)}
          disabled={!!busy || !price}
          accessibilityState={{ disabled: !!busy || !price }}
        >
          <LinearGradient
            colors={price ? ['#fde68a', '#f59e0b'] : ['#475569', '#334155']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buyBtnGrad}
          >
            {busy === productId
              ? <ActivityIndicator size="small" color="#451a03" />
              : <Text style={[styles.buyBtnText, !price && styles.btnTextDisabled]} numberOfLines={1}>{price || t('shop_unavailable_short')}</Text>}
          </LinearGradient>
        </Pressable>
      )}
    </View>
  );
}

// Shared product tile: skin-gradient card front, details + price on back.
function ProductTile({ productId, name, tag, backLines, emoji, skinId, last4, owned, flipped, onFlip, busy, onBuy }) {
  const skin = CARD_SKINS[skinId] || CARD_SKINS.default;
  return (
    <View style={styles.tile}>
      <FlipCard
        flipped={flipped}
        onFlip={onFlip}
        height={styles.tile.height}
        front={
          <CardFace colors={skin.colors} brand="VOIDPAY" last4={last4} holder="VOID BUSINESS">
            <View style={styles.faceMid}>
              <Text style={styles.faceEmoji}>{emoji}</Text>
              <Text style={styles.faceName} numberOfLines={1}>{name}</Text>
              <View style={styles.faceTagRow}>
                <Text style={styles.faceTag} numberOfLines={1}>{tag}</Text>
                <Ionicons name="sync" size={8} color="rgba(255,255,255,0.35)" />
              </View>
            </View>
            {owned ? (
              <View style={styles.cornerOwned}>
                <Ionicons name="checkmark-circle" size={14} color="#4ade80" />
              </View>
            ) : null}
          </CardFace>
        }
        back={
          <CardBack colors={['#0f172a', '#1e293b']}>
            <BackContent lines={backLines} productId={productId} owned={owned} busy={busy} onBuy={onBuy} />
          </CardBack>
        }
      />
    </View>
  );
}

export default function ShopScreen({ onClose }) {
  useLanguage();
  const tc = useThemeColors();
  const [snap, setSnap] = useState(getStoreSnapshot());
  const [busy, setBusy] = useState(null);
  const [flipped, setFlipped] = useState(null); // productId of flipped card
  const [policyTab, setPolicyTab] = useState(null); // 'terms' | 'privacy' | null

  useEffect(() => {
    const unsub = subscribeStore(setSnap);
    // Fresh products every time the shop opens (reconnects if launch-time
    // init failed). The store notifies, so the snapshot updates itself.
    reloadProducts().catch(() => {});
    return unsub;
  }, []);
  // Surface StoreKit errors (declined payment, network failures) - user
  // cancels stay silent.
  useEffect(() => {
    setErrorHandler(() => {
      showAlert(t('shop_purchase_failed'), t('shop_purchase_failed_msg'));
    });
    return () => setErrorHandler(null);
  }, []);
  const retryProducts = () => { haptic('light'); reloadProducts().catch(() => {}); };
  const storeLoading = snap.productsStatus === 'loading' && Object.keys(snap.products || {}).length === 0;
  const storeUnavailable = !storeLoading && Object.keys(snap.products || {}).length === 0;
  const monthlyPrice = priceOf(PRODUCTS.VIP_MONTHLY);
  const yearlyPrice = priceOf(PRODUCTS.VIP_YEARLY);
  const yearlySaving = yearlySavingPercent(getProduct(PRODUCTS.VIP_MONTHLY), getProduct(PRODUCTS.VIP_YEARLY));
  const vip = isVip();
  const toggleFlip = (id) => { haptic('light'); setFlipped((f) => (f === id ? null : id)); };

  const doBuy = async (productId) => {
    if (busy) return;
    haptic('medium');
    setBusy(productId);
    try {
      await buy(productId);
    } catch (e) {
      const code = e && e.code;
      if (code !== 'user-cancelled') {
        showAlert(
          t('shop_purchase_failed'),
          e && e.message === 'store_unavailable' ? t('shop_store_unavailable') : t('shop_purchase_failed_msg')
        );
      }
    } finally {
      setBusy(null);
    }
  };

  const doRestore = async () => {
    if (busy) return;
    haptic('medium');
    setBusy('restore');
    try {
      await restore();
      showAlert(t('shop_restore_done'), t('shop_restore_done_msg'));
    } catch (e) {
      showAlert(t('shop_restore_failed'), t('shop_restore_failed_msg'));
    } finally {
      setBusy(null);
    }
  };

  const isOwned = (productId) =>
    (productId === PRODUCTS.INCOME_15X && snap.income15x) ||
    (productId === PRODUCTS.INCOME_2X && snap.income2x) ||
    (productId === PRODUCTS.FOUNDERS && snap.founders) ||
    (productId === PRODUCTS.VIP_MONTHLY && snap.vipMonthly) ||
    (productId === PRODUCTS.VIP_YEARLY && snap.vipYearly);

  return (
    <View style={[styles.root, { backgroundColor: tc.bg }]}>
      <View style={[styles.header, { borderBottomColor: tc.surfaceBorder }]}>
        <Text style={[styles.title, { color: tc.text }]}>{t('shop_title')}</Text>
        {onClose ? (
          <Pressable onPress={() => { haptic('light'); onClose(); }} hitSlop={12}>
            <Ionicons name="close" size={26} color={tc.text} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {storeLoading ? (
          <View style={[styles.storeNotice, { borderColor: tc.surfaceBorder, backgroundColor: tc.surface }]}>
            <ActivityIndicator size="small" color={tc.textMuted} />
            <Text style={[styles.storeNoticeText, { color: tc.textMuted }]}>{t('shop_loading')}</Text>
          </View>
        ) : storeUnavailable ? (
          <Pressable
            style={[styles.storeNotice, { borderColor: tc.surfaceBorder, backgroundColor: tc.surface }]}
            onPress={retryProducts}
            accessibilityRole="button"
          >
            <Ionicons name="cloud-offline-outline" size={18} color={tc.textMuted} />
            <Text style={[styles.storeNoticeText, { color: tc.text }]}>{t('shop_store_unavailable')}</Text>
            <Text style={[styles.storeRetry, { color: tc.accent }]}>{t('shop_try_again')}</Text>
          </Pressable>
        ) : null}

        {/* VIP hero card */}
        <FlipCard
          flipped={flipped === 'vip'}
          onFlip={() => toggleFlip('vip')}
          height={styles.vipCard.height}
          front={
            <CardFace colors={CARD_SKINS.vip.colors} brand="VOIDPAY VIP" last4="8888" holder="VOID MEMBER" big style={styles.vipFace}>
              <View style={styles.vipMid}>
                <Ionicons name="diamond" size={26} color="#fde68a" />
                <Text style={styles.vipName}>VIP</Text>
                <Text style={styles.vipTag}>
                  {vip ? t(snap.vipYearly ? 'shop_vip_active_yearly' : 'shop_vip_active_monthly') : t('shop_vip_tagline')}
                </Text>
              </View>
            </CardFace>
          }
          back={
            <CardBack colors={['#0f172a', '#1e293b']} style={styles.vipFace}>
              <View style={styles.vipBack}>
                <View style={styles.vipPerks}>
                  {VIP_PERK_KEYS.map((k) => (
                    <View key={k} style={styles.vipPerkRow}>
                      <Ionicons name="checkmark" size={11} color="#fde68a" />
                      <Text style={styles.vipPerkText} numberOfLines={1}>{t(k)}</Text>
                    </View>
                  ))}
                </View>
                {vip ? (
                  <View style={styles.ownedPill}>
                    <Ionicons name="checkmark" size={11} color="#4ade80" />
                    <Text style={styles.ownedText}>{t('shop_active')}</Text>
                  </View>
                ) : (
                  <View style={styles.planRow}>
                    <Pressable
                      style={[styles.planBtn, !monthlyPrice && styles.btnDisabled]}
                      onPress={() => doBuy(PRODUCTS.VIP_MONTHLY)}
                      disabled={!!busy || !monthlyPrice}
                      accessibilityState={{ disabled: !!busy || !monthlyPrice }}
                    >
                      <LinearGradient colors={monthlyPrice ? ['#fef3c7', '#fcd34d'] : ['#475569', '#334155']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.planBtnGrad}>
                        {busy === PRODUCTS.VIP_MONTHLY ? <ActivityIndicator size="small" color="#451a03" /> : (
                          <>
                            <Text style={[styles.planPrice, !monthlyPrice && styles.btnTextDisabled]} numberOfLines={1}>{monthlyPrice || t('shop_unavailable_short')}</Text>
                            <Text style={[styles.planName, !monthlyPrice && styles.btnTextDisabled]} numberOfLines={1}>{t('shop_vip_monthly_period')}</Text>
                          </>
                        )}
                      </LinearGradient>
                    </Pressable>
                    <Pressable
                      style={[styles.planBtn, !yearlyPrice && styles.btnDisabled]}
                      onPress={() => doBuy(PRODUCTS.VIP_YEARLY)}
                      disabled={!!busy || !yearlyPrice}
                      accessibilityState={{ disabled: !!busy || !yearlyPrice }}
                    >
                      <LinearGradient colors={yearlyPrice ? ['#fde68a', '#f59e0b'] : ['#475569', '#334155']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.planBtnGrad}>
                        {busy === PRODUCTS.VIP_YEARLY ? <ActivityIndicator size="small" color="#451a03" /> : (
                          <>
                            <Text style={[styles.planPrice, !yearlyPrice && styles.btnTextDisabled]} numberOfLines={1}>{yearlyPrice || t('shop_unavailable_short')}</Text>
                            <Text style={[styles.planName, !yearlyPrice && styles.btnTextDisabled]} numberOfLines={1}>
                              {yearlySaving
                                ? `${t('shop_vip_yearly_period')} • ${fill(t('shop_save_pct'), { pct: yearlySaving })}`
                                : t('shop_vip_yearly_period')}
                            </Text>
                          </>
                        )}
                      </LinearGradient>
                    </Pressable>
                  </View>
                )}
              </View>
            </CardBack>
          }
        />

        {/* Subscription terms + legal links: visible without flipping the card,
            directly under the VIP plan buttons (App Store Guideline 3.1.2). */}
        {!vip ? (
          <View style={styles.subInfo}>
            <Text style={[styles.subInfoText, { color: tc.textSecondary }]}>
              {fill(t('shop_sub_terms'), {
                monthly: monthlyPrice || '-',
                yearly: yearlyPrice || '-',
              })}
            </Text>
          </View>
        ) : null}
        <View style={styles.legalLinks}>
          <Pressable onPress={() => { haptic('light'); setPolicyTab('terms'); }} hitSlop={8} accessibilityRole="link">
            <Text style={[styles.legalLink, { color: tc.accent }]}>{t('legal_terms_of_use')}</Text>
          </Pressable>
          <Text style={[styles.legalSep, { color: tc.textMuted }]}>•</Text>
          <Pressable onPress={() => { haptic('light'); setPolicyTab('privacy'); }} hitSlop={8} accessibilityRole="link">
            <Text style={[styles.legalLink, { color: tc.accent }]}>{t('legal_privacy_policy')}</Text>
          </Pressable>
        </View>

        <Text style={[styles.sectionTitle, { color: tc.textMuted }]}>{t('shop_section_permanent')}</Text>
        <View style={styles.grid}>
          <ProductTile productId={PRODUCTS.INCOME_15X} skinId="income15x" name={t('shop_income15_name')} tag={t('shop_forever')} emoji="📈" last4="0150"
            backLines={[t('shop_income15_line'), fill(t('shop_unlocks_skin'), { skin: 'Emerald' })]}
            owned={isOwned(PRODUCTS.INCOME_15X)} flipped={flipped === PRODUCTS.INCOME_15X}
            onFlip={() => toggleFlip(PRODUCTS.INCOME_15X)} busy={busy} onBuy={doBuy} />
          <ProductTile productId={PRODUCTS.INCOME_2X} skinId="income2x" name={t('shop_income2_name')} tag={t('shop_forever')} emoji="⚡" last4="0200"
            backLines={[t('shop_income2_line'), fill(t('shop_unlocks_skin'), { skin: 'Ultraviolet' })]}
            owned={isOwned(PRODUCTS.INCOME_2X)} flipped={flipped === PRODUCTS.INCOME_2X}
            onFlip={() => toggleFlip(PRODUCTS.INCOME_2X)} busy={busy} onBuy={doBuy} />
        </View>

        <Text style={[styles.sectionTitle, { color: tc.textMuted }]}>{t('shop_section_bundle')}</Text>
        <FlipCard
          flipped={flipped === PRODUCTS.FOUNDERS}
          onFlip={() => toggleFlip(PRODUCTS.FOUNDERS)}
          height={styles.wideCard.height}
          front={
            <CardFace colors={CARD_SKINS.founders.colors} brand="VOIDPAY" last4="0001" holder="FOUNDING MEMBER" big>
              <View style={styles.faceMid}>
                <Text style={styles.faceEmoji}>🚀</Text>
                <Text style={styles.faceName}>{t('shop_founders_name')}</Text>
                <View style={styles.faceTagRow}>
                  <Text style={styles.faceTag}>{t('shop_founders_tag')}</Text>
                  <Ionicons name="sync" size={8} color="rgba(255,255,255,0.35)" />
                </View>
              </View>
              {isOwned(PRODUCTS.FOUNDERS) ? (
                <View style={styles.cornerOwned}><Ionicons name="checkmark-circle" size={14} color="#4ade80" /></View>
              ) : null}
            </CardFace>
          }
          back={
            <CardBack colors={['#0f172a', '#1e293b']}>
              <BackContent
                lines={[
                  t('shop_founders_line_dealership'),
                  fill(t('shop_founders_line_cash'), { amount: formatMoney(FOUNDERS_CASH_GRANT) }),
                  t('shop_founders_line_accountant'),
                  fill(t('shop_unlocks_skin'), { skin: 'Ember' }),
                ]}
                productId={PRODUCTS.FOUNDERS}
                owned={isOwned(PRODUCTS.FOUNDERS)}
                busy={busy}
                onBuy={doBuy}
              />
            </CardBack>
          }
        />

        <Text style={[styles.sectionTitle, { color: tc.textMuted }]}>{t('shop_section_cash')}</Text>
        <View style={styles.grid}>
          {[
            { productId: PRODUCTS.CASH_1, skinId: 'cash1', nameKey: 'shop_cash1_name', emoji: '💵', descKey: 'shop_cash1_desc', skinName: 'Slate', last4: '0025' },
            { productId: PRODUCTS.CASH_2, skinId: 'cash2', nameKey: 'shop_cash2_name', emoji: '💰', descKey: 'shop_cash2_desc', skinName: 'Glacier', last4: '0100' },
            { productId: PRODUCTS.CASH_3, skinId: 'cash3', nameKey: 'shop_cash3_name', emoji: '🔑', descKey: 'shop_cash3_desc', skinName: 'Royal', last4: '0500' },
            { productId: PRODUCTS.CASH_4, skinId: 'cash4', nameKey: 'shop_cash4_name', emoji: '👑', descKey: 'shop_cash4_desc', skinName: 'Crimson', last4: '2500' },
          ].map((p) => (
            <ProductTile
              key={p.productId}
              productId={p.productId}
              skinId={p.skinId}
              name={t(p.nameKey)}
              tag={formatMoney(CASH_PACK_GRANTS[p.productId])}
              emoji={p.emoji}
              last4={p.last4}
              backLines={[
                fill(t('shop_cash_line'), { amount: formatMoney(CASH_PACK_GRANTS[p.productId]), desc: t(p.descKey) }),
                fill(t('shop_unlocks_skin'), { skin: p.skinName }),
              ]}
              owned={false}
              flipped={flipped === p.productId}
              onFlip={() => toggleFlip(p.productId)}
              busy={busy}
              onBuy={doBuy}
            />
          ))}
        </View>

        <Pressable style={[styles.restoreBtn, { borderColor: tc.surfaceBorder }]} onPress={doRestore} disabled={!!busy}>
          {busy === 'restore'
            ? <ActivityIndicator size="small" color={tc.textMuted} />
            : <Text style={[styles.restoreText, { color: tc.textMuted }]}>{t('shop_restore')}</Text>}
        </Pressable>
      </ScrollView>

      <PoliciesScreen
        visible={!!policyTab}
        initialTab={policyTab || 'privacy'}
        onClose={() => setPolicyTab(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 14, borderBottomWidth: 1,
  },
  title: { fontSize: 22, fontWeight: '800' },
  content: { padding: 16, paddingBottom: 130 },

  flipFace: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backfaceVisibility: 'hidden' },
  flipBack: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  face: { flex: 1, borderRadius: 14, padding: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  faceBackPad: { paddingTop: 12 },
  faceTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  chip: { width: 24, height: 17, borderRadius: 3.5, overflow: 'hidden', justifyContent: 'center' },
  chipSmall: { width: 20, height: 14, borderRadius: 3 },
  chipLineH: { position: 'absolute', left: 0, right: 0, top: '45%', height: 1.5, backgroundColor: 'rgba(80,55,10,0.45)' },
  chipLineV: { position: 'absolute', top: 0, bottom: 0, left: '45%', width: 1.5, backgroundColor: 'rgba(80,55,10,0.35)' },
  miniBrand: { color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: '900', letterSpacing: 2, fontStyle: 'italic', flexShrink: 1 },
  brandBig: { fontSize: 12 },
  faceMid: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  faceEmoji: { fontSize: 26, marginBottom: 4 },
  faceName: { color: '#fff', fontSize: 14, fontWeight: '800' },
  faceTagRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  faceTag: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '700' },
  cornerOwned: { position: 'absolute', top: 30, right: 8 },
  faceBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  faceBottomLeft: { flexShrink: 1 },
  cardNo: { color: 'rgba(255,255,255,0.75)', fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  cardNoBig: { fontSize: 11, letterSpacing: 2 },
  holder: { color: 'rgba(255,255,255,0.4)', fontSize: 7, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
  holderBig: { fontSize: 8 },

  magStripe: { height: 18, backgroundColor: '#050505', marginHorizontal: -16, marginTop: -2 },
  sigRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  sigStrip: { flex: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 2, justifyContent: 'center', paddingHorizontal: 6 },
  sigText: { color: 'rgba(30,41,59,0.6)', fontSize: 7, fontWeight: '700', fontStyle: 'italic', letterSpacing: 1 },
  cvvBox: { height: 14, minWidth: 26, backgroundColor: '#fff', borderRadius: 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  cvvText: { color: '#1e293b', fontSize: 8, fontWeight: '900' },

  backInner: { flex: 1, marginTop: 8, justifyContent: 'space-between' },
  backLines: { gap: 3 },
  backLineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5 },
  backLine: { color: '#cbd5e1', fontSize: 10.5, fontWeight: '600', lineHeight: 14, flex: 1 },
  buyBtn: { alignSelf: 'flex-start', borderRadius: 8, marginTop: 5, overflow: 'hidden' },
  buyBtnGrad: { paddingHorizontal: 16, paddingVertical: 7, minWidth: 66, alignItems: 'center' },
  buyBtnText: { color: '#451a03', fontSize: 13, fontWeight: '900' },
  ownedPill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 5 },
  ownedText: { color: '#4ade80', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  vipCard: { height: 236 },
  vipFace: { padding: 16 },
  vipMid: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  vipName: { color: '#fde68a', fontSize: 28, fontWeight: '900', letterSpacing: 6 },
  vipTag: { color: 'rgba(253,230,138,0.7)', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  vipBack: { flex: 1, marginTop: 8 },
  vipPerks: { gap: 4 },
  vipPerkRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  vipPerkText: { color: '#e2e8f0', fontSize: 11, fontWeight: '600', flex: 1 },
  planRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  planBtn: { flex: 1, borderRadius: 10, overflow: 'hidden' },
  planBtnGrad: { paddingVertical: 9, alignItems: 'center' },
  planPrice: { color: '#451a03', fontSize: 15, fontWeight: '900' },
  planName: { color: '#78350f', fontSize: 10, fontWeight: '700' },

  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginTop: 18, marginBottom: 8, marginLeft: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: { width: '48.5%', height: 166, marginBottom: 10 },
  wideCard: { height: 168 },

  restoreBtn: { borderWidth: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 22 },
  restoreText: { fontSize: 14, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
  btnTextDisabled: { color: '#e2e8f0' },
  storeNotice: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 8,
    borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 12,
  },
  storeNoticeText: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  storeRetry: { fontSize: 13, fontWeight: '800' },
  subInfo: { marginTop: 10, marginHorizontal: 4 },
  subInfoText: { fontSize: 11, lineHeight: 16, textAlign: 'center' },
  legalLinks: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  legalLink: { fontSize: 13, fontWeight: '700', textDecorationLine: 'underline', paddingVertical: 4 },
  legalSep: { fontSize: 13 },
});
