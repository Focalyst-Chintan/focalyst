import Foundation
import FamilyControls
import ManagedSettings

// MARK: - Persisted models

enum SelectionMode: String {
  case blocklist
  case allowed
}

struct PhasePlan: Codable {
  var type: String
  var startAt: Double
  var endAt: Double
}

struct SessionState: Codable {
  var sessionId: String?
  var isActive: Bool = false
  var level: String = "firm"
  /// Epoch milliseconds.
  var endTimestamp: Double = 0
  var unblockOnBreaks: Bool = false
  var unlocksLeft: Int = 0
  /// Epoch milliseconds, nil when not paused.
  var pausedAt: Double?
  /// Epoch milliseconds, nil when no temporary unlock is running.
  var unlockWindowEndTimestamp: Double?
  /// Encoded `ApplicationToken` the shield extension asked to unlock, if any.
  var pendingUnlockAppTokenData: Data?
  var startedAt: Double = 0
  var phases: [PhasePlan] = []

  static func unlockAllowance(for level: String) -> Int {
    switch level {
    case "gentle": return Int.max
    case "firm": return 2
    default: return 0
    }
  }
}

struct QuickBlockState: Codable {
  var isActive: Bool = false
  var level: String = "firm"
  var endTimestamp: Double = 0
}

struct EmergencyLedger: Codable {
  /// Local calendar day, `YYYY-MM-DD`.
  var lastEmergencyDate: String?
}

struct BlockingEvent: Codable {
  var type: String
  var appId: String?
  var at: Double
  var minuteIntoBlock: Int?
  var reason: String?
  var minutes: Int?
  var phase: String?
}

/// Written by the shield's secondary button; the app opens the unlock flow when it sees one.
struct PendingUnlockRequest: Codable {
  var timestamp: Double
  var level: String
  var appName: String?
  /// JSON-encoded `ApplicationToken`, when the shield was over an app.
  var applicationTokenData: Data?
  var webDomainTokenData: Data?
}

/// A recurring (or one-off) block the DeviceActivityMonitor extension enforces on its own.
struct ScheduleMeta: Codable {
  var id: String
  var startHour: Int
  var startMinute: Int
  var endHour: Int
  var endMinute: Int
  /// Calendar weekdays, 1 = Sunday through 7 = Saturday. Empty means one-off.
  var repeatDays: [Int]
  var level: String
}

struct SessionBlockingLog: Codable {
  var sessionId: String?
  var attemptsCount: Int = 0
  var unlocksUsed: Int = 0
  var emergencyUsed: Bool = false
  var interrupted: Bool = false
  var events: [BlockingEvent] = []
  var attemptsByApp: [String: Int] = [:]
}

// MARK: - Storage

/// App Group backed storage shared between the main app and any future
/// Screen Time extensions (shield configuration/action, device activity monitor).
enum SharedStorage {
  private enum Key {
    static let blocklistSelection = "stb.selection.blocklist"
    static let allowedSelection = "stb.selection.allowed"
    static let session = "stb.session"
    static let quickBlock = "stb.quickBlock"
    static let emergency = "stb.emergencyLedger"
    static let log = "stb.sessionLog"
    static let pendingUnlock = "stb.pendingUnlockRequest"
    static let schedules = "stb.schedules"
  }

  /// `group.<main app bundle id>`. Inside an app extension (`.appex`) the bundle id is
  /// `<main app bundle id>.<ExtensionName>`, so the last component is stripped to land on the same suite.
  static let appGroupId: String = {
    var bundleId = Bundle.main.bundleIdentifier ?? "online.focalyst"
    if Bundle.main.bundleURL.pathExtension == "appex",
       let lastDot = bundleId.lastIndex(of: ".") {
      bundleId = String(bundleId[..<lastDot])
    }
    return "group.\(bundleId)"
  }()

  static let defaults: UserDefaults = UserDefaults(suiteName: appGroupId) ?? .standard

  // MARK: Selections

  static func selection(_ mode: SelectionMode) -> FamilyActivitySelection {
    guard let data = defaults.data(forKey: selectionKey(mode)),
          let selection = try? PropertyListDecoder().decode(FamilyActivitySelection.self, from: data)
    else { return FamilyActivitySelection() }
    return selection
  }

  static func saveSelection(_ selection: FamilyActivitySelection, mode: SelectionMode) {
    guard let data = try? PropertyListEncoder().encode(selection) else { return }
    defaults.set(data, forKey: selectionKey(mode))
  }

  /// Application tokens in a stable order (Set iteration order changes between launches),
  /// so `tokenIndex` on the JS side always points at the same app.
  static func orderedApplicationTokens(_ mode: SelectionMode) -> [ApplicationToken] {
    let encoder = JSONEncoder()
    return selection(mode).applicationTokens
      .map { token in (token, (try? encoder.encode(token))?.base64EncodedString() ?? "") }
      .sorted { $0.1 < $1.1 }
      .map(\.0)
  }

