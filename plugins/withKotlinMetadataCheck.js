const { withProjectBuildGradle } = require('expo/config-plugins');

// play-services-ads (bundled by react-native-google-mobile-ads) is compiled
// with a newer Kotlin than RN ships, which breaks compileReleaseKotlin with
// "incompatible version of Kotlin metadata". Skipping the check is the
// standard workaround - the bytecode is compatible.
const SNIPPET = `
subprojects { sub ->
  sub.plugins.withId('kotlin-android') {
    sub.tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
      kotlinOptions.freeCompilerArgs += ['-Xskip-metadata-version-check']
    }
  }
}
`;

module.exports = function withKotlinMetadataCheck(config) {
  return withProjectBuildGradle(config, (c) => {
    if (!c.modResults.contents.includes('skip-metadata-version-check')) {
      c.modResults.contents += SNIPPET;
    }
    return c;
  });
};
