// Native (iOS/Android): no chrome - the floating nav bar is the whole UI.
// Metro picks AppShell.web.js on web builds, which adds a desktop sidebar.
// On iPad the game runs in a centered column (TABLET_MAX_CONTENT_WIDTH) so
// phone-shaped cards and grids don't stretch edge to edge; the background
// gradient behind it still fills the screen.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { IS_TABLET, TABLET_MAX_CONTENT_WIDTH } from '../data/layout';

export default function AppShell({ children }) {
  if (!IS_TABLET) return <>{children}</>;
  return <View style={styles.tabletColumn}>{children}</View>;
}

const styles = StyleSheet.create({
  tabletColumn: {
    flex: 1,
    width: '100%',
    maxWidth: TABLET_MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
});