  private static func selectionKey(_ mode: SelectionMode) -> String {
    mode == .allowed ? Key.allowedSelection : Key.blocklistSelection
  }

  // MARK: Session state

  static var session: SessionState {
    get { read(Key.session) ?? SessionState() }
    set {
      write(newValue, Key.session)
      writeShieldSnapshot(newValue)
    }
  }

  /// Flat keys the shield extension reads, mirrored on every session write so it always sees live values.
  enum ShieldKey {
    static let level = "focalyst_active_level"
    static let endTimestampMs = "focalyst_end_timestamp_ms"
    static let unlocksLeft = "focalyst_unlocks_left"
    static let sessionStartMs = "focalyst_session_start_ms"
  }

  private static func writeShieldSnapshot(_ state: SessionState) {
    defaults.set(state.level, forKey: ShieldKey.level)
    defaults.set(state.endTimestamp, forKey: ShieldKey.endTimestampMs)
    // Gentle's allowance is Int.max; the shield only needs "some left".
    defaults.set(min(state.unlocksLeft, 99), forKey: ShieldKey.unlocksLeft)
    defaults.set(state.startedAt, forKey: ShieldKey.sessionStartMs)
  }

  static var quickBlock: QuickBlockState {
    get { read(Key.quickBlock) ?? QuickBlockState() }
    set { write(newValue, Key.quickBlock) }
  }

  static func clearSession() {
    defaults.removeObject(forKey: Key.session)
  }

  // MARK: Emergency ledger

  static var emergencyLedger: EmergencyLedger {
    get { read(Key.emergency) ?? EmergencyLedger() }
    set { write(newValue, Key.emergency) }
  }

  /// Resets implicitly at local midnight because the comparison is by local calendar day.
  static func canUseEmergencyToday() -> Bool {
    emergencyLedger.lastEmergencyDate != localDayString()
  }

  static func markEmergencyUsedToday() {
    emergencyLedger = EmergencyLedger(lastEmergencyDate: localDayString())
  }

  static func localDayString(_ date: Date = Date()) -> String {
    let formatter = DateFormatter()
    formatter.calendar = Calendar(identifier: .gregorian)
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.timeZone = .current
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter.string(from: date)
  }

  // MARK: Pending unlock request (shield action → app)

  static var pendingUnlockRequest: PendingUnlockRequest? {
    get { read(Key.pendingUnlock) }
    set {
      if let newValue { write(newValue, Key.pendingUnlock) } else { defaults.removeObject(forKey: Key.pendingUnlock) }
    }
  }

  // MARK: Schedules (app → DeviceActivityMonitor)

  static var schedules: [String: ScheduleMeta] {
    get { read(Key.schedules) ?? [:] }
    set { write(newValue, Key.schedules) }
  }

  // MARK: Telemetry log

  static var log: SessionBlockingLog {
    get { read(Key.log) ?? SessionBlockingLog() }
    set { write(newValue, Key.log) }
  }

  static func resetLog(sessionId: String?) {
    log = SessionBlockingLog(sessionId: sessionId)
  }

  static func clearLog() {
    defaults.removeObject(forKey: Key.log)
  }

  static func appendEvent(_ event: BlockingEvent) {
    var current = log
    current.events.append(event)
    log = current
  }

  /// Intended for the shield action extension when a user taps a blocked app.
  static func recordAttempt(appId: String?) {
    var current = log
    let now = nowMs()
    current.attemptsCount += 1
    if let appId {
      current.attemptsByApp[appId, default: 0] += 1
    }
    let started = session.startedAt
    let minute = started > 0 ? Int((now - started) / 60_000) : nil
    current.events.append(BlockingEvent(type: "attempt", appId: appId, at: now, minuteIntoBlock: minute))
    log = current
  }

  static func logDictionary() -> [String: Any] {
    guard let data = try? JSONEncoder().encode(log),
          let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    else {
      return [
        "sessionId": NSNull(), "attemptsCount": 0, "unlocksUsed": 0, "emergencyUsed": false,
        "interrupted": false, "events": [], "attemptsByApp": [:]
      ]
    }
    var result = object
    // JSONEncoder omits nil optionals; JS expects an explicit null.
    if result["sessionId"] == nil { result["sessionId"] = NSNull() }
    return result
  }

  // MARK: Helpers

  static func nowMs() -> Double {
    Date().timeIntervalSince1970 * 1000
  }

  private static func read<T: Decodable>(_ key: String) -> T? {
    guard let data = defaults.data(forKey: key) else { return nil }
    return try? JSONDecoder().decode(T.self, from: data)
  }

  private static func write<T: Encodable>(_ value: T, _ key: String) {
    guard let data = try? JSONEncoder().encode(value) else { return }
    defaults.set(data, forKey: key)
  }
}
