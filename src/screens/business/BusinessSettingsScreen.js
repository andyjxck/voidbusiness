import { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet, TextInput } from 'react-native';
import Text, { useLanguage } from '../../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../../data/hapticsProxy';
import { t, tf, tBusinessName } from '../../data/i18n';
import { formatMoney } from '../../data/market';
import {
  getSubType,
  getHourlyIncome,
  getTaxOwed,
  getUpgradeCost,
  getSellPrice,
} from '../../data/businesses';
import { showAlert } from '../../data/alert';

export default function BusinessSettingsScreen({ business, boostExpiresAt, onBack, onRename, onSell }) {
  useLanguage();
  const sub = getSubType(business.type, business.subType);
  const [name, setName] = useState(business.name);
  const income = getHourlyIncome(business, boostExpiresAt);
  const owed = getTaxOwed(business);
  const nextUpgrade = getUpgradeCost(business);
  const sellPrice = getSellPrice(business);

  const handleSave = () => {
    const trimmed = name.trim();
    if (trimmed.length > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onRename(trimmed);
      onBack();
    }
  };

  const handleSell = () => {
    showAlert(
      t('alert_sell_business'),
      tf('msg_sell_business_for', { v0: tBusinessName(business.type, business.subType) || business.name, v1: formatMoney(sellPrice) }),
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color="#fbbf24" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('settings_label')}</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings_biz_name')}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={business.name}
            placeholderTextColor="#64748b"
          />
          <Pressable style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>{t('settings_save_name')}</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings_biz_info')}</Text>
          <View style={styles.infoCard}>
            <InfoRow label={t('settings_category')} value={sub.category} />
            <InfoRow label={t('level')} value={`${business.level} / ${sub.maxLevel}`} />
            <InfoRow label={t('income_hr_short')} value={formatMoney(income)} />
            <InfoRow label={t('detail_all_time_earnings')} value={formatMoney(business.allTimeEarnings || 0)} />
            <InfoRow label={t('fin_capitalisation')} value={formatMoney(business.capitalisation || 0)} />
            <InfoRow label={t('tax_owed')} value={formatMoney(owed)} />
            <InfoRow label={t('settings_next_upgrade')} value={formatMoney(nextUpgrade)} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('detail_sell_business')}</Text>
          <View style={styles.infoCard}>
            <Pressable style={styles.sellRow} onPress={handleSell}>
              <Text style={styles.sellRowText}>{t('detail_sell_business')}</Text>
              <Text style={styles.sellRowValue}>{formatMoney(sellPrice)}</Text>
            </Pressable>
            {owed > 0 && (
              <Text style={styles.sellNote}>
                {tf('settings_sell_tax_note', { v0: formatMoney(owed) })}
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
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
  content: {
    paddingBottom: 120,
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
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 12,
  },
  saveBtn: {
    backgroundColor: '#fbbf24',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 15,
  },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  rowLabel: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
  },
  rowValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
  },
  sellRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
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
  sellNote: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 4,
  },
});
