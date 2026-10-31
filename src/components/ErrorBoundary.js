import React, { Component } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { t } from '../data/i18n';

// Catches render errors in the wrapped subtree and shows a fallback UI
// instead of crashing the whole app. The user can reload the screen or
// navigate away via the floating nav (which lives outside the boundary).
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
  }

  reload = () => {
    this.setState({ error: null, errorInfo: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    const msg = String(this.state.error?.message || this.state.error || t('unknown_error'));

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.emoji}>⚠️</Text>
          <Text style={styles.title}>{t('something_went_wrong')}</Text>
          <Text style={styles.message}>{msg}</Text>
          <Pressable style={styles.button} onPress={this.reload}>
            <Text style={styles.buttonText}>{t('reload_screen')}</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0a0a0a',
  },
  content: {
    alignItems: 'center',
    gap: 12,
  },
  emoji: { fontSize: 56, marginBottom: 8 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  message: { color: '#94a3b8', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  button: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  buttonText: { color: '#0a0a0a', fontSize: 16, fontWeight: '800' },
});
