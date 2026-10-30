package expo.modules.screentimeblocker

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.res.ColorStateList
import android.content.res.Configuration
import android.graphics.Color
import android.graphics.Outline
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.RippleDrawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.format.DateFormat
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.ViewOutlineProvider
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.window.OnBackInvokedDispatcher
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import java.util.Date

/**
 * Full-screen S9 shield shown over a blocked app. "Back to focus" and the system Back gesture
 * both go to the home screen, never back into the blocked app.
 */
class ShieldActivity : Activity() {
  companion object {
    private const val TAG = "ScreenTimeBlocker"
    const val EXTRA_BLOCKED_PACKAGE = "blockedPackage"
    const val EXTRA_UNLOCK_APP = "blockingUnlockApp"
    const val EXTRA_UNLOCK_LEVEL = "blockingUnlockLevel"

    fun launch(context: Context, packageName: String) {
      val intent = Intent(context, ShieldActivity::class.java)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        .putExtra(EXTRA_BLOCKED_PACKAGE, packageName)
      try {
        context.startActivity(intent)
      } catch (e: Exception) {
        Log.w(TAG, "Could not show shield for $packageName: ${e.message}")
      }
    }
  }

  private class Palette(dark: Boolean) {
    val bg = Color.parseColor(if (dark) "#0F1220" else "#F8F9FF")
    val title = Color.parseColor(if (dark) "#FFFFFF" else "#121C2A")
    val subtitle = Color.parseColor(if (dark) "#9AA0B4" else "#42474D")
    val pillFill = Color.parseColor(if (dark) "#181C2C" else "#FFFFFF")
    val pillBorder = Color.parseColor(if (dark) "#262B3D" else "#E3E8F2")
    val primaryFill = Color.parseColor(if (dark) "#D9622B" else "#315472")
    val ripple = Color.parseColor(if (dark) "#33FFFFFF" else "#1F121C2A")
    val lockBadge = Color.parseColor("#D9622B")
  }

  private val handler = Handler(Looper.getMainLooper())
  private val ticker = object : Runnable {
    override fun run() {
      refresh()
      handler.postDelayed(this, 1000L)
    }
  }

  private var blockedPackage: String? = null
  private var appLabel: String = ""
  private var currentLevel: String = "firm"

  private lateinit var palette: Palette
  private lateinit var pill: TextView
  private lateinit var iconView: ImageView
  private lateinit var titleView: TextView
  private lateinit var subtitleView: TextView
  private lateinit var secondaryButton: TextView

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val dark = (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
    palette = Palette(dark)
    setupWindow(dark)
    setContentView(buildContent())
    registerBackHandler()
    bind(intent)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    bind(intent)
  }

  override fun onResume() {
    super.onResume()
    handler.removeCallbacks(ticker)
    handler.post(ticker)
  }

  override fun onPause() {
    handler.removeCallbacks(ticker)
    super.onPause()
  }

  @Deprecated("Back always leaves for the home screen.")
  @Suppress("DEPRECATION")
  override fun onBackPressed() {
    goHome()
  }

