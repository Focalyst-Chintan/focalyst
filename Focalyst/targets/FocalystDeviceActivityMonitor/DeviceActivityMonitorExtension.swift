import DeviceActivity
import Foundation
import ManagedSettings

/// Applies and removes shields on schedule even when Focalyst isn't running: session ends,
/// re-locks after temporary unlocks, and recurring blocks.
class DeviceActivityMonitorExtension: DeviceActivityMonitor {
  override func intervalDidStart(for activity: DeviceActivityName) {
    super.intervalDidStart(for: activity)
    let name = activity.rawValue

    // Unlock windows are registered with a start in the past; their start means nothing.
    if name == ShieldEngine.unlockActivity { return }

    if name.hasPrefix(ShieldEngine.schedulePrefix) {
      startScheduledBlock(activityName: name)
      return
    }

    if name == ShieldEngine.sessionActivity {
      let state = SharedStorage.session
      guard state.isActive, state.pausedAt == nil, state.unlockWindowEndTimestamp == nil else { return }
      ShieldEngine.apply(level: state.level)
    }
  }

  override func intervalDidEnd(for activity: DeviceActivityName) {
    super.intervalDidEnd(for: activity)
    let name = activity.rawValue

    if name == ShieldEngine.unlockActivity {
      // Only re-lock for the window that is actually ending (a newer one replaces the activity).
      let windowEnd = SharedStorage.session.unlockWindowEndTimestamp ?? 0
      if windowEnd > 0, windowEnd <= SharedStorage.nowMs() + 60_000 {
        ShieldEngine.relockIfSessionActive()
      }
      return
    }

    if name == ShieldEngine.sessionActivity || name.hasPrefix(ShieldEngine.schedulePrefix) {
      ShieldEngine.endSessionIfDue()
    }
  }

  /// "focalyst.sched.<id>.<weekday>": merge into any running session (stricter level, later end).
  private func startScheduledBlock(activityName: String) {
    let suffix = activityName.dropFirst(ShieldEngine.schedulePrefix.count)
    guard let dot = suffix.lastIndex(of: ".") else { return }
    let id = String(suffix[..<dot])
    guard let meta = SharedStorage.schedules[id] else { return }

    let calendar = Calendar.current
    let now = Date()
    var end = calendar.date(bySettingHour: meta.endHour, minute: meta.endMinute, second: 0, of: now) ?? now
    if end <= now { end = calendar.date(byAdding: .day, value: 1, to: end) ?? end }
    let endMs = end.timeIntervalSince1970 * 1000

    var state = SharedStorage.session
    if state.isActive && state.endTimestamp > SharedStorage.nowMs() {
      state.level = ShieldEngine.stricter(state.level, meta.level)
      state.endTimestamp = max(state.endTimestamp, endMs)
    } else {
      state = SessionState()
      state.sessionId = "sched:\(id)"
      state.isActive = true
      state.level = meta.level
      state.endTimestamp = endMs
      state.unlocksLeft = SessionState.unlockAllowance(for: meta.level)
      state.startedAt = SharedStorage.nowMs()
      SharedStorage.resetLog(sessionId: state.sessionId)
    }
    SharedStorage.session = state
    if state.unlockWindowEndTimestamp == nil {
      ShieldEngine.apply(level: state.level)
    }
  }
}
