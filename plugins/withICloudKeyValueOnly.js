// react-native-cloud-store's config plugin always adds the iCloud Documents
// entitlements (icloud-services: CloudDocuments plus empty container lists),
// even when only key-value storage is enabled. Void Business only uses
// iCloud key-value storage, so strip the Documents entries and keep
// com.apple.developer.ubiquity-kvstore-identifier.
// Must be listed BEFORE react-native-cloud-store in app.json plugins: mods
// run in reverse order, so this one then runs after the library's.
const { withEntitlementsPlist } = require('@expo/config-plugins');

const DOCUMENTS_KEYS = [
  'com.apple.developer.icloud-services',
  'com.apple.developer.icloud-container-identifiers',
  'com.apple.developer.ubiquity-container-identifiers',
  'com.apple.developer.icloud-container-environment',
];

module.exports = function withICloudKeyValueOnly(config) {
  return withEntitlementsPlist(config, (cfg) => {
    for (const key of DOCUMENTS_KEYS) delete cfg.modResults[key];
    return cfg;
  });
};
