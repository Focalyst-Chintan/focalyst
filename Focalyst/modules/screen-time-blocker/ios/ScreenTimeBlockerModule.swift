import ExpoModulesCore
import FamilyControls
import ManagedSettings
import DeviceActivity
import UserNotifications

struct SessionPhaseRecord: Record {
  @Field var type: String = "focus"
  @Field var startAt: Double = 0
  @Field var endAt: Double = 0
}

struct StartSessionConfigRecord: Record {
  @Field var sessionId: String = ""
  @Field var level: String = "firm"
  @Field var endTimestamp: Double = 0
  @Field var unblockOnBreaks: Bool = false
  @Field var phases: [SessionPhaseRecord]? = nil
  /// Firm unlocks still available this session; JS tracks them across native restarts.
  @Field var unlocksLeft: Int? = nil
}

public class ScreenTimeBlockerModule: Module {
  private let quickStore = ManagedSettingsStore(named: ShieldEngine.legacyQuickStoreName)
  private let activityCenter = DeviceActivityCenter()

  private let sessionActivity = DeviceActivityName(ShieldEngine.sessionActivity)
  private let unlockActivity = DeviceActivityName(ShieldEngine.unlockActivity)
  private let quickActivity = DeviceActivityName("focalyst.quick")

  private static let unlockWarningId = "focalyst.unlock.warning"
  /// DeviceActivitySchedule rejects intervals under 15 minutes (`intervalTooShort`).
  private static let minimumScheduleInterval: TimeInterval = 15 * 60
  /// A shield tap older than this no longer targets one specific app.
  private static let pendingTokenMaxAgeMs: Double = 5 * 60_000

  private var relockWorkItem: DispatchWorkItem?

