package expo.modules.screentimeblocker

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Single source of truth for Android blocking state, shared by the Expo module, the
 * accessibility service, the foreground service, the shield and the boot receiver (all in-process).
 * Read-modify-write operations hold [lock] so the 1-second ticker and accessibility events can't race.
 */
object BlockerSharedPrefs {
  const val PREFS_NAME = "focalyst_blocker_prefs"
  const val FIRM_UNLOCKS_PER_SESSION = 2
  /** A shield tap older than this no longer targets one specific app. */
  const val PENDING_UNLOCK_MAX_AGE_MS = 5 * 60_000L

  private object Key {
    const val blockedPackages = "blockedPackages"
    const val allowedPackages = "allowedPackages"

    const val sessionId = "sessionId"
    const val isSessionActive = "isSessionActive"
    const val strictnessLevel = "strictnessLevel"
    const val sessionStartedAt = "sessionStartedAt"
    const val sessionEndTimestamp = "sessionEndTimestamp"
    const val phaseEndTimestamp = "phaseEndTimestamp"
    const val phases = "phases"
    const val unblockOnBreaks = "unblockOnBreaks"
    const val isBreakPhase = "isBreakPhase"
    const val firmUnlocksRemaining = "firmUnlocksRemaining"
    const val pausedAt = "pausedAt"
    const val permissionLost = "permissionLost"

    const val quickActive = "quickActive"
    const val quickLevel = "quickLevel"
    const val quickEndTimestamp = "quickEndTimestamp"

    const val tempUnlockedPackages = "tempUnlockedPackages"
    const val tempUnlockWarned = "tempUnlockWarned"

    const val lastEmergencyDate = "lastEmergencyDate"
    const val log = "sessionBlockingLog"

    const val pendingUnlockPackage = "pendingUnlockPackage"
    const val pendingUnlockLabel = "pendingUnlockLabel"
    const val pendingUnlockLevel = "pendingUnlockLevel"
    const val pendingUnlockTimestamp = "pendingUnlockTimestamp"
    /** Survives `clearPendingUnlockRequest` so the unlock flow can still open the right app. */
    const val unlockTargetPackage = "unlockTargetPackage"
    const val unlockTargetTimestamp = "unlockTargetTimestamp"
  }

  private val lock = Any()

  @Volatile
  private var cachedPrefs: SharedPreferences? = null

  private fun prefs(context: Context): SharedPreferences =
    cachedPrefs ?: synchronized(lock) {
      cachedPrefs ?: context.applicationContext
        .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        .also { cachedPrefs = it }
    }

  // MARK: Models

  data class Phase(val type: String, val startAt: Long, val endAt: Long)

  data class Session(
    val sessionId: String?,
    val isSessionActive: Boolean,
    val strictnessLevel: String,
    val sessionStartedAt: Long,
    val sessionEndTimestamp: Long,
    val phaseEndTimestamp: Long,
    val phases: List<Phase>,
    val unblockOnBreaks: Boolean,
    val isBreakPhase: Boolean,
    val firmUnlocksRemaining: Int,
    /** Epoch ms, 0 when not paused. */
    val pausedAt: Long,
    val permissionLost: Boolean,
  ) {
    val isPausedOpen: Boolean get() = pausedAt > 0L

    /** When the current block lets apps through again: the break if breaks unblock, else the session end. */
    val opensAt: Long get() = if (unblockOnBreaks) phaseEndTimestamp else sessionEndTimestamp
  }

  /** What is being enforced right now, from a session or a quick block. */
  data class Enforcement(val level: String, val opensAt: Long, val unlocksLeft: Int, val fromSession: Boolean)

  data class PendingUnlock(val packageName: String?, val appLabel: String?, val level: String, val timestamp: Long)

  // MARK: Selections

  fun blockedPackages(context: Context): Set<String> =
    prefs(context).getStringSet(Key.blockedPackages, emptySet())?.toSet() ?: emptySet()

  fun allowedPackages(context: Context): Set<String> =
    prefs(context).getStringSet(Key.allowedPackages, emptySet())?.toSet() ?: emptySet()

