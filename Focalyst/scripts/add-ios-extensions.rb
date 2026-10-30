#!/usr/bin/env ruby
# Adds Focalyst's three Screen Time app extensions to ios/Focalyst.xcodeproj.
#
# `npx expo prebuild` regenerates ios/, so the extension sources live in ../targets and this
# script is safe to re-run after every prebuild:  ruby scripts/add-ios-extensions.rb
require 'json'
require 'xcodeproj'

ROOT = File.expand_path('..', __dir__)
PROJECT_PATH = File.join(ROOT, 'ios', 'Focalyst.xcodeproj')
MAIN_BUNDLE_ID = 'online.focalyst'
# Extensions can target lower than the app; the app stays at 16.4 because Expo SDK 57 pods require it.
DEPLOYMENT_TARGET = '16.0'
SHARED_SOURCES = %w[SharedStorage.swift ShieldEngine.swift].freeze

EXTENSIONS = [
  { name: 'FocalystShieldConfiguration', suffix: 'ShieldConfiguration', source: 'ShieldConfigurationExtension.swift' },
  { name: 'FocalystShieldAction', suffix: 'ShieldAction', source: 'ShieldActionExtension.swift' },
  { name: 'FocalystDeviceActivityMonitor', suffix: 'DeviceActivityMonitor', source: 'DeviceActivityMonitorExtension.swift' },
].freeze

project = Xcodeproj::Project.open(PROJECT_PATH)
main = project.targets.find { |t| t.name == 'Focalyst' } or abort('Focalyst target not found')

main_settings = main.build_configurations.map(&:build_settings)
team = main_settings.map { |s| s['DEVELOPMENT_TEAM'] }.compact.first or abort('No DEVELOPMENT_TEAM on Focalyst')
# app.json is the source of truth: every embedded extension must match the app's version and build
# exactly, or App Store Connect rejects the upload (ITMS-90473).
expo = JSON.parse(File.read(File.join(ROOT, 'app.json')))['expo']
marketing = expo['version'] or abort('app.json has no expo.version')
build_number = expo.dig('ios', 'buildNumber') or abort('app.json has no expo.ios.buildNumber')

embed = main.copy_files_build_phases.find { |p| p.dst_subfolder_spec == '13' }
unless embed
  embed = main.new_copy_files_build_phase('Embed Foundation Extensions')
  embed.dst_subfolder_spec = '13'
end
# '1' would skip copying the .appex files in Debug device builds, leaving iOS's default shield.
embed.run_only_for_deployment_postprocessing = '0'

# Shared native code compiled into every extension (the pod compiles its own copy for the app).
shared_group = project.main_group['FocalystShared'] || project.main_group.new_group('FocalystShared', '../modules/screen-time-blocker/ios')
shared_refs = SHARED_SOURCES.map { |f| shared_group.files.find { |r| r.path == f } || shared_group.new_file(f) }

EXTENSIONS.each do |ext|
  name = ext[:name]

  # Re-running replaces the target cleanly.
  if (old = project.targets.find { |t| t.name == name })
    embed.files.select { |bf| bf.file_ref == old.product_reference }.each(&:remove_from_project)
    main.dependencies.select { |d| d.target == old }.each(&:remove_from_project)
    old.product_reference&.remove_from_project
    old.remove_from_project
  end
  project.main_group[name]&.remove_from_project

  group = project.main_group.new_group(name, "../targets/#{name}")
  source_ref = group.new_file(ext[:source])
  group.new_file('Info.plist')
  group.new_file("#{name}.entitlements")

  target = project.new_target(:app_extension, name, :ios, DEPLOYMENT_TARGET, nil, :swift)
  target.add_file_references([source_ref, *shared_refs])

  target.build_configurations.each do |config|
    s = config.build_settings
    s['PRODUCT_NAME'] = '$(TARGET_NAME)'
    # Info.plist resolves the principal class as $(PRODUCT_MODULE_NAME).<Class>.
    s['PRODUCT_MODULE_NAME'] = name
    s['DEFINES_MODULE'] = 'YES'
    s['PRODUCT_BUNDLE_IDENTIFIER'] = "#{MAIN_BUNDLE_ID}.#{ext[:suffix]}"
    s['INFOPLIST_FILE'] = "$(SRCROOT)/../targets/#{name}/Info.plist"
    s['GENERATE_INFOPLIST_FILE'] = 'NO'
    s['CODE_SIGN_ENTITLEMENTS'] = "$(SRCROOT)/../targets/#{name}/#{name}.entitlements"
    s['DEVELOPMENT_TEAM'] = team
    s['CODE_SIGN_STYLE'] = 'Automatic'
    s['IPHONEOS_DEPLOYMENT_TARGET'] = DEPLOYMENT_TARGET
    s['SWIFT_VERSION'] = '5.0'
    s['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
    s['TARGETED_DEVICE_FAMILY'] = '1'
    s['SKIP_INSTALL'] = 'YES'
    s['APPLICATION_EXTENSION_API_ONLY'] = 'YES'
    s['MARKETING_VERSION'] = marketing
    s['CURRENT_PROJECT_VERSION'] = build_number
    s['LD_RUNPATH_SEARCH_PATHS'] = ['$(inherited)', '@executable_path/Frameworks', '@executable_path/../../Frameworks']
    s['SWIFT_OPTIMIZATION_LEVEL'] = config.name == 'Release' ? '-O' : '-Onone'
  end

  embed.add_file_reference(target.product_reference, true).settings = { 'ATTRIBUTES' => %w[RemoveHeadersOnCopy CodeSignOnCopy] }
  main.add_dependency(target)
  puts "Added #{name} (#{MAIN_BUNDLE_ID}.#{ext[:suffix]}), team #{team}"
end

# Keep the app and every other target (widgets included) on the same version and build.
project.targets.each do |t|
  t.build_configurations.each do |config|
    config.build_settings['MARKETING_VERSION'] = marketing
    config.build_settings['CURRENT_PROJECT_VERSION'] = build_number
  end
end
%w[Focalyst/Info.plist ExpoWidgetsTarget/Info.plist].each do |rel|
  plist = File.join(ROOT, 'ios', rel)
  next unless File.exist?(plist)
  system('/usr/libexec/PlistBuddy', '-c', "Set :CFBundleShortVersionString #{marketing}", plist, exception: true)
  system('/usr/libexec/PlistBuddy', '-c', "Set :CFBundleVersion #{build_number}", plist, exception: true)
end
puts "All targets set to #{marketing} (#{build_number})"

project.save
puts 'Saved ios/Focalyst.xcodeproj'
