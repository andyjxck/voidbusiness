import { useState, useEffect, useMemo, useRef } from 'react';
import { View, Pressable, ScrollView, StyleSheet, Image } from 'react-native';
import Text from '../../components/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../../data/hapticsProxy';
import { formatMoney } from '../../data/market';
import {
  getItemsByCategory,
  getOwnedEntry,
  getItemGain,
  getEstateSlots,
  getEstateHourlyIncome,
  getEstateUpgradeLevel,
  getEstateUpgradeCost,
  getEstateUpgradeCount,
  getEstateUpgradeMultiplier,
  getEstateGuards,
  getGuardHireCost,
  getTotalGuards,
  getVaultCapacity,
  getEstateWork,
  startEstateUpgrade,
  startGuardHire,
  rushEstateWork,
  ESTATE_UPGRADES,
  ESTATE_UPGRADE_MAX_LEVEL,
  VAULT_CAPACITY_PER_GUARD,
  getLocalizedName,
} from '../../data/progression';
import {
  ScreenHeader,
  CashPill,
  StatStrip,
  EmptyState,
  GainText,
  ESTATE_IMAGES,
  formatWait,
  styles as ui,
} from './LegacyUI';
import { showRewardedAd } from '../../data/ads';
import { t, tf } from '../../data/i18n';

const GOLD = '#fbbf24';

const PALETTES = [
  ['#1f2937', '#374151', '#4b5563'],
  ['#1e1b4b', '#312e81', '#3730a3'],
  ['#164e63', '#155e75', '#0e7490'],
  ['#3b2f0b', '#57430f', '#78350f'],
  ['#1e3a2f', '#14532d', '#166534'],
  ['#3b0764', '#4c1d95', '#5b21b6'],
];

const ESTATE_YIELD_PER_HOUR = 0.0015;

