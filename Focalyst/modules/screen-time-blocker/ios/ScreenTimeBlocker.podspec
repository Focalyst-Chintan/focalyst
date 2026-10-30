Pod::Spec.new do |s|
  s.name           = 'ScreenTimeBlocker'
  s.version        = '1.0.0'
  s.summary        = 'Screen Time (FamilyControls) distraction blocking for Focalyst focus sessions.'
  s.description    = 'Local Expo module wrapping FamilyControls, ManagedSettings and DeviceActivity.'
  s.author         = 'Focalyst'
  s.homepage       = 'https://focalyst.online'
  s.license        = { :type => 'MIT' }
  s.platforms      = { :ios => '16.0' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.frameworks = ['FamilyControls', 'ManagedSettings', 'DeviceActivity', 'SwiftUI', 'UserNotifications']

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,swift}"
end