  fun setBlockedPackages(context: Context, packages: Collection<String>) {
    prefs(context).edit().putStringSet(Key.blockedPackages, packages.toSet()).apply()
  }

  fun setAllowedPackages(context: Context, packages: Collection<String>) {
    prefs(context).edit().putStringSet(Key.allowedPackages, packages.toSet()).apply()
  }

  // MARK: Session

  fun session(context: Context): Session {
    val p = prefs(context)
    return Session(
      sessionId = p.getString(Key.sessionId, null),
      isSessionActive = p.getBoolean(Key.isSessionActive, false),
      strictnessLevel = p.getString(Key.strictnessLevel, "firm") ?: "firm",
      sessionStartedAt = p.getLong(Key.sessionStartedAt, 0L),
      sessionEndTimestamp = p.getLong(Key.sessionEndTimestamp, 0L),
      phaseEndTimestamp = p.getLong(Key.phaseEndTimestamp, 0L),
      phases = decodePhases(p.getString(Key.phases, null)),
      unblockOnBreaks = p.getBoolean(Key.unblockOnBreaks, false),
      isBreakPhase = p.getBoolean(Key.isBreakPhase, false),
      firmUnlocksRemaining = p.getInt(Key.firmUnlocksRemaining, 0),
      pausedAt = p.getLong(Key.pausedAt, 0L),
      permissionLost = p.getBoolean(Key.permissionLost, false),
    )
  }

  fun startSession(
    context: Context,
    sessionId: String,
    level: String,
    endTimestamp: Long,
    unblockOnBreaks: Boolean,
    phases: List<Phase>,
    unlocksLeft: Int?,
  ) = synchronized(lock) {
    val now = System.currentTimeMillis()
    val (phaseEnd, isBreak) = resolvePhase(phases, now, endTimestamp, unblockOnBreaks)
    prefs(context).edit()
      .putString(Key.sessionId, sessionId)
      .putBoolean(Key.isSessionActive, true)
      .putString(Key.strictnessLevel, level)
      .putLong(Key.sessionStartedAt, now)
      .putLong(Key.sessionEndTimestamp, endTimestamp)
      .putLong(Key.phaseEndTimestamp, phaseEnd)
      .putString(Key.phases, encodePhases(phases))
      .putBoolean(Key.unblockOnBreaks, unblockOnBreaks)
      .putBoolean(Key.isBreakPhase, isBreak)
      .putInt(Key.firmUnlocksRemaining, unlocksLeft?.coerceAtLeast(0) ?: unlockAllowance(level))
      .putLong(Key.pausedAt, 0L)
      .putBoolean(Key.permissionLost, false)
      .remove(Key.tempUnlockedPackages)
      .remove(Key.tempUnlockWarned)
      .remove(Key.unlockTargetPackage)
      .remove(Key.unlockTargetTimestamp)
      .apply()
    resetLog(context, sessionId)
  }

  fun endSession(context: Context) = synchronized(lock) {
    prefs(context).edit()
      .putBoolean(Key.isSessionActive, false)
      .putBoolean(Key.isBreakPhase, false)
      .putLong(Key.pausedAt, 0L)
      .remove(Key.tempUnlockedPackages)
      .remove(Key.tempUnlockWarned)
      .remove(Key.unlockTargetPackage)
      .remove(Key.unlockTargetTimestamp)
      .apply()
  }

  fun setPaused(context: Context, paused: Boolean) = synchronized(lock) {
    val edit = prefs(context).edit().putLong(Key.pausedAt, if (paused) System.currentTimeMillis() else 0L)
    if (paused) edit.remove(Key.tempUnlockedPackages).remove(Key.tempUnlockWarned)
    edit.apply()
  }

  fun setPermissionLost(context: Context, lost: Boolean) {
    prefs(context).edit().putBoolean(Key.permissionLost, lost).apply()
  }

  fun setFirmUnlocksRemaining(context: Context, value: Int) {
    prefs(context).edit().putInt(Key.firmUnlocksRemaining, value.coerceAtLeast(0)).apply()
  }

