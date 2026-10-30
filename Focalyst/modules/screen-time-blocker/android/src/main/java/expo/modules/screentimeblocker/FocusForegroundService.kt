package expo.modules.screentimeblocker

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat

/**
 * Keeps blocking alive while Focalyst is closed: shows the ongoing countdown, ends temporary
 * unlocks (with a 30-second warning), advances phases, and notices if Accessibility is turned off.
 */
class FocusForegroundService : Service() {
  companion object {
    private const val TAG = "ScreenTimeBlocker"
    const val SESSION_CHANNEL = "focalyst_session"
    const val ALERTS_CHANNEL = "focalyst_alerts"
    private const val ONGOING_NOTIFICATION_ID = 4101
    private const val PERMISSION_ALERT_ID = 4102
    private const val UNLOCK_ALERT_BASE_ID = 4200
    private const val TICK_MS = 1000L
    private const val PERMISSION_CHECK_EVERY_TICKS = 5
    private const val UNLOCK_WARNING_MS = 30_000L

    fun start(context: Context) {
      try {
        ContextCompat.startForegroundService(context, Intent(context, FocusForegroundService::class.java))
      } catch (e: Exception) {
        // Android 12+ refuses background starts; the next foreground call to the module retries.
        Log.w(TAG, "Could not start FocusForegroundService: ${e.message}")
      }
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, FocusForegroundService::class.java))
    }

    fun ensureChannels(context: Context) {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
      val manager = context.getSystemService(NotificationManager::class.java) ?: return
      manager.createNotificationChannel(
        NotificationChannel(SESSION_CHANNEL, "Focus session", NotificationManager.IMPORTANCE_LOW).apply {
          description = "Shows the time left while apps are blocked."
          setShowBadge(false)
          setSound(null, null)
          enableVibration(false)
        }
      )
      manager.createNotificationChannel(
        NotificationChannel(ALERTS_CHANNEL, "Blocking alerts", NotificationManager.IMPORTANCE_HIGH).apply {
          description = "Tells you when an unlocked app is about to lock again, or blocking stops working."
        }
      )
    }

    private fun unlockAlertId(packageName: String) = UNLOCK_ALERT_BASE_ID + (packageName.hashCode() and 0xFFF)

    fun formatClock(remainingMs: Long): String {
      val totalSeconds = ((remainingMs.coerceAtLeast(0L) + 999L) / 1000L)
      return "%02d:%02d".format(totalSeconds / 60, totalSeconds % 60)
    }
  }

  private val handler = Handler(Looper.getMainLooper())
  private var ticks = 0
  private var accessibilityWasEnabled = false
  private var running = false

  private val ticker = object : Runnable {
    override fun run() {
      tick()
      if (running) handler.postDelayed(this, TICK_MS)
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    ensureChannels(this)
    accessibilityWasEnabled = AppUsageHelper.isAccessibilityServiceEnabled(this)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    // startForeground must run on every start, even one we immediately stop.
    startInForeground(buildOngoingNotification(System.currentTimeMillis()))
    BlockerSharedPrefs.advanceIfNeeded(this)
    if (!BlockerSharedPrefs.hasAnyBlock(this)) {
      shutdown()
      return START_NOT_STICKY
    }
    running = true
    handler.removeCallbacks(ticker)
    handler.post(ticker)
    return START_STICKY
  }

  override fun onDestroy() {
    running = false
    handler.removeCallbacks(ticker)
    super.onDestroy()
  }

  private fun startInForeground(notification: Notification) {
    val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
    } else {
      0
    }
    ServiceCompat.startForeground(this, ONGOING_NOTIFICATION_ID, notification, type)
  }

  private fun shutdown() {
    running = false
    handler.removeCallbacks(ticker)
    ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  // MARK: Ticker

  private fun tick() {
    val now = System.currentTimeMillis()
    BlockerSharedPrefs.advanceIfNeeded(this, now)
    if (!BlockerSharedPrefs.hasAnyBlock(this)) {
      shutdown()
      return
    }
    checkTemporaryUnlocks(now)
    if (++ticks % PERMISSION_CHECK_EVERY_TICKS == 0) checkAccessibility()
    notifySafely(ONGOING_NOTIFICATION_ID, buildOngoingNotification(now))
  }

  private fun checkTemporaryUnlocks(now: Long) {
    val warned = BlockerSharedPrefs.warnedPackages(this)
    for ((pkg, expiresAt) in BlockerSharedPrefs.tempUnlockedPackages(this)) {
      val left = expiresAt - now
      if (left <= 0L) {
        BlockerSharedPrefs.removeTempUnlock(this, pkg)
        NotificationManagerCompat.from(this).cancel(unlockAlertId(pkg))
        if (AppBlockerAccessibilityService.lastForegroundPackage == pkg && BlockerSharedPrefs.shouldBlock(this, pkg, now)) {
          ShieldActivity.launch(this, pkg)
        }
      } else if (left <= UNLOCK_WARNING_MS && pkg !in warned) {
        BlockerSharedPrefs.markWarned(this, pkg)
        val label = AppUsageHelper.appLabel(this, pkg)
        notifySafely(unlockAlertId(pkg), buildAlert("$label locks again in 30 seconds.", null, openAppIntent()))
      }
    }
  }

  private fun checkAccessibility() {
    val enabled = AppUsageHelper.isAccessibilityServiceEnabled(this)
    val session = BlockerSharedPrefs.session(this)
    if (accessibilityWasEnabled && !enabled && session.isSessionActive && !session.permissionLost) {
      BlockerSharedPrefs.setPermissionLost(this, true)
      BlockerSharedPrefs.updateLog(this) { it.put("interrupted", true) }
      val fix = PendingIntent.getActivity(
        this,
        PERMISSION_ALERT_ID,
        Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
      )
      notifySafely(PERMISSION_ALERT_ID, buildAlert("Blocking is off", "Accessibility access was turned off. Tap to fix.", fix))
    }
    accessibilityWasEnabled = enabled
  }

  // MARK: Notifications

  private fun buildOngoingNotification(now: Long): Notification {
    val session = BlockerSharedPrefs.session(this)
    val enforcement = BlockerSharedPrefs.activeEnforcement(this, now)
    val title = when {
      session.isSessionActive && session.isPausedOpen -> "Focus session paused"
      enforcement != null -> "Focus session running · ${formatClock(enforcement.opensAt - now)} left"
      session.isSessionActive && session.isBreakPhase -> "Break · ${formatClock(session.phaseEndTimestamp - now)} left"
      else -> "Focus session running"
    }
    return NotificationCompat.Builder(this, SESSION_CHANNEL)
      .setSmallIcon(R.drawable.stb_ic_notification)
      .setContentTitle(title)
      .setContentIntent(openAppIntent())
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setShowWhen(false)
      .setCategory(NotificationCompat.CATEGORY_PROGRESS)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
      .build()
  }

  private fun buildAlert(title: String, body: String?, contentIntent: PendingIntent?): Notification =
    NotificationCompat.Builder(this, ALERTS_CHANNEL)
      .setSmallIcon(R.drawable.stb_ic_notification)
      .setContentTitle(title)
      .apply { if (body != null) setContentText(body) }
      .setContentIntent(contentIntent)
      .setAutoCancel(true)
      .setCategory(NotificationCompat.CATEGORY_REMINDER)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setDefaults(NotificationCompat.DEFAULT_ALL)
      .build()

  private fun openAppIntent(): PendingIntent? {
    val launch = packageManager.getLaunchIntentForPackage(packageName) ?: return null
    return PendingIntent.getActivity(
      this,
      ONGOING_NOTIFICATION_ID,
      launch,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )
  }

  /** POST_NOTIFICATIONS may be denied on Android 13+; the service keeps running either way. */
  @SuppressLint("MissingPermission")
  private fun notifySafely(id: Int, notification: Notification) {
    val manager = NotificationManagerCompat.from(this)
    if (!manager.areNotificationsEnabled()) return
    try {
      manager.notify(id, notification)
    } catch (e: SecurityException) {
      Log.w(TAG, "Notification $id not posted: ${e.message}")
    }
  }
}
