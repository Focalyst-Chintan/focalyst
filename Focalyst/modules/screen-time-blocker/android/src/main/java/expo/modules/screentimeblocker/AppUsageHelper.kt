package expo.modules.screentimeblocker

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.Drawable
import android.os.Build
import android.os.Process
import android.provider.Settings
import android.telecom.TelecomManager
import android.text.TextUtils
import java.io.File
import java.io.FileOutputStream

data class InstalledApp(
  val packageName: String,
  val appName: String,
  val iconUri: String?,
  val avgDailyMinutes: Int,
  val formattedUsage: String,
) {
  fun toMap(): Map<String, Any?> = mapOf(
    "packageName" to packageName,
    "appName" to appName,
    "iconUri" to iconUri,
    "avgDailyMinutes" to avgDailyMinutes,
    "formattedUsage" to formattedUsage,
  )
}

object AppUsageHelper {
  private const val ICON_SIZE_PX = 120
  private const val USAGE_WINDOW_DAYS = 7
  private const val MOST_USED_COUNT = 8
  private const val DAY_MS = 24 * 60 * 60 * 1000L

  /** System surfaces that must never be blocked, whatever the user picks. */
  val ALWAYS_EXCLUDED = setOf("com.android.settings", "com.android.systemui")

  // MARK: Permissions

  fun hasUsageAccess(context: Context): Boolean {
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
    } else {
      @Suppress("DEPRECATION")
      appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
    }
    return if (mode == AppOpsManager.MODE_DEFAULT) {
      context.checkCallingOrSelfPermission(android.Manifest.permission.PACKAGE_USAGE_STATS) ==
        PackageManager.PERMISSION_GRANTED
    } else {
      mode == AppOpsManager.MODE_ALLOWED
    }
  }

  fun isAccessibilityServiceEnabled(context: Context): Boolean {
    val enabled = Settings.Secure.getString(
      context.contentResolver,
      Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
    ) ?: return false
    val expected = ComponentName(context, AppBlockerAccessibilityService::class.java)
    val splitter = TextUtils.SimpleStringSplitter(':')
    splitter.setString(enabled)
    return splitter.any { ComponentName.unflattenFromString(it) == expected }
  }

  // MARK: Installed apps

  fun defaultLauncherPackage(context: Context): String? {
    val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
    return context.packageManager
      .resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY)
      ?.activityInfo
      ?.packageName
      // "android" is the chooser shown when no default launcher is set.
      ?.takeIf { it != "android" }
  }

  fun defaultDialerPackage(context: Context): String? = try {
    (context.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager)?.defaultDialerPackage
  } catch (_: Exception) {
    null
  }

  fun excludedPackages(context: Context): Set<String> =
    ALWAYS_EXCLUDED + listOfNotNull(context.packageName, defaultDialerPackage(context), defaultLauncherPackage(context))

  fun appLabel(context: Context, packageName: String): String = try {
    val pm = context.packageManager
    pm.getApplicationLabel(pm.getApplicationInfo(packageName, 0)).toString()
  } catch (_: Exception) {
    packageName
  }

  fun appIcon(context: Context, packageName: String): Drawable? = try {
    context.packageManager.getApplicationIcon(packageName)
  } catch (_: Exception) {
    null
  }

  /** `{ mostUsed: top 8 by daily usage, allApps: every launchable app A–Z }`. */
  fun getInstalledAppsWithUsage(context: Context): Map<String, List<Map<String, Any?>>> {
    val pm = context.packageManager
    val excluded = excludedPackages(context)
    val launcherIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
    val activities = pm.queryIntentActivities(launcherIntent, 0)
    val usage = averageDailyMinutes(context)

    val apps = activities
      .distinctBy { it.activityInfo.packageName }
      .filter { it.activityInfo.packageName !in excluded }
      .map { info ->
        val pkg = info.activityInfo.packageName
        val minutes = usage[pkg] ?: 0
        InstalledApp(
          packageName = pkg,
          appName = info.loadLabel(pm).toString(),
          iconUri = cachedIconUri(context, pkg) { info.loadIcon(pm) },
          avgDailyMinutes = minutes,
          formattedUsage = formatUsage(minutes),
        )
      }

    val mostUsed = apps
      .filter { it.avgDailyMinutes > 0 }
      .sortedByDescending { it.avgDailyMinutes }
      .take(MOST_USED_COUNT)
    val allApps = apps.sortedBy { it.appName.lowercase() }

    return mapOf(
      "mostUsed" to mostUsed.map { it.toMap() },
      "allApps" to allApps.map { it.toMap() },
    )
  }

  /** Average foreground minutes per day over the last 7 days, or empty without Usage Access. */
  private fun averageDailyMinutes(context: Context): Map<String, Int> {
    if (!hasUsageAccess(context)) return emptyMap()
    val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager ?: return emptyMap()
    val now = System.currentTimeMillis()
    return try {
      usm.queryAndAggregateUsageStats(now - USAGE_WINDOW_DAYS * DAY_MS, now)
        .mapValues { (_, stats) -> (stats.totalTimeInForeground / USAGE_WINDOW_DAYS / 60_000L).toInt() }
    } catch (_: Exception) {
      emptyMap()
    }
  }

  fun formatUsage(minutes: Int): String {
    if (minutes <= 0) return ""
    val h = minutes / 60
    val m = minutes % 60
    return when {
      h > 0 && m > 0 -> "${h}h ${m}m a day"
      h > 0 -> "${h}h a day"
      else -> "${m}m a day"
    }
  }

  // MARK: Icon cache

  private fun cachedIconUri(context: Context, packageName: String, loadIcon: () -> Drawable?): String? {
    val dir = File(context.cacheDir, "app_icons").apply { mkdirs() }
    val file = File(dir, "$packageName.png")
    if (file.exists() && file.length() > 0) return "file://${file.absolutePath}"
    val drawable = try {
      loadIcon()
    } catch (_: Exception) {
      null
    } ?: return null
    return try {
      val bitmap = drawableToBitmap(drawable, ICON_SIZE_PX)
      FileOutputStream(file).use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
      bitmap.recycle()
      "file://${file.absolutePath}"
    } catch (_: Exception) {
      file.delete()
      null
    }
  }

  fun drawableToBitmap(drawable: Drawable, size: Int): Bitmap {
    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    drawable.setBounds(0, 0, size, size)
    drawable.draw(canvas)
    return bitmap
  }
}
