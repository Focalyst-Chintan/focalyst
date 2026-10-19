#!/bin/bash

# Force macOS system paths
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

echo "🚨 1/4: Uninstalling expo-av..."
npm uninstall expo-av

echo "🗑️ 3/4: Nuking corrupted iOS folder to force a clean slate..."
rm -rf ios

echo "🏗️ 4/4: Prebuilding, Podding, and Compiling..."
npx expo prebuild --platform ios
cd ios && pod install && cd ..

echo "🍏 Launching Simulator and Opening Xcode..."
npx expo run:ios &
sleep 5
open ios/*.xcworkspace
