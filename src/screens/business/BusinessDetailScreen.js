import { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet, Modal } from 'react-native';
import Text, { useLanguage } from '../../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../../data/hapticsProxy';
import { t, tf, tBusinessName } from '../../data/i18n';
import UpgradeProgress from '../../components/UpgradeProgress';
import { formatMoney } from '../../data/market';
import {
  getSubType,
  getHourlyIncome,
  getHourlyStockUsage,
  getTaxOwed,
  getDailyTax,
  getHoursUntilSuspension,
  getUpgradeName,
  isSuspended,
  getSellPrice,
  getUpgradeCost,
  getStockCost,
  getBusinessTaxRate,

} from '../../data/businesses';
import { showAlert } from '../../data/alert';

export default function BusinessDetailScreen({
  business,
  money,
  boostExpiresAt,
  onBack,
  onOpenSettings,
  onUpgrade,
  onSkipUpgrade,
  onPayTax,
  onSell,
  onBuyStock,
}) {
  useLanguage();
  const sub = getSubType(business.type, business.subType);
  const suspended = isSuspended(business);
  const income = getHourlyIncome(business, boostExpiresAt);
  const owed = getTaxOwed(business);
  const dailyTax = getDailyTax(business);
  const businessTaxRate = getBusinessTaxRate(business);
  const hoursLeft = getHoursUntilSuspension(business);
  const daysLeft = Math.floor(hoursLeft / 24);
  const remHours = Math.floor(hoursLeft % 24);
  const upgradeCost = getUpgradeCost(business);
  const upgradeName = getUpgradeName(business);
  const maxed = business.level >= sub.maxLevel;
  const upgrading = business.upgradeCompletesAt && business.upgradeCompletesAt > Date.now();
  const canUpgrade = !maxed && money >= upgradeCost && !upgrading;
  const [phoneOpen, setPhoneOpen] = useState(false);
  const hourlyUsage = getHourlyStockUsage(business);
  const unitCost = sub.stockCostPerUnit || 0;
  const maxAffordable = unitCost > 0 ? Math.floor(money / unitCost) : 0;
  const hoursOfStock = hourlyUsage > 0 ? ((business.stock || 0) / hourlyUsage).toFixed(1) : '-';

  const handleUpgrade = () => {
    if (canUpgrade) {
      onUpgrade(business);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handlePayTax = () => {
    if (money >= owed) {
      onPayTax(business);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleSell = () => {
    const price = getSellPrice(business);
    showAlert(
      t('alert_sell_business'),
      tf('msg_sell_business_for', { v0: tBusinessName(business.type, business.subType) || business.name, v1: formatMoney(price) }),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('sell'),
          style: 'destructive',
          onPress: () => onSell(business),
        },
      ]
    );
  };

  const handleOrder = (quantity) => {
    onBuyStock(business, quantity);
    setPhoneOpen(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color="#fbbf24" />
        </Pressable>
        <Text style={styles.headerTitle}>{tBusinessName(business.type, business.subType) || business.name}</Text>
        <Pressable style={styles.settingsBtn} onPress={onOpenSettings}>
          <Ionicons name="settings" size={22} color="#fbbf24" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewLabel}>{t('income_hr_short')}</Text>
          <Text style={[styles.overviewValue, { color: suspended ? '#ef4444' : '#4ade80' }]}>
            {formatMoney(income)}
          </Text>
          <Text style={styles.overviewSub}>{sub.category} · {t('level')} {business.level}/{sub.maxLevel}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('detail_taxes')}</Text>
          <View style={[styles.taxCard, suspended && styles.taxCardDanger]}>
            <InfoRow label={t('status')} value={suspended ? t('suspended_tap_taxes') : t('active')} highlight={suspended} />
            <InfoRow label={t('detail_tax_rate')} value={`${(getBusinessTaxRate(business) * 100).toFixed(0)}%`} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('tax_owed')}</Text>
              <View style={styles.taxOwedRight}>
                <Text style={styles.infoValue}>{formatMoney(owed)}</Text>
                <Pressable style={styles.inlinePayBtn} onPress={handlePayTax}>
                  <Text style={styles.inlinePayBtnText}>{suspended ? t('resume') : t('pay')}</Text>
                </Pressable>
              </View>
            </View>
            <InfoRow label={t('detail_last_paid')} value={new Date(business.taxLastPaidAt).toLocaleDateString()} />
            <InfoRow label={t('detail_time_until_suspension')} value={suspended ? '-' : `${daysLeft}d ${remHours}h`} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('detail_financials')}</Text>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>{t('detail_all_time_earnings')}</Text>
              <Text style={styles.gridValue}>{formatMoney(business.allTimeEarnings || 0)}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>{t('fin_capitalisation')}</Text>
              <Text style={styles.gridValue}>{formatMoney(business.capitalisation || 0)}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>{t('detail_started')}</Text>
              <Text style={styles.gridValue}>{new Date(business.startedAt).toLocaleDateString()}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>{t('detail_last_tax_paid')}</Text>
              <Text style={styles.gridValue}>{new Date(business.taxLastPaidAt).toLocaleDateString()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('detail_stock')}</Text>
          <View style={styles.stockCard}>
            <InfoRow label={t('detail_current_stock')} value={tf('msg_n_units', { v0: business.stock || 0 })} />
            <InfoRow label={t('detail_hourly_usage')} value={tf('msg_n_units', { v0: hourlyUsage })} />
            <InfoRow label={t('detail_hours_remaining')} value={`${hoursOfStock}h`} />
            <InfoRow label={t('detail_unit_cost')} value={formatMoney(unitCost)} />
            <Pressable style={styles.stockBtn} onPress={() => setPhoneOpen(true)}>
              <Ionicons name="phone-portrait-outline" size={16} color="#000" />
              <Text style={styles.stockBtnText}>{t('detail_order_stock')}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('detail_next_upgrade')}</Text>
          {upgrading && <UpgradeProgress business={business} onSkip={onSkipUpgrade} />}
          {!upgrading && (
          <Pressable
            style={[styles.upgradeCard, (!canUpgrade || suspended) && styles.upgradeCardDisabled]}
            onPress={handleUpgrade}
            disabled={!canUpgrade || suspended}
          >
            <View style={styles.upgradeTextWrap}>
              <Text style={styles.upgradeName}>{maxed ? t('fully_upgraded') : upgradeName}</Text>
              {!maxed && (
                <Text style={styles.upgradeMeta}>
                  {t('level')} {business.level} → {business.level + 1} · {formatMoney(upgradeCost)}
                </Text>
              )}
            </View>
            {!maxed && (
              <View style={styles.upgradeArrow}>
                <Ionicons name="arrow-forward" size={18} color={canUpgrade ? '#fbbf24' : '#64748b'} />
              </View>
            )}
          </Pressable>
          )}

          <Pressable style={styles.sellRow} onPress={handleSell}>
            <Text style={styles.sellRowText}>{t('detail_sell_business')}</Text>
            <Text style={styles.sellRowValue}>{formatMoney(getSellPrice(business))}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={phoneOpen} transparent animationType="slide">
        <View style={styles.phoneOverlay}>
          <View style={styles.phoneFrame}>
            <View style={styles.phoneNotch} />
            <View style={styles.phoneHeader}>
              <Text style={styles.phoneHeaderText}>{t('detail_supplier')}</Text>
              <Pressable style={styles.phoneClose} onPress={() => setPhoneOpen(false)}>
                <Ionicons name="close" size={22} color="#fff" />
              </Pressable>
            </View>
            <View style={styles.phoneBody}>
              <Text style={styles.phoneLabel}>{tBusinessName(business.type, business.subType) || business.name}</Text>
              <Text style={styles.phoneMeta}>{tf('units_per_hour_each', { v0: hourlyUsage, v1: formatMoney(unitCost) })}</Text>
              <Text style={styles.phoneStock}>{tf('stock_units', { v0: business.stock || 0 })}</Text>
              <View style={styles.phoneOptions}>
                {[
                  { label: t('label_1_hour'), q: hourlyUsage },
                  { label: t('label_4_hours'), q: hourlyUsage * 4 },
                  { label: t('label_12_hours'), q: hourlyUsage * 12 },
                  { label: t('label_max'), q: maxAffordable },
                ].map((opt) => (
                  <Pressable
                    key={opt.label}
                    style={[styles.phoneOption, opt.q <= 0 && styles.phoneOptionDisabled]}
                    onPress={() => handleOrder(opt.q)}
                    disabled={opt.q <= 0}
                  >
                    <Text style={styles.phoneOptionLabel}>{opt.label}</Text>
                    <Text style={styles.phoneOptionCost}>{formatMoney(getStockCost(business, opt.q))}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function InfoRow({ label, value, highlight }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, highlight && { color: '#ef4444' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 54,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  settingsBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(251,191,36,0.12)',
  },
  content: {
    paddingBottom: 120,
  },
  overviewCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  overviewLabel: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
  },
  overviewValue: {
    fontSize: 42,
    fontWeight: '900',
    marginBottom: 6,
  },
  overviewSub: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#94a3b8',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  taxCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 12,
  },
  taxCardDanger: {
    borderColor: 'rgba(239,68,68,0.35)',
    backgroundColor: 'rgba(239,68,68,0.07)',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  infoLabel: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
  },
  taxOwedRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inlinePayBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  inlinePayBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },
  payBtn: {
    backgroundColor: '#fbbf24',
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  payBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 15,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  gridLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 6,
  },
  gridValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
  },
  upgradeCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.25)',
    marginBottom: 14,
  },
  upgradeCardDisabled: {
    borderColor: 'rgba(255,255,255,0.08)',
    opacity: 0.6,
  },
  upgradeTextWrap: {
    flex: 1,
  },
  upgradeName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fbbf24',
    marginBottom: 4,
  },
  upgradeMeta: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
  },
  upgradeArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(239,68,68,0.25)',
  },
  sellRowText: {
    fontSize: 15,
    color: '#fca5a5',
    fontWeight: '700',
  },
  sellRowValue: {
    fontSize: 15,
    color: '#ef4444',
    fontWeight: '800',
  },
  stockCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 12,
  },
  stockBtn: {
    backgroundColor: '#fbbf24',
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  stockBtnText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 15,
  },
  phoneOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  phoneFrame: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#0f172a',
    borderRadius: 36,
    padding: 24,
    paddingTop: 28,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  phoneNotch: {
    width: 80,
    height: 22,
    borderRadius: 12,
    backgroundColor: '#000',
    alignSelf: 'center',
    marginBottom: 20,
  },
  phoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  phoneHeaderText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  phoneClose: {
    padding: 6,
  },
  phoneBody: {
    alignItems: 'center',
  },
  phoneLabel: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fbbf24',
    marginBottom: 4,
    textAlign: 'center',
  },
  phoneMeta: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 4,
    textAlign: 'center',
  },
  phoneStock: {
    fontSize: 15,
    color: '#e2e8f0',
    fontWeight: '700',
    marginBottom: 24,
  },
  phoneOptions: {
    width: '100%',
    gap: 10,
  },
  phoneOption: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  phoneOptionDisabled: {
    opacity: 0.4,
  },
  phoneOptionLabel: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '700',
  },
  phoneOptionCost: {
    fontSize: 15,
    color: '#fbbf24',
    fontWeight: '800',
  },
});
