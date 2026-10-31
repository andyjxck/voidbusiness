// Native (iOS/Android): no chrome - the floating nav bar is the whole UI.
// Metro picks AppShell.web.js on web builds, which adds a desktop sidebar.
import React from 'react';

export default function AppShell({ children }) {
  return <>{children}</>;
}