  private fun registerBackHandler() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      onBackInvokedDispatcher.registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT) { goHome() }
    }
  }

  // MARK: State

  private fun bind(intent: Intent?) {
    val pkg = intent?.getStringExtra(EXTRA_BLOCKED_PACKAGE)
    if (pkg == null) {
      finish()
      return
    }
    blockedPackage = pkg
    appLabel = AppUsageHelper.appLabel(this, pkg)
    iconView.setImageDrawable(AppUsageHelper.appIcon(this, pkg))
    titleView.text = "$appLabel is locked"
    refresh()
  }

  private fun refresh() {
    val pkg = blockedPackage ?: return
    val now = System.currentTimeMillis()
    val enforcement = BlockerSharedPrefs.activeEnforcement(this, now)
    // Break started, unlock granted or session over: let the user back into the app.
    if (enforcement == null || !BlockerSharedPrefs.shouldBlock(this, pkg, now)) {
      finish()
      return
    }
    currentLevel = enforcement.level
    pill.text = "FOCUS · ${FocusForegroundService.formatClock(enforcement.opensAt - now)} LEFT"

    val time = DateFormat.getTimeFormat(this).format(Date(enforcement.opensAt))
    val outOfUnlocks = enforcement.level == "firm" && enforcement.unlocksLeft <= 0
    subtitleView.text = if (outOfUnlocks) {
      "You've used both unlocks. It opens at $time."
    } else {
      "You're in a focus block. It opens again at $time."
    }

    val secondary = when (enforcement.level) {
      "gentle" -> "Open anyway"
      "firm" -> if (enforcement.unlocksLeft > 0) "I need it (${enforcement.unlocksLeft} left)" else null
      "locked" -> "Emergency options"
      else -> null
    }
    secondaryButton.visibility = if (secondary == null) View.INVISIBLE else View.VISIBLE
    if (secondary != null) secondaryButton.text = secondary
  }

  // MARK: Actions

  private fun goHome() {
    val home = Intent(Intent.ACTION_MAIN)
      .addCategory(Intent.CATEGORY_HOME)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    try {
      startActivity(home)
    } catch (e: Exception) {
      Log.w(TAG, "Could not open the home screen: ${e.message}")
    }
    finish()
  }

  private fun openUnlockFlow() {
    val pkg = blockedPackage ?: return
    val level = currentLevel
    BlockerSharedPrefs.setPendingUnlock(this, pkg, appLabel, level)

    val uri = Uri.parse("focalyst://blocking/unlock?app=${Uri.encode(pkg)}&level=$level")
    val deepLink = Intent(Intent.ACTION_VIEW, uri)
      .setPackage(packageName)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    // Without a registered `focalyst` scheme, aim the same URL at the launcher activity directly.
    val target = if (deepLink.resolveActivity(packageManager) != null) {
      deepLink
    } else {
      packageManager.getLaunchIntentForPackage(packageName)?.apply {
        action = Intent.ACTION_VIEW
        data = uri
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
    }
    target?.putExtra(EXTRA_UNLOCK_APP, pkg)?.putExtra(EXTRA_UNLOCK_LEVEL, level)
    try {
      if (target != null) startActivity(target)
    } catch (e: Exception) {
      Log.w(TAG, "Could not open Focalyst: ${e.message}")
    }
    finish()
  }

  // MARK: Layout

  private fun setupWindow(dark: Boolean) {
    WindowCompat.setDecorFitsSystemWindows(window, false)
    @Suppress("DEPRECATION")
    window.statusBarColor = Color.TRANSPARENT
    @Suppress("DEPRECATION")
    window.navigationBarColor = Color.TRANSPARENT
    WindowCompat.getInsetsController(window, window.decorView).apply {
      isAppearanceLightStatusBars = !dark
      isAppearanceLightNavigationBars = !dark
    }
  }

  private fun buildContent(): View {
    val root = FrameLayout(this).apply {
      setBackgroundColor(palette.bg)
      clipChildren = false
    }
    val gutter = dp(24)
    ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
      val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
      view.setPadding(gutter + bars.left, dp(16) + bars.top, gutter + bars.right, dp(16) + bars.bottom)
      insets
    }

    pill = TextView(this).apply {
      setTextColor(palette.title)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
      typeface = Typeface.DEFAULT_BOLD
      letterSpacing = 0.06f
      fontFeatureSettings = "tnum"
      setPadding(dp(12), dp(7), dp(12), dp(7))
      background = GradientDrawable().apply {
        cornerRadius = dp(999).toFloat()
        setColor(palette.pillFill)
        setStroke(dp(1), palette.pillBorder)
      }
    }
    root.addView(pill, FrameLayout.LayoutParams(wrap, wrap, Gravity.TOP or Gravity.START))

    val center = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
      clipChildren = false
    }
    center.addView(buildIcon(), LinearLayout.LayoutParams(dp(64), dp(64)))
    titleView = TextView(this).apply {
      setTextColor(palette.title)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 26f)
      typeface = Typeface.DEFAULT_BOLD
      gravity = Gravity.CENTER
      letterSpacing = -0.01f
    }
    center.addView(titleView, LinearLayout.LayoutParams(match, wrap).apply { topMargin = dp(28) })
    subtitleView = TextView(this).apply {
      setTextColor(palette.subtitle)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
      gravity = Gravity.CENTER
      setLineSpacing(0f, 1.25f)
    }
    center.addView(subtitleView, LinearLayout.LayoutParams(match, wrap).apply { topMargin = dp(10) })
    root.addView(center, FrameLayout.LayoutParams(match, wrap, Gravity.CENTER).apply { bottomMargin = dp(64) })

    val bottom = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
    }
    val primary = TextView(this).apply {
      text = "Back to focus"
      setTextColor(Color.WHITE)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
      typeface = Typeface.DEFAULT_BOLD
      gravity = Gravity.CENTER
      isClickable = true
      isFocusable = true
      val shape = GradientDrawable().apply {
        cornerRadius = dp(16).toFloat()
        setColor(palette.primaryFill)
      }
      background = RippleDrawable(ColorStateList.valueOf(palette.ripple), shape, null)
      setOnClickListener { goHome() }
    }
    bottom.addView(primary, LinearLayout.LayoutParams(match, dp(52)))
    secondaryButton = TextView(this).apply {
      setTextColor(palette.subtitle)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
      typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
      gravity = Gravity.CENTER
      isClickable = true
      isFocusable = true
      background = RippleDrawable(
        ColorStateList.valueOf(palette.ripple),
        null,
        GradientDrawable().apply {
          cornerRadius = dp(16).toFloat()
          setColor(Color.WHITE)
        }
      )
      setOnClickListener { openUnlockFlow() }
    }
    bottom.addView(secondaryButton, LinearLayout.LayoutParams(match, dp(48)).apply { topMargin = dp(8) })
    root.addView(bottom, FrameLayout.LayoutParams(match, wrap, Gravity.BOTTOM))

    return root
  }

  private fun buildIcon(): View {
    val frame = FrameLayout(this).apply { clipChildren = false }
    iconView = ImageView(this).apply {
      scaleType = ImageView.ScaleType.FIT_CENTER
      clipToOutline = true
      outlineProvider = object : ViewOutlineProvider() {
        override fun getOutline(view: View, outline: Outline) {
          outline.setRoundRect(0, 0, view.width, view.height, dp(14).toFloat())
        }
      }
    }
    frame.addView(iconView, FrameLayout.LayoutParams(match, match))

    val badgeSize = dp(26)
    val badge = ImageView(this).apply {
      setImageResource(R.drawable.stb_ic_notification)
      imageTintList = ColorStateList.valueOf(Color.WHITE)
      setPadding(dp(6), dp(6), dp(6), dp(6))
      background = GradientDrawable().apply {
        shape = GradientDrawable.OVAL
        setColor(palette.lockBadge)
        setStroke(dp(2), palette.bg)
      }
      translationX = dp(8).toFloat()
      translationY = dp(8).toFloat()
    }
    frame.addView(badge, FrameLayout.LayoutParams(badgeSize, badgeSize, Gravity.BOTTOM or Gravity.END))
    return frame
  }

  private val match = ViewGroup.LayoutParams.MATCH_PARENT
  private val wrap = ViewGroup.LayoutParams.WRAP_CONTENT

  private fun dp(value: Int): Int =
    TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value.toFloat(), resources.displayMetrics).toInt()
}