  public func definition() -> ModuleDefinition {
    Name("ScreenTimeBlocker")

    OnCreate {
      self.reconcile()
    }

    OnAppEntersForeground {
      self.reconcile()
    }

    // MARK: Authorization

    AsyncFunction("requestAuthorization") { () async -> String in
      #if targetEnvironment(simulator)
      // FamilyControls authorization is not supported on the iOS Simulator.
      return "denied"
      #else
      do {
        try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
      } catch {
        log.warn("[ScreenTimeBlocker] requestAuthorization failed: \(error.localizedDescription)")
      }
      return Self.authStatusString() == "approved" ? "approved" : "denied"
      #endif
    }

    AsyncFunction("getAuthorizationStatus") { () -> String in
      #if targetEnvironment(simulator)
      return "denied"
      #else
      return Self.authStatusString()
      #endif
    }

    // MARK: Selection

    AsyncFunction("openAppPicker") { (mode: String, promise: Promise) in
      PickerViewController.present(mode: SelectionMode(rawValue: mode) ?? .blocklist) { result in
        promise.resolve(result)
      }
    }
    .runOnQueue(.main)

    AsyncFunction("getSelectionSummary") { (mode: String) -> [String: Int] in
      PickerViewController.summary(of: SharedStorage.selection(SelectionMode(rawValue: mode) ?? .blocklist))
    }

    // MARK: Session blocking

    AsyncFunction("startSessionBlocking") { (config: StartSessionConfigRecord) -> Bool in
      let endDate = Date(timeIntervalSince1970: config.endTimestamp / 1000)
      guard endDate > Date() else { return false }

      self.cancelTemporaryUnlock()
      var state = SessionState()
      state.sessionId = config.sessionId
      state.isActive = true
      state.level = config.level
      state.endTimestamp = config.endTimestamp
      state.unblockOnBreaks = config.unblockOnBreaks
      state.unlocksLeft = config.unlocksLeft.map { max(0, $0) } ?? SessionState.unlockAllowance(for: config.level)
      state.startedAt = SharedStorage.nowMs()
      state.phases = (config.phases ?? []).map { PhasePlan(type: $0.type, startAt: $0.startAt, endAt: $0.endAt) }
      SharedStorage.session = state
      SharedStorage.resetLog(sessionId: config.sessionId)

      ShieldEngine.apply(level: config.level)
      self.scheduleActivity(self.sessionActivity, until: endDate)
      return true
    }

    AsyncFunction("pauseSessionBlocking") { () -> Bool in
      var state = SharedStorage.session
      guard state.isActive, state.pausedAt == nil else { return false }
      self.cancelTemporaryUnlock()
      state.pausedAt = SharedStorage.nowMs()
      state.unlockWindowEndTimestamp = nil
      SharedStorage.session = state
      ShieldEngine.sessionStore.clearAllSettings()
      SharedStorage.appendEvent(BlockingEvent(type: "phase", at: SharedStorage.nowMs(), phase: "break"))
      return true
    }

    AsyncFunction("resumeSessionBlocking") { () -> Bool in
      var state = SharedStorage.session
      guard state.isActive, state.pausedAt != nil else { return false }
      state.pausedAt = nil
      SharedStorage.session = state
      ShieldEngine.apply(level: state.level)
      SharedStorage.appendEvent(BlockingEvent(type: "phase", at: SharedStorage.nowMs(), phase: "focus"))
      return true
    }

    AsyncFunction("stopSessionBlocking") { () -> Bool in
      let state = SharedStorage.session
      guard state.isActive else { return false }
      if SharedStorage.nowMs() < state.endTimestamp {
        var current = SharedStorage.log
        current.interrupted = true
        SharedStorage.log = current
      }
      self.endSession()
      return true
    }

    // MARK: Temporary unlocks

    AsyncFunction("grantTemporaryUnlock") { (durationMinutes: Double, reason: String?) -> Bool in
      var state = SharedStorage.session
      guard state.isActive, state.pausedAt == nil, state.level != "locked" else { return false }
      if state.level == "firm" {
        guard state.unlocksLeft > 0 else { return false }
        state.unlocksLeft = max(0, state.unlocksLeft - 1)
      }

      let minutes = max(1, Int(durationMinutes.rounded()))
      let now = Date()
      let sessionEnd = Date(timeIntervalSince1970: state.endTimestamp / 1000)
      let windowEnd = min(now.addingTimeInterval(TimeInterval(minutes * 60)), sessionEnd)

      // From the shield's "Unblock in Focalyst" button: open just that app when we can.
      var pendingToken: ApplicationToken?
      if let request = SharedStorage.pendingUnlockRequest,
         SharedStorage.nowMs() - request.timestamp < Self.pendingTokenMaxAgeMs,
         let data = request.applicationTokenData {
        pendingToken = try? JSONDecoder().decode(ApplicationToken.self, from: data)
      } else if let data = state.pendingUnlockAppTokenData {
        pendingToken = try? JSONDecoder().decode(ApplicationToken.self, from: data)
      }
      ShieldEngine.openForUnlock(pendingToken: pendingToken)
      SharedStorage.pendingUnlockRequest = nil

      state.pendingUnlockAppTokenData = nil
      state.unlockWindowEndTimestamp = windowEnd.timeIntervalSince1970 * 1000
      SharedStorage.session = state

      var current = SharedStorage.log
      current.unlocksUsed += 1
      current.events.append(BlockingEvent(
        type: "unlock",
        at: SharedStorage.nowMs(),
        minuteIntoBlock: Self.minuteIntoBlock(state),
        reason: reason,
        minutes: minutes
      ))
      SharedStorage.log = current

      // The DeviceActivityMonitor extension re-locks at intervalDidEnd even if Focalyst is closed;
      // the in-process timer covers the app being open.
      self.scheduleActivity(self.unlockActivity, until: windowEnd)
      self.scheduleUnlockWarning(at: windowEnd)
      self.scheduleInProcessRelock(at: windowEnd)
      return true
    }

    AsyncFunction("lockTemporaryUnlockNow") { () -> Bool in
      let state = SharedStorage.session
      guard state.isActive, state.unlockWindowEndTimestamp != nil else { return false }
      self.cancelTemporaryUnlock()
      ShieldEngine.relockIfSessionActive()
      return true
    }

    AsyncFunction("getPendingUnlockRequest") { () -> [String: Any]? in
      guard let request = SharedStorage.pendingUnlockRequest else { return nil }
      return [
        "timestamp": request.timestamp,
        "level": request.level,
        "appName": request.appName ?? NSNull(),
      ]
    }

    AsyncFunction("clearPendingUnlockRequest") {
      SharedStorage.pendingUnlockRequest = nil
    }

    // MARK: Emergency unlock

    AsyncFunction("triggerEmergencyUnlock") { () -> Bool in
      guard SharedStorage.session.isActive, SharedStorage.canUseEmergencyToday() else { return false }
      SharedStorage.markEmergencyUsedToday()
      var current = SharedStorage.log
      current.emergencyUsed = true
      current.interrupted = true
      current.events.append(BlockingEvent(
        type: "emergency",
        at: SharedStorage.nowMs(),
        minuteIntoBlock: Self.minuteIntoBlock(SharedStorage.session)
      ))
      SharedStorage.log = current
      self.endSession()
      return true
    }

    AsyncFunction("canUseEmergencyUnlockToday") { () -> Bool in
      SharedStorage.canUseEmergencyToday()
    }

    // MARK: Quick block (legacy separate store; the app now runs quick blocks as sessions)

    AsyncFunction("startQuickBlock") { (endTimestamp: Double, level: String) -> Bool in
      let endDate = Date(timeIntervalSince1970: endTimestamp / 1000)
      guard endDate > Date() else { return false }
      SharedStorage.quickBlock = QuickBlockState(isActive: true, level: level, endTimestamp: endTimestamp)
      ShieldEngine.apply(to: self.quickStore, level: level)
      self.scheduleActivity(self.quickActivity, until: endDate)
      return true
    }

    AsyncFunction("stopQuickBlock") { () -> Bool in
      let wasActive = SharedStorage.quickBlock.isActive
      self.endQuickBlock()
      return wasActive
    }

    // MARK: Recurring blocks (enforced by the DeviceActivityMonitor extension)

    AsyncFunction(
      "scheduleRecurringBlock"
    ) { (id: String, startHour: Int, startMinute: Int, endHour: Int, endMinute: Int, repeatDays: [Int], level: String) -> Bool in
      self.registerSchedule(ScheduleMeta(
        id: id,
        startHour: startHour,
        startMinute: startMinute,
        endHour: endHour,
        endMinute: endMinute,
        repeatDays: repeatDays,
        level: level
      ))
    }

    AsyncFunction("cancelRecurringBlock") { (id: String) in
      self.unregisterSchedule(id)
    }

    // MARK: Telemetry

    AsyncFunction("getSessionTelemetry") { () -> [String: Any] in
      SharedStorage.logDictionary()
    }

    AsyncFunction("clearSessionTelemetry") {
      SharedStorage.clearLog()
    }

    // MARK: Views

    View(AppTokenLabelView.self) {
      Prop("tokenIndex") { (view: AppTokenLabelView, index: Int) in
        view.tokenIndex = index
      }
      Prop("mode") { (view: AppTokenLabelView, mode: String) in
        view.mode = SelectionMode(rawValue: mode) ?? .blocklist
      }
      Prop("size") { (view: AppTokenLabelView, size: Double) in
        view.setSize(size)
      }
      Prop("showTitle") { (view: AppTokenLabelView, show: Bool) in
        view.setShowTitle(show)
      }
      Prop("colorScheme") { (view: AppTokenLabelView, scheme: String?) in
        view.setColorScheme(scheme)
      }
    }
  }