  /**
   * Moves to the next planned phase (or ends the session) once [Session.phaseEndTimestamp] passes,
   * and expires a finished quick block. Returns true when anything changed.
   */
  fun advanceIfNeeded(context: Context, now: Long = System.currentTimeMillis()): Boolean = synchronized(lock) {
    var changed = false
    val s = session(context)
    if (s.isSessionActive && now >= s.phaseEndTimestamp) {
      changed = true
      if (now >= s.sessionEndTimestamp) {
        endSession(context)
      } else {
        val (phaseEnd, isBreak) = resolvePhase(s.phases, now, s.sessionEndTimestamp, s.unblockOnBreaks)
        val edit = prefs(context).edit()
          .putLong(Key.phaseEndTimestamp, phaseEnd)
          .putBoolean(Key.isBreakPhase, isBreak)
        if (isBreak) edit.remove(Key.tempUnlockedPackages).remove(Key.tempUnlockWarned)
        edit.apply()
        appendEvent(context, JSONObject().put("type", "phase").put("at", now).put("phase", if (isBreak) "break" else "focus"))
      }
    }
    val p = prefs(context)
    if (p.getBoolean(Key.quickActive, false) && now >= p.getLong(Key.quickEndTimestamp, 0L)) {
      changed = true
      stopQuickBlock(context)
    }
    changed
  }

  // MARK: Quick block

  fun startQuickBlock(context: Context, endTimestamp: Long, level: String) = synchronized(lock) {
    val edit = prefs(context).edit()
      .putBoolean(Key.quickActive, true)
      .putString(Key.quickLevel, level)
      .putLong(Key.quickEndTimestamp, endTimestamp)
    if (!session(context).isSessionActive) edit.putInt(Key.firmUnlocksRemaining, unlockAllowance(level))
    edit.apply()
  }

  fun stopQuickBlock(context: Context) {
    prefs(context).edit()
      .putBoolean(Key.quickActive, false)
      .remove(Key.quickEndTimestamp)
      .apply()
  }

  fun isQuickBlockActive(context: Context): Boolean = prefs(context).getBoolean(Key.quickActive, false)

  // MARK: Enforcement

  /** True while a session or quick block exists, even if it is currently paused or on a break. */
  fun hasAnyBlock(context: Context): Boolean = session(context).isSessionActive || isQuickBlockActive(context)

  fun activeEnforcement(context: Context, now: Long = System.currentTimeMillis()): Enforcement? {
    val s = session(context)
    if (s.isSessionActive && !s.isBreakPhase && !s.isPausedOpen && now < s.phaseEndTimestamp) {
      return Enforcement(s.strictnessLevel, s.opensAt, s.firmUnlocksRemaining, fromSession = true)
    }
    val p = prefs(context)
    val quickEnd = p.getLong(Key.quickEndTimestamp, 0L)
    if (p.getBoolean(Key.quickActive, false) && now < quickEnd) {
      val level = p.getString(Key.quickLevel, "firm") ?: "firm"
      return Enforcement(level, quickEnd, s.firmUnlocksRemaining, fromSession = false)
    }
    return null
  }

  fun shouldBlock(context: Context, packageName: String, now: Long = System.currentTimeMillis()): Boolean {
    if (activeEnforcement(context, now) == null) return false
    if (!blockedPackages(context).contains(packageName)) return false
    if (allowedPackages(context).contains(packageName)) return false
    return (tempUnlockedPackages(context)[packageName] ?: 0L) <= now
  }

  // MARK: Temporary unlocks

  fun tempUnlockedPackages(context: Context): Map<String, Long> {
    val raw = prefs(context).getString(Key.tempUnlockedPackages, null) ?: return emptyMap()
    return try {
      val json = JSONObject(raw)
      json.keys().asSequence().associateWith { json.getLong(it) }
    } catch (_: Exception) {
      emptyMap()
    }
  }

  fun setTempUnlocks(context: Context, packages: Collection<String>, expiresAt: Long) = synchronized(lock) {
    val json = JSONObject()
    tempUnlockedPackages(context).forEach { (pkg, at) -> json.put(pkg, at) }
    packages.forEach { json.put(it, expiresAt) }
    val warned = warnedPackages(context) - packages.toSet()
    prefs(context).edit()
      .putString(Key.tempUnlockedPackages, json.toString())
      .putStringSet(Key.tempUnlockWarned, warned)
      .apply()
  }

