package expo.modules.screentimeblocker

import android.accessibilityservice.AccessibilityService
import android.os.SystemClock
import android.view.accessibility.AccessibilityEvent
import android.view.inputmethod.InputMethodManager

/**
 * Watches only foreground package changes (`typeWindowStateChanged`, no window content) and puts
 * the shield over any blocked app while a focus block is enforced.
 */
class AppBlockerAccessibilityService : AccessibilityService() {
  companion object {
    /** Last app the user was actually in; the foreground service uses it to re-shield after an unlock ends. */
    @Volatile
    var lastForegroundPackage: String? = null
      private set

    /** Several window events fire per app launch; count one attempt per launch. */
    private const val ATTEMPT_DEBOUNCE_MS = 1500L
    private const val KEYBOARD_CACHE_MS = 30_000L
  }

  private var keyboardPackages: Set<String> = emptySet()
  private var keyboardsReadAt = 0L
  private var launcherPackage: String? = null
  private var lastAttemptPackage: String? = null
  private var lastAttemptAt = 0L

  override fun onServiceConnected() {
    super.onServiceConnected()
    launcherPackage = AppUsageHelper.defaultLauncherPackage(this)
    BlockerSharedPrefs.setPermissionLost(this, false)
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
    val pkg = event.packageName?.toString() ?: return

    // System UI and keyboards draw over the current app without replacing it.
    if (pkg == "com.android.systemui" || pkg in keyboards()) return
    lastForegroundPackage = pkg

    if (pkg == packageName || pkg == "com.android.settings" || pkg == launcherPackage) return
    if (!BlockerSharedPrefs.shouldBlock(this, pkg)) return

    val now = SystemClock.elapsedRealtime()
    if (pkg != lastAttemptPackage || now - lastAttemptAt > ATTEMPT_DEBOUNCE_MS) {
      BlockerSharedPrefs.recordAttempt(this, pkg, AppUsageHelper.appLabel(this, pkg))
    }
    lastAttemptPackage = pkg
    lastAttemptAt = now
    ShieldActivity.launch(this, pkg)
  }

  override fun onInterrupt() = Unit

  private fun keyboards(): Set<String> {
    val now = SystemClock.elapsedRealtime()
    if (now - keyboardsReadAt > KEYBOARD_CACHE_MS) {
      val imm = getSystemService(INPUT_METHOD_SERVICE) as? InputMethodManager
      keyboardPackages = imm?.enabledInputMethodList?.map { it.packageName }?.toSet() ?: emptySet()
      launcherPackage = AppUsageHelper.defaultLauncherPackage(this)
      keyboardsReadAt = now
    }
    return keyboardPackages
  }
}