  // MARK: - Authorization helpers

  /// Newer SDKs add approved variants (e.g. `.approvedWithDataAccess`), so anything that is
  /// neither denied nor undetermined counts as approved.
  private static func authStatusString() -> String {
    switch AuthorizationCenter.shared.authorizationStatus {
    case .notDetermined: return "notDetermined"
    case .denied: return "denied"
    default: return "approved"
    }
  }

  // MARK: - Sessions

  private func endSession() {
    cancelTemporaryUnlock()
    ShieldEngine.clearAll()
    stopActivities([sessionActivity])
    var state = SharedStorage.session
    state.isActive = false
    state.pausedAt = nil
    state.unlockWindowEndTimestamp = nil
    state.pendingUnlockAppTokenData = nil
    SharedStorage.session = state
  }

  private func endQuickBlock() {
    quickStore.clearAllSettings()
    stopActivities([quickActivity])
    SharedStorage.quickBlock = QuickBlockState()
  }

  /// Brings shields back in line with persisted state after the app was suspended or relaunched.
  private func reconcile() {
    let now = SharedStorage.nowMs()

    let state = SharedStorage.session
    if state.isActive {
      if now >= state.endTimestamp {
        endSession()
      } else if let windowEnd = state.unlockWindowEndTimestamp {
        if now >= windowEnd {
          cancelTemporaryUnlock()
          ShieldEngine.relockIfSessionActive()
        } else {
          scheduleInProcessRelock(at: Date(timeIntervalSince1970: windowEnd / 1000))
        }
      }
    }

    let quick = SharedStorage.quickBlock
    if quick.isActive && now >= quick.endTimestamp {
      endQuickBlock()
    }
  }

  // MARK: - Temporary unlock helpers

  private func scheduleInProcessRelock(at date: Date) {
    relockWorkItem?.cancel()
    let item = DispatchWorkItem { [weak self] in
      self?.reconcile()
    }
    relockWorkItem = item
    DispatchQueue.main.asyncAfter(deadline: .now() + max(0, date.timeIntervalSinceNow), execute: item)
  }

