import Foundation
import FamilyControls
import ManagedSettings

/// Shield logic shared by the main app module and the three Screen Time extensions, so a block
/// applied from the app, a DeviceActivity interval, or a re-lock after an unlock is identical.
enum ShieldEngine {
  static let sessionStoreName = ManagedSettingsStore.Name("focalyst.session")
  /// Earlier builds used a separate store for quick blocks; it's only ever cleared now.
  static let legacyQuickStoreName = ManagedSettingsStore.Name("focalyst.quick")

  static let sessionActivity = "focalyst.session"
  static let unlockActivity = "focalyst.unlockWindow"
  static let schedulePrefix = "focalyst.sched."

  static var sessionStore: ManagedSettingsStore { ManagedSettingsStore(named: sessionStoreName) }

  /// Blocklist minus Always Allowed. Categories use `except:` so allowed apps stay usable.
  static func apply(to store: ManagedSettingsStore = sessionStore, level: String) {
    #if targetEnvironment(simulator)
    return
    #else
    let blocked = SharedStorage.selection(.blocklist)
    let allowed = SharedStorage.selection(.allowed)

    let apps = blocked.applicationTokens.subtracting(allowed.applicationTokens)
    store.shield.applications = apps.isEmpty ? nil : apps
    store.shield.applicationCategories = blocked.categoryTokens.isEmpty
      ? nil
      : ShieldSettings.ActivityCategoryPolicy.specific(blocked.categoryTokens, except: allowed.applicationTokens)
    store.shield.webDomainCategories = blocked.categoryTokens.isEmpty
      ? nil
      : ShieldSettings.ActivityCategoryPolicy.specific(blocked.categoryTokens, except: allowed.webDomainTokens)
    store.shield.webDomains = blocked.webDomainTokens.isEmpty ? nil : blocked.webDomainTokens
    store.application.denyAppRemoval = level == "locked" ? true : nil
    #endif
  }

  /// Removes every Focalyst shield: the session store, the default store and the legacy quick store.
  static func clearAll() {
    #if !targetEnvironment(simulator)
    ManagedSettingsStore(named: sessionStoreName).clearAllSettings()
    ManagedSettingsStore(named: legacyQuickStoreName).clearAllSettings()
    ManagedSettingsStore().clearAllSettings()
    #endif
  }

  /// Opens apps for an unlock window. One app when the shield asked for a specific token and it
  /// isn't also covered by a blocked category; otherwise everything.
  static func openForUnlock(pendingToken: ApplicationToken?) {
    #if !targetEnvironment(simulator)
    let store = sessionStore
    let blockedCategories = !SharedStorage.selection(.blocklist).categoryTokens.isEmpty
    if let token = pendingToken, !blockedCategories, var shielded = store.shield.applications, shielded.contains(token) {
      shielded.remove(token)
      store.shield.applications = shielded.isEmpty ? nil : shielded
      return
    }
    store.shield.applications = nil
    store.shield.applicationCategories = nil
    store.shield.webDomains = nil
    store.shield.webDomainCategories = nil
    ManagedSettingsStore().clearAllSettings()
    ManagedSettingsStore(named: legacyQuickStoreName).clearAllSettings()
    #endif
  }

  /// Re-locks after an unlock window, if the session is still running and not paused.
  static func relockIfSessionActive() {
    var state = SharedStorage.session
    state.unlockWindowEndTimestamp = nil
    state.pendingUnlockAppTokenData = nil
    SharedStorage.session = state
    guard state.isActive, state.pausedAt == nil, SharedStorage.nowMs() < state.endTimestamp else { return }
    apply(level: state.level)
  }

  /// Ends the session's shields once its time is up. Leaves a newer, longer session alone.
  static func endSessionIfDue(graceMs: Double = 60_000) {
    var state = SharedStorage.session
    guard state.isActive, state.endTimestamp <= SharedStorage.nowMs() + graceMs else { return }
    clearAll()
    state.isActive = false
    state.unlockWindowEndTimestamp = nil
    state.pendingUnlockAppTokenData = nil
    SharedStorage.session = state
  }

  static func stricter(_ a: String, _ b: String) -> String {
    let rank = ["gentle": 0, "firm": 1, "locked": 2]
    return (rank[a] ?? 0) >= (rank[b] ?? 0) ? a : b
  }
}
