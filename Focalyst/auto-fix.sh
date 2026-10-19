#!/bin/bash

# 1. Force macOS system paths to bypass sandbox limitations
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

echo "🧹 1/5: Killing hanging Metro servers & clearing cache (White Screen Fix)..."
lsof -i :8081 | awk 'NR>1 {print $2}' | xargs kill -9 || true
rm -rf .expo/cache
rm -rf node_modules/.cache/babel-loader
rm -rf node_modules/.cache/metro

echo "📦 2/5: Ensuring expo-av is uninstalled..."
npm uninstall expo-av

echo "🏗️ 3/5: Generating clean iOS build with Developer Credentials..."
npx expo prebuild --platform ios --clean

echo "🔗 4/5: Installing native CocoaPods (Voice Note Fix)..."
cd ios && pod install && cd ..

echo "🍏 5/5: Opening Xcode and rebuilding Simulator..."
open ios/*.xcworkspace
npx expo run:ios
