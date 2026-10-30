package expo.modules.screentimeblocker

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import android.util.Log
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import org.json.JSONObject
import kotlin.math.roundToInt

class SessionPhaseRecord : Record {
  @Field var type: String = "focus"
  @Field var startAt: Double = 0.0
  @Field var endAt: Double = 0.0
}

class StartSessionConfigRecord : Record {
  @Field var sessionId: String = ""
  @Field var level: String = "firm"
  @Field var endTimestamp: Double = 0.0
  @Field var unblockOnBreaks: Boolean = false
  @Field var phases: List<SessionPhaseRecord>? = null
  /** Firm unlocks still available this session; JS tracks them across native restarts. */
  @Field var unlocksLeft: Int? = null
}

/**
 * Android implementation of the shared ScreenTimeBlocker API: an AccessibilityService spots blocked
 * apps, ShieldActivity covers them, and FocusForegroundService keeps it all running while Focalyst is closed.
 */
class ScreenTimeBlockerModule : Module() {
  companion object {
    private const val TAG = "ScreenTimeBlocker"
  }

  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("ScreenTimeBlocker")

    OnCreate {
      reconcile()
    }

    OnActivityEntersForeground {
      reconcile()
    }

    // MARK: Authorization

    // Android has no permission prompt for these; send the user to the first missing setting.
    AsyncFunction("requestAuthorization") {
      when {
        !AppUsageHelper.hasUsageAccess(context) -> openUsageAccess()
        !AppUsageHelper.isAccessibilityServiceEnabled(context) -> openAccessibility()
      }
      if (isAuthorized()) "approved" else "denied"
    }

    AsyncFunction("getAuthorizationStatus") {
      when {
        isAuthorized() -> "approved"
        BlockerSharedPrefs.session(context).permissionLost -> "denied"
        else -> "notDetermined"
      }
    }

    AsyncFunction("getAndroidPermissionsStatus") {
      mapOf(
        "usageAccess" to AppUsageHelper.hasUsageAccess(context),
        "accessibilityEnabled" to AppUsageHelper.isAccessibilityServiceEnabled(context),
      )
    }

    AsyncFunction("openUsageAccessSettings") {
      openUsageAccess()
    }

    AsyncFunction("openAccessibilitySettings") {
      openAccessibility()
    }

    // MARK: Selection (the app picker itself is built in React Native on Android)

    AsyncFunction("getInstalledAppsWithUsage") {
      AppUsageHelper.getInstalledAppsWithUsage(context)
    }

    AsyncFunction("setAndroidBlocklist") { packageNames: List<String> ->
      BlockerSharedPrefs.setBlockedPackages(context, packageNames)
      summary(packageNames.toSet())
    }

    AsyncFunction("setAndroidAllowlist") { packageNames: List<String> ->
      BlockerSharedPrefs.setAllowedPackages(context, packageNames)
      summary(packageNames.toSet())
    }

    AsyncFunction("getAndroidBlocklist") {
      BlockerSharedPrefs.blockedPackages(context).sorted()
    }

    AsyncFunction("getAndroidAllowlist") {
      BlockerSharedPrefs.allowedPackages(context).sorted()
    }

    AsyncFunction("openAppPicker") { mode: String ->
      summary(selection(mode))
    }

    AsyncFunction("getSelectionSummary") { mode: String ->
      summary(selection(mode))
    }

    // MARK: Session blocking

    AsyncFunction("startSessionBlocking") { config: StartSessionConfigRecord ->
      val end = config.endTimestamp.toLong()
      if (end <= System.currentTimeMillis()) return@AsyncFunction false
      BlockerSharedPrefs.startSession(
        context,
        sessionId = config.sessionId,
        level = config.level,
        endTimestamp = end,
        unblockOnBreaks = config.unblockOnBreaks,
        phases = config.phases.orEmpty().map {
          BlockerSharedPrefs.Phase(it.type, it.startAt.toLong(), it.endAt.toLong())
        },
        unlocksLeft = config.unlocksLeft,
      )
      FocusForegroundService.start(context)
      true
    }

