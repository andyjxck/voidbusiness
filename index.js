// Must run before App (and every screen module) so module-scope
// Dimensions.get('window') reads see the web content column.
import './src/data/webDims';
import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
