import React, { useEffect, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Text from './AppText';
import { Ionicons } from '@expo/vector-icons';
import { getUpgradeProgress } from '../data/businesses';
import { t } from '../data/i18n';

export function formatUpgradeTime(ms) {
  if (ms <= 0) return t('time_done');
  const totalSeconds = Math.ceil(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return `${minutes}m ${seconds}s`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export default function UpgradeProgress({ business, onSkip }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!business.upgradeCompletesAt) return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      if (Date.now() >= business.upgradeCompletesAt) {
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [business.upgradeCompletesAt]);

  const progress = getUpgradeProgress(business);
  if (!progress) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{t('upgrading_dots')}</Text>
        <Text style={styles.time}>{formatUpgradeTime(progress.remaining)}</Text>
      </View>
      <View style={styles.bar}>
        <View style={[styles.barFill, { width: `${progress.pct}%` }]} />
      </View>
      {onSkip && (
        <Pressable style={styles.skipBtn} onPress={onSkip}>
          <Ionicons name="play-circle" size={14} color="#fbbf24" />
          <Text style={styles.skipBtnText}>{t('watch_ad_skip')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '600',
  },
  time: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '700',
  },
  bar: {
    height: 6,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#fbbf24',
    borderRadius: 3,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.25)',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  skipBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fbbf24',
  },
});