    AsyncFunction("pauseSessionBlocking") {
      val session = BlockerSharedPrefs.session(context)
      if (!session.isSessionActive || session.isPausedOpen) return@AsyncFunction false
      BlockerSharedPrefs.setPaused(context, true)
      BlockerSharedPrefs.appendEvent(context, phaseEvent("break"))
      true
    }

    AsyncFunction("resumeSessionBlocking") {
      val session = BlockerSharedPrefs.session(context)
      if (!session.isSessionActive || !session.isPausedOpen) return@AsyncFunction false
      BlockerSharedPrefs.setPaused(context, false)
      BlockerSharedPrefs.appendEvent(context, phaseEvent("focus"))
      FocusForegroundService.start(context)
      true
    }

    AsyncFunction("stopSessionBlocking") {
      val session = BlockerSharedPrefs.session(context)
      if (!session.isSessionActive) return@AsyncFunction false
      if (System.currentTimeMillis() < session.sessionEndTimestamp) {
        BlockerSharedPrefs.updateLog(context) { it.put("interrupted", true) }
      }
      BlockerSharedPrefs.endSession(context)
      stopServiceIfIdle()
      true
    }

    // MARK: Temporary unlocks

    AsyncFunction("grantTemporaryUnlock") { durationMinutes: Double, reason: String? ->
      grantTemporaryUnlock(durationMinutes, reason)
    }

    AsyncFunction("lockTemporaryUnlockNow") {
      val unlocked = BlockerSharedPrefs.clearTempUnlocks(context)
      if (unlocked.isEmpty()) return@AsyncFunction false
      val foreground = AppBlockerAccessibilityService.lastForegroundPackage
      if (foreground != null && foreground in unlocked && BlockerSharedPrefs.shouldBlock(context, foreground)) {
        ShieldActivity.launch(context, foreground)
      }
      true
    }

    AsyncFunction("getPendingUnlockRequest") {
      val request = BlockerSharedPrefs.pendingUnlock(context) ?: return@AsyncFunction null
      mapOf(
        "timestamp" to request.timestamp.toDouble(),
        "level" to request.level,
        "appName" to request.appLabel,
        "appId" to request.packageName,
        "appLabel" to request.appLabel,
      )
    }

    AsyncFunction("clearPendingUnlockRequest") {
      BlockerSharedPrefs.clearPendingUnlock(context)
    }

    // MARK: Emergency unlock

    AsyncFunction("triggerEmergencyUnlock") {
      if (!BlockerSharedPrefs.hasAnyBlock(context) || !BlockerSharedPrefs.canUseEmergencyToday(context)) {
        return@AsyncFunction false
      }
      BlockerSharedPrefs.markEmergencyUsedToday(context)
      val minute = BlockerSharedPrefs.minuteIntoBlock(context)
      BlockerSharedPrefs.updateLog(context) { log ->
        log.put("emergencyUsed", true)
        log.put("interrupted", true)
        val event = JSONObject().put("type", "emergency").put("at", System.currentTimeMillis())
        if (minute != null) event.put("minuteIntoBlock", minute)
        log.optJSONArray("events")?.put(event)
      }
      BlockerSharedPrefs.endSession(context)
      BlockerSharedPrefs.stopQuickBlock(context)
      stopServiceIfIdle()
      true
    }

    AsyncFunction("canUseEmergencyUnlockToday") {
      BlockerSharedPrefs.canUseEmergencyToday(context)
    }

    // MARK: Quick block

    AsyncFunction("startQuickBlock") { endTimestamp: Double, level: String ->
      val end = endTimestamp.toLong()
      if (end <= System.currentTimeMillis()) return@AsyncFunction false
      BlockerSharedPrefs.startQuickBlock(context, end, level)
      FocusForegroundService.start(context)
      true
    }

    AsyncFunction("stopQuickBlock") {
      val wasActive = BlockerSharedPrefs.isQuickBlockActive(context)
      BlockerSharedPrefs.stopQuickBlock(context)
      stopServiceIfIdle()
      wasActive
    }

    // MARK: Recurring blocks (iOS DeviceActivity only for now)

    AsyncFunction("scheduleRecurringBlock") { _: String, _: Int, _: Int, _: Int, _: Int, _: List<Int>, _: String ->
      false
    }

