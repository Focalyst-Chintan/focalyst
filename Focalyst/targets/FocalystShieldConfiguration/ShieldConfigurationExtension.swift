import ManagedSettings
import ManagedSettingsUI
import UIKit

/// The screen iOS shows over a blocked app or site: a dark, minimal Focalyst shield (spec S9).
///
/// Not marked `@objc(ShieldConfigurationExtension)`: Info.plist names the principal class
/// `$(PRODUCT_MODULE_NAME).ShieldConfigurationExtension`, and an unprefixed @objc name would make
/// iOS fail to find the class and fall back to its default "Restricted" screen.
class ShieldConfigurationExtension: ShieldConfigurationDataSource {
  private static let darkBg = UIColor(red: 15 / 255, green: 18 / 255, blue: 32 / 255, alpha: 1)
  private static let subtitleColor = UIColor(red: 154 / 255, green: 160 / 255, blue: 180 / 255, alpha: 1)
  private static let accentOrange = UIColor(red: 238 / 255, green: 119 / 255, blue: 66 / 255, alpha: 1)

  private static let shieldSymbol: UIImage? = {
    let config = UIImage.SymbolConfiguration(pointSize: 44, weight: .bold)
    return UIImage(systemName: "shield.lefthalf.filled", withConfiguration: config)?
      .withTintColor(.white, renderingMode: .alwaysOriginal)
  }()

  override func configuration(shielding application: Application) -> ShieldConfiguration {
    build(targetName: application.localizedDisplayName ?? "This app")
  }

  override func configuration(shielding application: Application, in category: ActivityCategory) -> ShieldConfiguration {
    build(targetName: application.localizedDisplayName ?? "This app")
  }

  override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
    build(targetName: webDomain.domain ?? "This website")
  }

  override func configuration(shielding webDomain: WebDomain, in category: ActivityCategory) -> ShieldConfiguration {
    build(targetName: webDomain.domain ?? "This website")
  }

  private func build(targetName: String) -> ShieldConfiguration {
    // Count the attempt in the shared session log the app reads (count is approximate: iOS may cache shields).
    SharedStorage.recordAttempt(appId: targetName)

    let defaults = SharedStorage.defaults
    let level = (defaults.string(forKey: SharedStorage.ShieldKey.level) ?? "firm").lowercased()
    let unlocksLeft = defaults.object(forKey: SharedStorage.ShieldKey.unlocksLeft) != nil
      ? defaults.integer(forKey: SharedStorage.ShieldKey.unlocksLeft)
      : 2
    let endMs = defaults.double(forKey: SharedStorage.ShieldKey.endTimestampMs)

    var until = "your break"
    if endMs > 0 {
      let formatter = DateFormatter()
      formatter.dateFormat = "h:mm a"
      until = formatter.string(from: Date(timeIntervalSince1970: endMs / 1000))
    }

    let subtitle: String
    var secondary: ShieldConfiguration.Label?
    switch level {
    case "gentle":
      subtitle = "To unblock, tap below or open Focalyst.\nOpens automatically at \(until)."
      secondary = ShieldConfiguration.Label(text: "Open anyway", color: Self.accentOrange)
    case "firm" where unlocksLeft > 0:
      subtitle = "To unblock, open Focalyst or tap below.\nOpens automatically at \(until)."
      secondary = ShieldConfiguration.Label(text: "I need it (\(unlocksLeft) left)", color: Self.accentOrange)
    case "firm":
      subtitle = "You've used both unlocks for this session.\nOpens automatically at \(until)."
      secondary = nil
    default:
      subtitle = "You're in Locked Mode until \(until).\nTo use emergency unblock, open Focalyst."
      secondary = ShieldConfiguration.Label(text: "Emergency options", color: Self.accentOrange)
    }

    return ShieldConfiguration(
      backgroundBlurStyle: .systemUltraThinMaterialDark,
      backgroundColor: Self.darkBg,
      icon: Self.shieldSymbol,
      title: ShieldConfiguration.Label(text: "\(targetName) is blocked by Focalyst", color: .white),
      subtitle: ShieldConfiguration.Label(text: subtitle, color: Self.subtitleColor),
      primaryButtonLabel: ShieldConfiguration.Label(text: "Close", color: Self.darkBg),
      primaryButtonBackgroundColor: .white,
      secondaryButtonLabel: secondary
    )
  }
}
