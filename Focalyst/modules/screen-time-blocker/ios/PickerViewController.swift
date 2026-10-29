import UIKit
import SwiftUI
import FamilyControls

struct FocalystActivityPickerView: View {
  @State private var selection: FamilyActivitySelection
  let title: String
  let onCancel: () -> Void
  let onDone: (FamilyActivitySelection) -> Void

  init(
    initialSelection: FamilyActivitySelection,
    title: String,
    onCancel: @escaping () -> Void,
    onDone: @escaping (FamilyActivitySelection) -> Void
  ) {
    _selection = State(initialValue: initialSelection)
    self.title = title
    self.onCancel = onCancel
    self.onDone = onDone
  }

  var body: some View {
    NavigationView {
      FamilyActivityPicker(selection: $selection)
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
          ToolbarItem(placement: .cancellationAction) {
            Button("Cancel", action: onCancel)
          }
          ToolbarItem(placement: .confirmationAction) {
            Button("Done") { onDone(selection) }
              .fontWeight(.semibold)
          }
        }
    }
    .navigationViewStyle(.stack)
  }
}

final class PickerViewController: UIHostingController<FocalystActivityPickerView> {
  /// Presents the FamilyActivityPicker for `mode`. `completion` is called exactly once, on the main thread,
  /// with the saved selection's counts (unchanged counts on Cancel).
  static func present(mode: SelectionMode, completion: @escaping ([String: Int]) -> Void) {
    guard let presenter = getTopViewController() else {
      completion(summary(of: SharedStorage.selection(mode)))
      return
    }

    var finished = false
    weak var controller: PickerViewController?
    let finish: (FamilyActivitySelection?) -> Void = { picked in
      guard !finished else { return }
      finished = true
      if let picked {
        SharedStorage.saveSelection(picked, mode: mode)
      }
      let result = summary(of: SharedStorage.selection(mode))
      if let controller {
        controller.dismiss(animated: true) { completion(result) }
      } else {
        completion(result)
      }
    }

    let root = FocalystActivityPickerView(
      initialSelection: SharedStorage.selection(mode),
      title: mode == .allowed ? "Always Allowed" : "Apps to Block",
      onCancel: { finish(nil) },
      onDone: { finish($0) }
    )
    let picker = PickerViewController(rootView: root)
    picker.modalPresentationStyle = .pageSheet
    // Swipe-to-dismiss would skip both buttons and leave the JS promise pending.
    picker.isModalInPresentation = true
    controller = picker
    presenter.present(picker, animated: true)
  }

  static func summary(of selection: FamilyActivitySelection) -> [String: Int] {
    [
      "appCount": selection.applicationTokens.count,
      "categoryCount": selection.categoryTokens.count,
      "webCount": selection.webDomainTokens.count
    ]
  }

  /// Walks `presentedViewController` from the foreground scene's key window, so the picker
  /// presents on top of React Native modals instead of failing silently underneath them.
  static func getTopViewController() -> UIViewController? {
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    let scene = scenes.first { $0.activationState == .foregroundActive } ?? scenes.first
    let window = scene?.windows.first { $0.isKeyWindow } ?? scene?.windows.first
    var top = window?.rootViewController
    while let presented = top?.presentedViewController, !presented.isBeingDismissed {
      top = presented
    }
    return top
  }
}
