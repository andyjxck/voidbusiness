import { useState, useEffect, useMemo } from 'react';
import { View, Pressable, ScrollView, StyleSheet } from 'react-native';
import Text from '../../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../../data/hapticsProxy';
import { formatMoney } from '../../data/market';
import {
  STORAGE_AREAS,
  getStorableItems,
  getItem,
  getCategory,
  getItemGain,
  getItemArea,
  setItemArea,
  getAreaCapacity,
  getAreaUsage,
  getItemVolatility,
  getLocalizedName,
} from '../../data/progression';
import {
  ScreenHeader,
  CashPill,
  EmptyState,
  StatStrip,
  GainText,
  ACCENT,
  ItemIcon,
  styles as ui,
} from './LegacyUI';
import { t, tf } from '../../data/i18n';

// One screen serves all three rooms. Each room has a different reason to
// use it, and moving a piece between rooms is the core decision because
// display capacity is limited by the estates you own.
export default function StorageScreen({ areaId, money, progression, onProgressionChange, onBack }) {
  const [now, setNow] = useState(Date.now());
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2600);
    return () => clearTimeout(t);
  }, [notice]);

  const area = STORAGE_AREAS.find((a) => a.id === areaId) || STORAGE_AREAS[0];
  const accent = ACCENT[area.id] || '#94a3b8';
  const capacity = getAreaCapacity(progression, area.id);
  const usage = getAreaUsage(progression, area.id);

  const items = useMemo(() => {
    return getStorableItems(progression)
      .map((entry) => {
        const def = getItem(entry.categoryId, entry.itemId);
        if (!def) return null;
        return {
          entry,
          def,
          gain: getItemGain(progression, entry, now),
          area: getItemArea(progression, entry.categoryId, entry.itemId),
        };
      })
      .filter(Boolean)
      .filter((r) => r.area === area.id)
      .sort((a, b) => b.gain.value - a.gain.value);
  }, [progression, now, area.id]);

  const roomValue = items.reduce((s, r) => s + r.gain.value, 0);

  const move = (row, targetArea) => {
    const result = setItemArea(progression, row.entry.categoryId, row.entry.itemId, targetArea);
    if (result.error === 'no_capacity') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setNotice(
        targetArea === 'vault'
          ? t('legacy_vault_full')
          : t('legacy_no_display_space')
      );
      return;
    }
    onProgressionChange(result.progression);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={ui.screen}>
      <ScreenHeader
        title={getLocalizedName(area)}
        subtitle={area.blurb}
        accent={accent}
        onBack={onBack}
        right={<CashPill money={money} />}
      />

      <StatStrip
        stats={[
          { label: t('legacy_pieces'), value: String(items.length) },
          { label: t('legacy_room_value'), value: formatMoney(roomValue), color: accent },
          { label: t('legacy_slots_used'), value: `${usage}/${capacity}` },
        ]}
      />

      {notice ? (
        <View style={styles.notice}>
          <Ionicons name="alert-circle" size={14} color="#f87171" />
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
        {items.length === 0 ? (
          <EmptyState
            icon={area.icon}
            title={tf('legacy_is_empty', { name: getLocalizedName(area) })}
            message={
              capacity === 0
                ? t('legacy_need_estate_storage')
                : `${capacity}${capacity === 1 ? t('legacy_slot_available') : t('legacy_slots_available')}`
            }
          />
        ) : null}

        {items.map((row) => {
          const cat = getCategory(row.entry.categoryId);
          const vol = getItemVolatility(row.entry.categoryId, row.entry.itemId);
          const key = `${row.entry.categoryId}:${row.entry.itemId}`;

          return (
            <View key={key} style={ui.card}>
              <View style={ui.rowBetween}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <ItemIcon
                    categoryId={row.entry.categoryId}
                    itemId={row.entry.itemId}
                    color={cat.color}
                    style={[styles.itemIcon, { backgroundColor: `${cat.color}1f` }]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={ui.cardTitle}>{getLocalizedName(row.def)}</Text>
                    <Text style={ui.cardMeta}>
                      {getLocalizedName(cat)} · {vol >= 1.4 ? t('legacy_blue_chip') : vol >= 0.9 ? t('legacy_steady') : t('legacy_slow_grower')}
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.valueText}>{formatMoney(row.gain.value)}</Text>
                  <GainText gain={row.gain.gain} percent={row.gain.percent} />
                </View>
              </View>

              <View style={styles.moveRow}>
                <Text style={styles.moveLabel}>{t('legacy_move_to')}</Text>
                <View style={styles.moveBtns}>
                  {STORAGE_AREAS.filter((a) => a.id !== area.id).map((target) => (
                    <Pressable
                      key={target.id}
                      style={[styles.moveBtn, { borderColor: `${ACCENT[target.id]}55` }]}
                      onPress={() => move(row, target.id)}
                    >
                      <Ionicons name={target.icon} size={13} color={ACCENT[target.id]} />
                      <Text style={[styles.moveBtnText, { color: ACCENT[target.id] }]}>
                        {getLocalizedName(target).replace('The ', '')}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#fff',
  },
  moveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  moveLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  moveBtns: {
    flexDirection: 'row',
    gap: 6,
  },
  moveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  moveBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