  private func cancelTemporaryUnlock() {
    relockWorkItem?.cancel()
    relockWorkItem = nil
    stopActivities([unlockActivity])
    UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [Self.unlockWarningId])
  }

  private func scheduleUnlockWarning(at windowEnd: Date) {
    let center = UNUserNotificationCenter.current()
    center.removePendingNotificationRequests(withIdentifiers: [Self.unlockWarningId])

    let fireIn = windowEnd.timeIntervalSinceNow - 30
    guard fireIn >= 1 else { return }

    let content = UNMutableNotificationContent()
    content.title = "Locks again in 30 seconds"
    content.body = "Wrap up. Your focus apps are about to be blocked again."
    content.sound = .default
    content.interruptionLevel = .timeSensitive

    let trigger = UNTimeIntervalNotificationTrigger(timeInterval: fireIn, repeats: false)
    center.add(UNNotificationRequest(identifier: Self.unlockWarningId, content: content, trigger: trigger)) { error in
      if let error {
        log.warn("[ScreenTimeBlocker] unlock warning not scheduled: \(error.localizedDescription)")
      }
    }
  }

  private static func minuteIntoBlock(_ state: SessionState) -> Int? {
    guard state.startedAt > 0 else { return nil }
    return Int((SharedStorage.nowMs() - state.startedAt) / 60_000)
  }

  // MARK: - Recurring blocks

  /// One DeviceActivity per weekday (or one daily / one-off). Returns false if iOS refused any.
  private func registerSchedule(_ meta: ScheduleMeta) -> Bool {
    unregisterSchedule(meta.id)
    var all = SharedStorage.schedules
    all[meta.id] = meta
    SharedStorage.schedules = all

    #if targetEnvironment(simulator)
    return false
    #else
    let overnight = meta.endHour * 60 + meta.endMinute <= meta.startHour * 60 + meta.startMinute
    var registrations: [(DeviceActivityName, DeviceActivitySchedule)] = []

    if meta.repeatDays.isEmpty || meta.repeatDays.count == 7 {
      // Daily repeat (or a one-off that runs at the next occurrence of these times).
      let schedule = DeviceActivitySchedule(
        intervalStart: DateComponents(hour: meta.startHour, minute: meta.startMinute),
        intervalEnd: DateComponents(hour: meta.endHour, minute: meta.endMinute),
        repeats: !meta.repeatDays.isEmpty
      )
      registrations.append((DeviceActivityName("\(ShieldEngine.schedulePrefix)\(meta.id).0"), schedule))
    } else {
      for weekday in meta.repeatDays {
        let endWeekday = overnight ? weekday % 7 + 1 : weekday
        let schedule = DeviceActivitySchedule(
          intervalStart: DateComponents(hour: meta.startHour, minute: meta.startMinute, weekday: weekday),
          intervalEnd: DateComponents(hour: meta.endHour, minute: meta.endMinute, weekday: endWeekday),
          repeats: true
        )
        registrations.append((DeviceActivityName("\(ShieldEngine.schedulePrefix)\(meta.id).\(weekday)"), schedule))
      }
    }

    var ok = true
    for (name, schedule) in registrations {
      do {
        try activityCenter.startMonitoring(name, during: schedule)
      } catch {
        ok = false
        log.warn("[ScreenTimeBlocker] schedule \(name.rawValue) not registered: \(error.localizedDescription)")
      }
    }
    return ok
    #endif
  }

  private func unregisterSchedule(_ id: String) {
    var all = SharedStorage.schedules
    all.removeValue(forKey: id)
    SharedStorage.schedules = all
    #if !targetEnvironment(simulator)
    let prefix = "\(ShieldEngine.schedulePrefix)\(id)."
    let names = activityCenter.activities.filter { $0.rawValue.hasPrefix(prefix) }
    if !names.isEmpty { activityCenter.stopMonitoring(names) }
    #endif
  }

  // MARK: - DeviceActivity

  /// Registers a one-off interval ending at `end` so the DeviceActivityMonitor extension can act
  /// while the app isn't running. Intervals shorter than 15 minutes start 15 minutes in the past,
  /// which keeps the schedule valid while `intervalDidEnd` still fires at `end`.
  private func scheduleActivity(_ name: DeviceActivityName, until end: Date) {
    #if targetEnvironment(simulator)
    return
    #else
    let now = Date()
    guard end > now else { return }
    let start = end.timeIntervalSince(now) < Self.minimumScheduleInterval
      ? now.addingTimeInterval(-Self.minimumScheduleInterval)
      : now

    let components: Set<Calendar.Component> = [.era, .year, .month, .day, .hour, .minute, .second]
    let calendar = Calendar.current
    let schedule = DeviceActivitySchedule(
      intervalStart: calendar.dateComponents(components, from: start),
      intervalEnd: calendar.dateComponents(components, from: end),
      repeats: false
    )

    activityCenter.stopMonitoring([name])
    do {
      try activityCenter.startMonitoring(name, during: schedule)
    } catch {
      log.warn("[ScreenTimeBlocker] startMonitoring(\(name.rawValue)) failed: \(error.localizedDescription)")
    }
    #endif
  }

  private func stopActivities(_ names: [DeviceActivityName]) {
    #if !targetEnvironment(simulator)
    activityCenter.stopMonitoring(names)
    #endif
  }
}
