package expo.modules.screentimeblocker

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Resumes an unfinished focus block after the phone restarts. */
class BootCompletedReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    if (intent?.action != Intent.ACTION_BOOT_COMPLETED) return
    val now = System.currentTimeMillis()
    BlockerSharedPrefs.advanceIfNeeded(context, now)
    val session = BlockerSharedPrefs.session(context)
    val sessionRunning = session.isSessionActive && session.phaseEndTimestamp > now
    if (sessionRunning || BlockerSharedPrefs.isQuickBlockActive(context)) {
      FocusForegroundService.start(context)
    }
  }
}
