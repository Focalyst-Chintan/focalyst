#!/bin/bash

# Force macOS system paths to bypass sandbox limitations
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

echo "🧹 1/6: Trashing Xcode Derived Data Cache (The real culprit)..."
rm -rf ~/Library/Developer/Xcode/DerivedData

echo "🗑️ 2/6: Nuking node_modules, package-lock, and ios folder..."
rm -rf node_modules package-lock.json ios

echo "📦 3/6: Reinstalling base packages..."
npm install

echo "✅ 4/6: Ensuring expo-av is uninstalled..."
npm uninstall expo-av

echo "🏗️ 5/6: Prebuilding clean iOS directory..."
npx expo prebuild --platform ios --clean

echo "🔗 6/6: Installing fresh CocoaPods and Opening Xcode..."
cd ios && pod install && cd ..
open ios/*.xcworkspace
