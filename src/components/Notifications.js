import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import Text from './AppText';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../data/hapticsProxy';
import { isReducedMotion } from '../data/settings';

// App-wide toast notifications. The provider sits above every screen so
// auction results and deliveries can surface no matter where the player is.

const NotificationContext = createContext({ notify: () => {} });

export function useNotify() {
  return useContext(NotificationContext).notify;
}

const TONE = {
  win: { icon: 'trophy', color: '#34d399' },
  loss: { icon: 'close-circle', color: '#f87171' },
  outbid: { icon: 'hammer', color: '#f97316' },
  info: { icon: 'information-circle', color: '#38bdf8' },
  delivery: { icon: 'cube', color: '#a78bfa' },
  estate: { icon: 'business', color: '#fbbf24' },
};

export function NotificationProvider({ children }) {
  const [items, setItems] = useState([]);
  const idRef = useRef(0);

  const notify = useCallback((title, message, tone = 'info') => {
    const id = idRef.current++;
    setItems((prev) => [{ id, title, message, tone }, ...prev].slice(0, 2));
    if (tone === 'win') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (tone === 'loss' || tone === 'outbid') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, []);

  const dismiss = useCallback((id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <View style={styles.host} pointerEvents="box-none">
        {items.map((item) => (
          <Toast key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
        ))}
      </View>
    </NotificationContext.Provider>
  );
}

function Toast({ item, onDismiss }) {
  const anim = useRef(new Animated.Value(0)).current;
  const tone = TONE[item.tone] || TONE.info;

  useEffect(() => {
    if (isReducedMotion()) {
      anim.setValue(1);
      const timer = setTimeout(() => onDismiss(), 4200);
      return () => clearTimeout(timer);
    }
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 9,
      tension: 70,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(anim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onDismiss();
      });
    }, 4200);

    return () => clearTimeout(timer);
  }, [anim, onDismiss]);

  return (
    <Animated.View
      style={[
        styles.toast,
        { borderColor: `${tone.color}55` },
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }),
            },
          ],
        },
      ]}
    >
      <Pressable style={styles.toastInner} onPress={onDismiss}>
        <View style={[styles.iconWrap, { backgroundColor: `${tone.color}22` }]}>
          <Ionicons name={tone.icon} size={17} color={tone.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: tone.color }]}>{item.title}</Text>
          <Text style={styles.message}>{item.message}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    zIndex: 900,
    gap: 8,
    paddingHorizontal: 14,
  },
  toast: {
    backgroundColor: 'rgba(15,15,18,0.96)',
    borderRadius: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 18,
        shadowOpacity: 0.45,
      },
      android: { elevation: 14 },
    }),
  },
  toastInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 13,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: -0.1,
  },
  message: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 16,
  },
});
