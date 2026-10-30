// Keeps Screen Time blocking intact across `expo prebuild` and EAS builds:
//  - the Family Controls + App Group entitlements on the app,
//  - the Screen Time usage description,
//  - the three Screen Time extensions (re-added from ./targets by scripts/add-ios-extensions.rb,
//    after every other mod has written the Xcode project).
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { withEntitlementsPlist, withFinalizedMod, withInfoPlist } = require('expo/config-plugins');

const FAMILY_CONTROLS = 'com.apple.developer.family-controls';
const APP_GROUPS = 'com.apple.security.application-groups';
const DEFAULT_USAGE =
  'Focalyst needs Screen Time access to lock distracting apps during your focus sessions.';

const withScreenTimeBlocker = (config, props = {}) => {
  const bundleId = config.ios?.bundleIdentifier ?? 'online.focalyst';
  const appGroup = props.appGroup ?? `group.${bundleId}`;

  config = withEntitlementsPlist(config, (mod) => {
    mod.modResults[FAMILY_CONTROLS] = true;
    const groups = new Set(mod.modResults[APP_GROUPS] ?? []);
    groups.add(appGroup);
    mod.modResults[APP_GROUPS] = [...groups];
    return mod;
  });

  config = withInfoPlist(config, (mod) => {
    mod.modResults.NSFamilyControlsUsageDescription ??= props.usageDescription ?? DEFAULT_USAGE;
    return mod;
  });

  config = withFinalizedMod(config, [
    'ios',
    (mod) => {
      const root = mod.modRequest.projectRoot;
      const script = path.join(root, 'scripts', 'add-ios-extensions.rb');
      if (!fs.existsSync(script) || !fs.existsSync(path.join(root, 'ios', 'Focalyst.xcodeproj'))) return mod;
      try {
        execFileSync('ruby', [script], { cwd: root, stdio: 'inherit' });
      } catch (e) {
        // Don't fail prebuild; the warning tells whoever runs it to add the extensions by hand.
        console.warn(`[withScreenTimeBlocker] Could not add Screen Time extensions: ${e.message}`);
      }
      return mod;
    },
  ]);

  return config;
};

module.exports = withScreenTimeBlocker;
