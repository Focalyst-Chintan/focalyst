import ExpoModulesCore
import SwiftUI
import FamilyControls
import ManagedSettings

final class AppTokenLabelModel: ObservableObject {
  @Published var token: ApplicationToken?
  @Published var size: CGFloat = 40
  @Published var showTitle = false
}

struct AppTokenLabelContent: View {
  @ObservedObject var model: AppTokenLabelModel

  var body: some View {
    let shape = RoundedRectangle(cornerRadius: model.size * 0.22, style: .continuous)
    VStack(spacing: 4) {
      if let token = model.token {
        Label(token)
          .labelStyle(.iconOnly)
          .scaleEffect(model.size / 28)
          .frame(width: model.size, height: model.size)
          .clipShape(shape)
        if model.showTitle {
          Label(token)
            .labelStyle(.titleOnly)
            .font(.system(size: 13))
            .lineLimit(1)
            .frame(maxWidth: max(model.size, 64))
        }
      } else {
        shape
          .fill(Color.gray.opacity(0.18))
          .frame(width: model.size, height: model.size)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

final class AppTokenLabelView: ExpoView {
  private let model = AppTokenLabelModel()
  private lazy var host = UIHostingController(rootView: AppTokenLabelContent(model: model))

  var tokenIndex = 0 { didSet { reloadToken() } }
  var mode: SelectionMode = .blocklist { didSet { reloadToken() } }

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = false
    host.view.backgroundColor = .clear
    host.view.translatesAutoresizingMaskIntoConstraints = false
    addSubview(host.view)
    NSLayoutConstraint.activate([
      host.view.topAnchor.constraint(equalTo: topAnchor),
      host.view.bottomAnchor.constraint(equalTo: bottomAnchor),
      host.view.leadingAnchor.constraint(equalTo: leadingAnchor),
      host.view.trailingAnchor.constraint(equalTo: trailingAnchor)
    ])
    reloadToken()
  }

  func setSize(_ size: Double) {
    model.size = CGFloat(max(size, 1))
  }

  func setShowTitle(_ show: Bool) {
    model.showTitle = show
  }

  /// Focalyst has its own dark mode toggle, so the label can't rely on the system appearance.
  func setColorScheme(_ scheme: String?) {
    let style: UIUserInterfaceStyle = scheme == "dark" ? .dark : scheme == "light" ? .light : .unspecified
    overrideUserInterfaceStyle = style
    host.overrideUserInterfaceStyle = style
  }

  private func reloadToken() {
    let tokens = SharedStorage.orderedApplicationTokens(mode)
    model.token = tokens.indices.contains(tokenIndex) ? tokens[tokenIndex] : nil
  }
}