    AsyncFunction("cancelRecurringBlock") { _: String -> }

    // MARK: Telemetry

    AsyncFunction("getSessionTelemetry") {
      BlockerSharedPrefs.logMap(context)
    }

    AsyncFunction("clearSessionTelemetry") {
      BlockerSharedPrefs.clearLog(context)
    }
  }

  // MARK: - Helpers

  private fun isAuthorized(): Boolean =
    AppUsageHelper.hasUsageAccess(context) && AppUsageHelper.isAccessibilityServiceEnabled(context)

  private fun selection(mode: String): Set<String> =
    if (mode == "allowed") BlockerSharedPrefs.allowedPackages(context) else BlockerSharedPrefs.blockedPackages(context)

  private fun summary(packages: Set<String>): Map<String, Int> =
    mapOf("appCount" to packages.size, "categoryCount" to 0, "webCount" to 0)

  private fun phaseEvent(phase: String): JSONObject =
    JSONObject().put("type", "phase").put("at", System.currentTimeMillis()).put("phase", phase)

  private fun grantTemporaryUnlock(durationMinutes: Double, reason: String?): Boolean {
    val ctx = context
    val now = System.currentTimeMillis()
    val enforcement = BlockerSharedPrefs.activeEnforcement(ctx, now) ?: return false
    if (enforcement.level == "locked") return false
    if (enforcement.level == "firm") {
      if (enforcement.unlocksLeft <= 0) return false
      BlockerSharedPrefs.setFirmUnlocksRemaining(ctx, enforcement.unlocksLeft - 1)
    }

    val minutes = durationMinutes.roundToInt().coerceAtLeast(1)
    val windowEnd = minOf(now + minutes * 60_000L, enforcement.opensAt)

    // From the shield's secondary button: unlock (and open) just that app. Otherwise the whole blocklist.
    val target = BlockerSharedPrefs.takeUnlockTarget(ctx, now)
    val packages = if (target != null) setOf(target) else BlockerSharedPrefs.blockedPackages(ctx)
    BlockerSharedPrefs.setTempUnlocks(ctx, packages, windowEnd)

    val minute = BlockerSharedPrefs.minuteIntoBlock(ctx, now)
    BlockerSharedPrefs.updateLog(ctx) { log ->
      log.put("unlocksUsed", log.optInt("unlocksUsed") + 1)
      val event = JSONObject().put("type", "unlock").put("at", now).put("minutes", minutes)
      if (minute != null) event.put("minuteIntoBlock", minute)
      if (reason != null) event.put("reason", reason)
      if (target != null) event.put("appId", target).put("appLabel", AppUsageHelper.appLabel(ctx, target))
      log.optJSONArray("events")?.put(event)
    }

    FocusForegroundService.start(ctx)
    if (target != null) launchApp(target)
    return true
  }

  private fun launchApp(packageName: String) {
    val intent = context.packageManager.getLaunchIntentForPackage(packageName) ?: return
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    startActivitySafely(intent)
  }

  private fun openUsageAccess() {
    val perApp = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS, Uri.parse("package:${context.packageName}"))
    if (!startActivitySafely(perApp)) startActivitySafely(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
  }

  private fun openAccessibility() {
    startActivitySafely(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
  }

  private fun startActivitySafely(intent: Intent): Boolean {
    val activity = appContext.currentActivity
    return try {
      if (activity != null) {
        activity.startActivity(intent)
      } else {
        context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      }
      true
    } catch (e: Exception) {
      Log.w(TAG, "Could not start ${intent.action}: ${e.message}")
      false
    }
  }

  private fun stopServiceIfIdle() {
    if (!BlockerSharedPrefs.hasAnyBlock(context)) FocusForegroundService.stop(context)
  }

  /** Brings native state in line with the clock after Focalyst was closed or relaunched. */
  private fun reconcile() {
    val ctx = appContext.reactContext ?: return
    BlockerSharedPrefs.advanceIfNeeded(ctx)
    if (BlockerSharedPrefs.hasAnyBlock(ctx)) FocusForegroundService.start(ctx)
  }
}
