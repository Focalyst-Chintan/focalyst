const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// The web onboarding reference is for reading only: never bundle it.
const referenceDir = /[\\/]reference[\\/]web-onboarding[\\/].*/;
const blockList = config.resolver.blockList;
config.resolver.blockList = Array.isArray(blockList)
  ? [...blockList, referenceDir]
  : blockList
    ? [blockList, referenceDir]
    : [referenceDir];

module.exports = withNativeWind(config, { input: "./global.css" });