  fun removeTempUnlock(context: Context, packageName: String) = synchronized(lock) {
    val remaining = tempUnlockedPackages(context) - packageName
    val json = JSONObject()
    remaining.forEach { (pkg, at) -> json.put(pkg, at) }
    prefs(context).edit()
      .putString(Key.tempUnlockedPackages, json.toString())
      .putStringSet(Key.tempUnlockWarned, warnedPackages(context) - packageName)
      .apply()
  }

  /** Returns the packages that were unlocked. */
  fun clearTempUnlocks(context: Context): Set<String> = synchronized(lock) {
    val previous = tempUnlockedPackages(context).keys
    prefs(context).edit().remove(Key.tempUnlockedPackages).remove(Key.tempUnlockWarned).apply()
    previous
  }

  fun warnedPackages(context: Context): Set<String> =
    prefs(context).getStringSet(Key.tempUnlockWarned, emptySet())?.toSet() ?: emptySet()

  fun markWarned(context: Context, packageName: String) = synchronized(lock) {
    prefs(context).edit().putStringSet(Key.tempUnlockWarned, warnedPackages(context) + packageName).apply()
  }

  // MARK: Pending unlock (shield → app)

  fun setPendingUnlock(context: Context, packageName: String, appLabel: String?, level: String) {
    val now = System.currentTimeMillis()
    prefs(context).edit()
      .putString(Key.pendingUnlockPackage, packageName)
      .putString(Key.pendingUnlockLabel, appLabel)
      .putString(Key.pendingUnlockLevel, level)
      .putLong(Key.pendingUnlockTimestamp, now)
      .putString(Key.unlockTargetPackage, packageName)
      .putLong(Key.unlockTargetTimestamp, now)
      .apply()
  }

  fun pendingUnlock(context: Context): PendingUnlock? {
    val p = prefs(context)
    val timestamp = p.getLong(Key.pendingUnlockTimestamp, 0L)
    if (timestamp == 0L) return null
    return PendingUnlock(
      packageName = p.getString(Key.pendingUnlockPackage, null),
      appLabel = p.getString(Key.pendingUnlockLabel, null),
      level = p.getString(Key.pendingUnlockLevel, null) ?: session(context).strictnessLevel,
      timestamp = timestamp,
    )
  }

  fun clearPendingUnlock(context: Context) {
    prefs(context).edit()
      .remove(Key.pendingUnlockPackage)
      .remove(Key.pendingUnlockLabel)
      .remove(Key.pendingUnlockLevel)
      .remove(Key.pendingUnlockTimestamp)
      .apply()
  }

  /** The app the user asked to open from the shield, if they asked recently. Consumes it. */
  fun takeUnlockTarget(context: Context, now: Long = System.currentTimeMillis()): String? = synchronized(lock) {
    val p = prefs(context)
    val target = p.getString(Key.unlockTargetPackage, null)
    val at = p.getLong(Key.unlockTargetTimestamp, 0L)
    p.edit().remove(Key.unlockTargetPackage).remove(Key.unlockTargetTimestamp).apply()
    clearPendingUnlock(context)
    if (target != null && now - at < PENDING_UNLOCK_MAX_AGE_MS) target else null
  }

  // MARK: Emergency ledger

  /** Resets implicitly at local midnight because the comparison is by local calendar day. */
  fun canUseEmergencyToday(context: Context): Boolean =
    prefs(context).getString(Key.lastEmergencyDate, null) != localDayString()

  fun markEmergencyUsedToday(context: Context) {
    prefs(context).edit().putString(Key.lastEmergencyDate, localDayString()).apply()
  }

  private fun localDayString(date: Date = Date()): String =
    SimpleDateFormat("yyyy-MM-dd", Locale.US).format(date)

  // MARK: Telemetry (SessionBlockingLog)

  private fun emptyLog(sessionId: String?): JSONObject = JSONObject()
    .put("sessionId", sessionId ?: JSONObject.NULL)
    .put("attemptsCount", 0)
    .put("unlocksUsed", 0)
    .put("emergencyUsed", false)
    .put("interrupted", false)
    .put("events", JSONArray())
    .put("attemptsByApp", JSONObject())

