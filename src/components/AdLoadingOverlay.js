// Shown while a rewarded ad is requested but not loaded yet (up to the 10s
// timeout in ads.js), so a tap on "watch ad" never looks ignored. The player
// can cancel and keep playing; no reward is given then.

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import Text from './AppText';
import { isWaitingForAd, subscribeAdWaiting, cancelPendingAd } from '../data/ads';
import { t } from '../data/i18n';

export default function AdLoadingOverlay() {
  const [waiting, setWaiting] = useState(isWaitingForAd());
  useEffect(() => subscribeAdWaiting(setWaiting), []);
  return (
    <Modal visible={waiting} transparent animationType="fade" onRequestClose={cancelPendingAd}>
      <View style={styles.backdrop} accessibilityViewIsModal>
        <View style={styles.card} accessibilityLiveRegion="polite">
          <ActivityIndicator size="large" color="#fde68a" />
          <Text style={styles.label}>{t('ad_loading')}</Text>
          <Pressable style={styles.cancel} onPress={cancelPendingAd} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.cancelText}>{t('cancel')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  card: {
    minWidth: 200, alignItems: 'center', gap: 12, paddingVertical: 20, paddingHorizontal: 24,
    borderRadius: 16, backgroundColor: '#0f172a', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  label: { color: '#f8fafc', fontSize: 15, fontWeight: '700' },
  cancel: { paddingVertical: 6, paddingHorizontal: 14 },
  cancelText: { color: '#94a3b8', fontSize: 14, fontWeight: '700' },
});
