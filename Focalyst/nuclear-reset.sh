#!/bin/bash

# Force macOS system paths
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

echo "🛑 1/7: Force-closing Xcode to unlock cache files..."
killall Xcode || true

echo "🧹 2/7: Nuking DerivedData, node_modules, and ios folder..."
rm -rf ~/Library/Developer/Xcode/DerivedData
rm -rf node_modules package-lock.json ios

echo "📦 3/7: Reinstalling base packages..."
npm install

echo "🔧 4/7: Forcing Expo to align all dependency versions..."
npx expo install --fix

echo "🏗️ 5/7: Prebuilding clean iOS directory..."
npx expo prebuild --platform ios --clean

echo "🔗 6/7: Purging global Pod cache and installing fresh Pods..."
cd ios
pod cache clean --all
pod install
cd ..

echo "🍏 7/7: Opening Xcode and launching Simulator..."
open ios/*.xcworkspace
npx expo run:ios