  private fun readLog(context: Context): JSONObject {
    val raw = prefs(context).getString(Key.log, null) ?: return emptyLog(null)
    return try {
      JSONObject(raw)
    } catch (_: Exception) {
      emptyLog(null)
    }
  }

  fun resetLog(context: Context, sessionId: String?) {
    prefs(context).edit().putString(Key.log, emptyLog(sessionId).toString()).apply()
  }

  fun clearLog(context: Context) {
    prefs(context).edit().remove(Key.log).apply()
  }

  fun updateLog(context: Context, block: (JSONObject) -> Unit) = synchronized(lock) {
    val log = readLog(context)
    block(log)
    prefs(context).edit().putString(Key.log, log.toString()).apply()
  }

  fun appendEvent(context: Context, event: JSONObject) = updateLog(context) { log ->
    (log.optJSONArray("events") ?: JSONArray().also { log.put("events", it) }).put(event)
  }

  fun minuteIntoBlock(context: Context, now: Long = System.currentTimeMillis()): Int? {
    val started = session(context).sessionStartedAt
    return if (started > 0L) ((now - started) / 60_000L).toInt() else null
  }

  fun recordAttempt(context: Context, appId: String, appLabel: String?) {
    val now = System.currentTimeMillis()
    val minute = minuteIntoBlock(context, now)
    updateLog(context) { log ->
      log.put("attemptsCount", log.optInt("attemptsCount") + 1)
      val byApp = log.optJSONObject("attemptsByApp") ?: JSONObject().also { log.put("attemptsByApp", it) }
      byApp.put(appId, byApp.optInt(appId) + 1)
      val event = JSONObject().put("type", "attempt").put("appId", appId).put("at", now)
      if (appLabel != null) event.put("appLabel", appLabel)
      if (minute != null) event.put("minuteIntoBlock", minute)
      (log.optJSONArray("events") ?: JSONArray().also { log.put("events", it) }).put(event)
    }
  }

  fun logMap(context: Context): Map<String, Any?> {
    @Suppress("UNCHECKED_CAST")
    val map = toKotlin(readLog(context)) as Map<String, Any?>
    return if (map.containsKey("sessionId")) map else map + ("sessionId" to null)
  }

  // MARK: Helpers

  fun unlockAllowance(level: String): Int = when (level) {
    "gentle" -> 99
    "firm" -> FIRM_UNLOCKS_PER_SESSION
    else -> 0
  }

  /** (phaseEnd, isBreak) for the phase containing [now]; without a plan the whole session is one focus block. */
  private fun resolvePhase(phases: List<Phase>, now: Long, sessionEnd: Long, unblockOnBreaks: Boolean): Pair<Long, Boolean> {
    val current = phases.firstOrNull { now >= it.startAt && now < it.endAt }
    if (current != null) {
      return current.endAt.coerceAtMost(sessionEnd) to (unblockOnBreaks && current.type == "break")
    }
    val next = phases.filter { it.startAt > now }.minByOrNull { it.startAt }
    return (next?.startAt ?: sessionEnd).coerceAtMost(sessionEnd) to false
  }

  private fun encodePhases(phases: List<Phase>): String {
    val array = JSONArray()
    phases.forEach { array.put(JSONObject().put("type", it.type).put("startAt", it.startAt).put("endAt", it.endAt)) }
    return array.toString()
  }

  private fun decodePhases(raw: String?): List<Phase> {
    if (raw.isNullOrEmpty()) return emptyList()
    return try {
      val array = JSONArray(raw)
      (0 until array.length()).map {
        val o = array.getJSONObject(it)
        Phase(o.optString("type", "focus"), o.optLong("startAt"), o.optLong("endAt"))
      }
    } catch (_: Exception) {
      emptyList()
    }
  }

  private fun toKotlin(value: Any?): Any? = when (value) {
    is JSONObject -> value.keys().asSequence().associateWith { toKotlin(value.opt(it)) }
    is JSONArray -> (0 until value.length()).map { toKotlin(value.opt(it)) }
    JSONObject.NULL -> null
    else -> value
  }
}