// Management view for property you already own. Each estate expands into
// six improvement lines plus a security detail, so the portfolio is an
// ongoing money sink rather than a static list of deeds.
export default function EstatePortfolioScreen({
  money,
  setMoney,
  progression,
  onProgressionChange,
  onBack,
}) {
  const [now, setNow] = useState(Date.now());
  const [expandedId, setExpandedId] = useState(null);
  const [notice, setNotice] = useState(null);

  // Ticks every second so the in-progress countdowns read correctly.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const busyRef = useRef(false);

  const rushWork = (work) => {
    showRewardedAd(() => {
      onProgressionChange(rushEstateWork(progression, work.id).progression);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });
  };

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2600);
    return () => clearTimeout(t);
  }, [notice]);

  const estates = getItemsByCategory('estates');

  const owned = useMemo(
    () =>
      estates
        .map((item, idx) => ({ item, idx, entry: getOwnedEntry(progression, 'estates', item.id) }))
        .filter((r) => r.entry),
    [estates, progression]
  );

  const portfolioValue = owned.reduce(
    (sum, r) => sum + getItemGain(progression, r.entry, now).value,
    0
  );

  const doUpgrade = (estateId, upgradeId) => {
    if (busyRef.current) return;
    const level = getEstateUpgradeLevel(progression, estateId, upgradeId);
    if (level >= ESTATE_UPGRADE_MAX_LEVEL) return;
    const cost = getEstateUpgradeCost(estateId, upgradeId, level);
    if (money < cost) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setNotice(tf('legacy_need_more_improvement', { x: formatMoney(cost - money) }));
      return;
    }
    const { progression: updated, error } = startEstateUpgrade(progression, estateId, upgradeId);
    if (error) return;
    busyRef.current = true;
    requestAnimationFrame(() => { busyRef.current = false; });
    setMoney((m) => Math.max(0, m - cost));
    onProgressionChange(updated);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const doHire = (estateId) => {
    if (busyRef.current) return;
    const cost = getGuardHireCost(progression, estateId);
    if (money < cost) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setNotice(tf('legacy_need_more_security', { x: formatMoney(cost - money) }));
      return;
    }
    const { progression: updated, error } = startGuardHire(progression, estateId);
    if (error) {
      setNotice(t('legacy_hire_vetting'));
      return;
    }
    busyRef.current = true;
    requestAnimationFrame(() => { busyRef.current = false; });
    setMoney((m) => Math.max(0, m - cost));
    onProgressionChange(updated);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={ui.screen}>
      <ScreenHeader
        title={t('legacy_my_estates')}
        subtitle={t('legacy_improve_properties_security')}
        accent={GOLD}
        onBack={onBack}
        right={<CashPill money={money} />}
      />

      <StatStrip
        stats={[
          { label: t('legacy_properties'), value: String(owned.length) },
          { label: t('portfolio'), value: formatMoney(portfolioValue), color: GOLD },
          {
            label: t('legacy_yield_hr'),
            value: formatMoney(getEstateHourlyIncome(progression, now)),
            color: '#34d399',
          },
        ]}
      />

      <View style={styles.securityBanner}>
        <Ionicons name="shield-checkmark" size={14} color="#38bdf8" />
        <Text style={styles.securityText}>
          {tf('legacy_guards_payroll', { x: getTotalGuards(progression), y: getVaultCapacity(progression) })}
        </Text>
      </View>

      {notice ? (
        <View style={styles.notice}>
          <Ionicons name="alert-circle" size={14} color="#f87171" />
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
        {owned.length === 0 ? (
          <EmptyState
            icon="business"
            title={t('legacy_no_property_yet')}
            message={t('legacy_acquire_first_estate')}
          />
        ) : null}

        {owned.map(({ item, idx, entry }) => {
          const gain = getItemGain(progression, entry, now);
          const slots = getEstateSlots(item.id);
          const guards = getEstateGuards(progression, item.id);
          const upgradeCount = getEstateUpgradeCount(progression, item.id);
          const multiplier = getEstateUpgradeMultiplier(progression, item.id);
          const palette = PALETTES[idx % PALETTES.length];
          const expanded = expandedId === item.id;
          const maxUpgrades = ESTATE_UPGRADES.length * ESTATE_UPGRADE_MAX_LEVEL;
          const hireCost = getGuardHireCost(progression, item.id);
          const guardWork = getEstateWork(progression, item.id, 'guard');

          return (
            <View key={item.id} style={styles.card}>
              {/* Compact hero, shorter than the sales brochure version */}
              <LinearGradient
                colors={palette}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hero}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.10)', 'transparent', 'rgba(0,0,0,0.4)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.6, y: 1 }}
                  style={styles.heroShine}
                />
                <View style={styles.heroRow}>
                  <View style={styles.monogramRing}>
                    {ESTATE_IMAGES[item.id] ? (
                      <Image
                        source={ESTATE_IMAGES[item.id]}
                        style={styles.monogramPhoto}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles.monogram}>{getLocalizedName(item).charAt(0)}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.estateName}>{getLocalizedName(item)}</Text>
                    <Text style={styles.heroMeta}>
                      {tf(guards === 1 ? 'legacy_display_slots_guards' : 'legacy_display_slots_guards_plural', { x: slots, y: guards })}
                    </Text>
                  </View>
                  <View style={styles.deedPill}>
                    <Ionicons name="document-text" size={11} color={GOLD} />
                    <Text style={styles.deedText}>{t('legacy_deed')}</Text>
                  </View>
                </View>
              </LinearGradient>

              <View style={styles.body}>
                <View style={styles.specRow}>
                  <View style={styles.spec}>
                    <Text style={styles.specLabel}>{t('legacy_valuation')}</Text>
                    <Text style={styles.specValue}>{formatMoney(gain.value)}</Text>
                  </View>
                  <View style={styles.specDivider} />
                  <View style={styles.spec}>
                    <Text style={styles.specLabel}>{t('legacy_yield')}</Text>
                    <Text style={[styles.specValue, { color: '#34d399' }]}>
                      {formatMoney(gain.value * ESTATE_YIELD_PER_HOUR)}/hr
                    </Text>
                  </View>
                  <View style={styles.specDivider} />
                  <View style={styles.spec}>
                    <Text style={styles.specLabel}>{t('legacy_improved')}</Text>
                    <Text style={[styles.specValue, { color: GOLD }]}>
                      +{Math.round((multiplier - 1) * 100)}%
                    </Text>
                  </View>
                </View>

                <View style={styles.gainRow}>
                  <Text style={styles.specLabel}>{t('legacy_since_acquisition')}</Text>
                  <GainText gain={gain.gain} percent={gain.percent} />
                </View>

                <Pressable
                  style={styles.expandBtn}
                  onPress={() => {
                    setExpandedId(expanded ? null : item.id);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Ionicons name="construct" size={14} color={GOLD} />
                  <Text style={styles.expandBtnText}>
                    {t('legacy_improvements')}{upgradeCount}/{maxUpgrades}
                  </Text>
                  <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={15}
                    color="#64748b"
                  />
                </Pressable>

                {expanded ? (
                  <View style={styles.upgradeList}>
                    {ESTATE_UPGRADES.map((u) => {
                      const level = getEstateUpgradeLevel(progression, item.id, u.id);
                      const maxed = level >= ESTATE_UPGRADE_MAX_LEVEL;
                      const cost = getEstateUpgradeCost(item.id, u.id, level);
                      const affordable = money >= cost;
                      const work = getEstateWork(progression, item.id, 'upgrade', u.id);

                      return (
                        <View key={u.id} style={styles.upgradeRow}>
                          <View style={styles.upgradeIcon}>
                            <Ionicons name={u.icon} size={16} color={maxed ? GOLD : '#94a3b8'} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.upgradeName}>{getLocalizedName(u)}</Text>
                            <View style={styles.pipRow}>
                              {Array.from({ length: ESTATE_UPGRADE_MAX_LEVEL }).map((_, i) => (
                                <View
                                  key={i}
                                  style={[
                                    styles.pip,
                                    i < level && { backgroundColor: GOLD },
                                  ]}
                                />
                              ))}
                              <Text style={styles.upgradeBonus}>
                                {work
                                  ? `${t('legacy_finishes_in')}${formatWait(work.completesAt - now)}`
                                  : `+${Math.round(u.valueBonus * 100)}${t('legacy_pct_each')}`}
                              </Text>
                            </View>
                          </View>
                          {maxed ? (
                            <View style={styles.maxPill}>
                              <Text style={styles.maxText}>{t('legacy_max')}</Text>
                            </View>
                          ) : work ? (
                            <Pressable
                              style={[styles.upgradeBtn, { flexDirection: 'row', alignItems: 'center' }]}
                              onPress={() => rushWork(work)}
                            >
                              <Ionicons name="play" size={12} color="#000" />
                              <Text style={[styles.upgradeBtnText, { marginLeft: 4 }]}>{t('legacy_ad')}</Text>
                            </Pressable>
                          ) : (
                            <Pressable
                              style={[
                                styles.upgradeBtn,
                                !affordable && styles.upgradeBtnDisabled,
                              ]}
                              disabled={!affordable}
                              onPress={() => doUpgrade(item.id, u.id)}
                            >
                              <Text
                                style={[
                                  styles.upgradeBtnText,
                                  !affordable && { color: '#475569' },
                                ]}
                              >
                                {formatMoney(cost)}
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      );
                    })}

                    {/* Security detail - the only way to grow the vault */}
                    <View style={styles.securityBlock}>
                      <View style={styles.securityHead}>
                        <Ionicons name="shield-checkmark" size={15} color="#38bdf8" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.securityTitle}>{t('legacy_security_detail')}</Text>
                          <Text style={styles.securitySub}>
                            {guardWork
                              ? `${guardWork.label} · ${formatWait(guardWork.completesAt - now)}`
                              : tf('legacy_each_guard_adds', { x: VAULT_CAPACITY_PER_GUARD })}
                          </Text>
                        </View>
                        <Text style={styles.guardCount}>{guards}</Text>
                      </View>
                      {guardWork ? (
                        <Pressable
                          style={[styles.hireBtn, { backgroundColor: '#0284c7' }]}
                          onPress={() => rushWork(guardWork)}
                        >
                          <Ionicons name="play" size={14} color="#fff" />
                          <Text style={[styles.hireBtnText, { color: '#fff', marginLeft: 6 }]}>
                            {t('legacy_watch_ad_finish')}
                          </Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          style={[
                            styles.hireBtn,
                            money < hireCost && styles.hireBtnDisabled,
                          ]}
                          disabled={money < hireCost}
                          onPress={() => doHire(item.id)}
                        >
                          <Ionicons
                            name="person-add"
                            size={14}
                            color={money < hireCost ? '#475569' : '#000'}
                          />
                          <Text
                            style={[
                              styles.hireBtnText,
                              money < hireCost && { color: '#475569' },
                            ]}
                          >
                            {t('legacy_hire_guard')}{formatMoney(hireCost)}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 11,
    borderRadius: 12,
    backgroundColor: 'rgba(56,189,248,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.18)',
  },
  securityText: {
    flex: 1,
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 11,
    borderRadius: 12,
    backgroundColor: 'rgba(248,113,113,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.25)',
  },
  noticeText: {
    flex: 1,
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(251,191,36,0.25)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  hero: {
    padding: 14,
  },
  heroShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  monogramRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(251,191,36,0.45)',
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  monogramPhoto: {
    width: '100%',
    height: '100%',
  },
  monogram: {
    color: GOLD,
    fontSize: 20,
    fontWeight: '300',
  },
  estateName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  heroMeta: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  deedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
  },
  deedText: {
    color: GOLD,
    fontSize: 10,
    fontWeight: '800',
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
  gainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(251,191,36,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.2)',
  },
  expandBtnText: {
    flex: 1,
    color: GOLD,
    fontSize: 13,
    fontWeight: '800',
  },
  upgradeList: {
    marginTop: 12,
    gap: 9,
  },
  upgradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  upgradeIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  upgradeName: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
  },
  pipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  pip: {
    width: 14,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  upgradeBonus: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 5,
  },
  upgradeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: GOLD,
  },
  upgradeBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  upgradeBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
  },
  maxPill: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.35)',
  },
  maxText: {
    color: GOLD,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  securityBlock: {
    marginTop: 6,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(56,189,248,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.18)',
    gap: 10,
  },
  securityHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  securityTitle: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '800',
  },
  securitySub: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  guardCount: {
    color: '#38bdf8',
    fontSize: 18,
    fontWeight: '900',
  },
  hireBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 11,
    backgroundColor: '#38bdf8',
  },
  hireBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  hireBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '800',
  },
});
