const { withAndroidManifest } = require('expo/config-plugins');

const WIFI_FEATURE = 'android.hardware.wifi';

/**
 * Marks android.hardware.wifi as optional (required="false") so libraries that
 * declare ACCESS_WIFI_STATE (e.g. @react-native-community/netinfo) do not cause
 * Google Play to treat Wi-Fi hardware as a required device feature.
 */
const withOptionalWifiFeature = (config) => {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    const usesFeatures = (manifest['uses-feature'] ??= []);

    const existing = usesFeatures.find(
      (item) => item.$?.['android:name'] === WIFI_FEATURE
    );

    if (existing) {
      existing.$['android:required'] = 'false';
    } else {
      usesFeatures.push({
        $: {
          'android:name': WIFI_FEATURE,
          'android:required': 'false',
        },
      });
    }

    return mod;
  });
};

module.exports = withOptionalWifiFeature;
