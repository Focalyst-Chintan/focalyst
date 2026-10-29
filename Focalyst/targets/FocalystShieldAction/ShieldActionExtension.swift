import ManagedSettings
import UserNotifications

/// Handles the shield's buttons. "Stay Focused" closes it; "Unblock in Focalyst" hands off to the
/// app through a pending request plus a notification that deep-links to the unlock flow.
class ShieldActionExtension: ShieldActionDelegate {
  override func handle(
    action: ShieldAction,
    for application: ApplicationToken,
    completionHandler: @escaping (ShieldActionResponse) -> Void
  ) {
    respond(action, appToken: try? JSONEncoder().encode(application), webToken: nil, completionHandler)
  }

  override func handle(
    action: ShieldAction,
    for webDomain: WebDomainToken,
    completionHandler: @escaping (ShieldActionResponse) -> Void
  ) {
    respond(action, appToken: nil, webToken: try? JSONEncoder().encode(webDomain), completionHandler)
  }

  override func handle(
    action: ShieldAction,
    for category: ActivityCategoryToken,
    completionHandler: @escaping (ShieldActionResponse) -> Void
  ) {
    respond(action, appToken: nil, webToken: nil, completionHandler)
  }

  private func respond(
    _ action: ShieldAction,
    appToken: Data?,
    webToken: Data?,
    _ completionHandler: @escaping (ShieldActionResponse) -> Void
  ) {
    guard action == .secondaryButtonPressed else {
      completionHandler(.close)
      return
    }

    SharedStorage.pendingUnlockRequest = PendingUnlockRequest(
      timestamp: SharedStorage.nowMs(),
      level: SharedStorage.session.level,
      appName: nil,
      applicationTokenData: appToken,
      webDomainTokenData: webToken
    )

    let content = UNMutableNotificationContent()
    content.title = "Unblock in Focalyst"
    content.body = "Tap to choose your unblock duration in Focalyst."
    content.sound = .default
    content.interruptionLevel = .timeSensitive
    content.userInfo = ["url": "focalyst://blocking/unlock"]

    let request = UNNotificationRequest(
      identifier: "focalyst.shield.unlock",
      content: content,
      trigger: UNTimeIntervalNotificationTrigger(timeInterval: 0.1, repeats: false)
    )
    // Close only after the notification is queued; the extension may be torn down right after.
    UNUserNotificationCenter.current().add(request) { _ in
      completionHandler(.close)
    }
  }
}
