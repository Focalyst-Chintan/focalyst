import WidgetKit
import SwiftUI
internal import ExpoWidgets

@main
struct ExportWidgets0: WidgetBundle {
  var body: some Widget {
    StreakWidget()
    HeatmapWidget()
    TodoWidget()
    CountdownWidget()
    ExportWidgets1().body
  }
}

struct ExportWidgets1: WidgetBundle {
  var body: some Widget {
    PomodoroWidget()
    CalendarWidget()
    WidgetLiveActivity()
  }
}

extension View {
  @ViewBuilder func focalystWidgetBackground<B: View>(_ background: B) -> some View {
    if #available(iOSApplicationExtension 17.0, *) {
      self.containerBackground(for: .widget) { background }
    } else {
      self.background(background)
    }
  }
}

/// The selected widget theme's background. Same colours the widgets in src/widgets used to paint
/// on their root view; the system drops it in the accented (Tinted / Clear) modes.
struct FocalystThemeBackground: View {
  let widget: String
  let props: [String: Any]?
  @Environment(\.colorScheme) private var colorScheme
  @Environment(\.widgetRenderingMode) private var renderingMode

  var body: some View {
    if renderingMode == .accented || renderingMode == .vibrant {
      return Color.clear
    }
    let hex = backgroundHex
    return Color(
      red: Double((hex >> 16) & 0xFF) / 255,
      green: Double((hex >> 8) & 0xFF) / 255,
      blue: Double(hex & 0xFF) / 255
    )
  }

  private var backgroundHex: UInt32 {
    let fallback: String
    switch widget {
    case "StreakWidget": fallback = "ember"
    case "CountdownWidget": fallback = "emerald"
    default: fallback = "cobalt"
    }
    let preset = (props?["preset"] as? String) ?? fallback
    if preset == "monochrome" {
      // Auto light/dark: follows the home screen's colour scheme.
      return colorScheme == .dark ? 0x0B0B0F : 0xFFFFFF
    }
    if preset == "white" {
      return widget == "CalendarWidget" ? 0xFFFFFF : 0xF8FAFC
    }
    let palette: [String: UInt32] = widget == "HeatmapWidget"
      ? ["ember": 0x140703, "cobalt": 0x060C1A, "emerald": 0x04120D, "violet": 0x0A0517, "crimson": 0x160408, "amber": 0x140D03]
      : ["ember": 0x160804, "cobalt": 0x060D1F, "emerald": 0x05140F, "violet": 0x0C061C, "crimson": 0x190509, "amber": 0x170F04]
    return palette[preset] ?? palette[fallback] ?? 0x090A0F
  }
}
