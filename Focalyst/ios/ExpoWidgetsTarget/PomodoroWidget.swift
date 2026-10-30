import WidgetKit
import SwiftUI
internal import ExpoWidgets

struct PomodoroWidget: Widget {
  let name: String = "PomodoroWidget"

  var body: some WidgetConfiguration {
    let config = StaticConfiguration(kind: name, provider: WidgetsTimelineProvider(name: name)) { entry in
      let isRunning = (entry.props?["isRunning"] as? Bool) ?? false
      let action = isRunning ? "end" : "start"
      let view = WidgetsEntryView(entry: entry)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .unredacted()
        .widgetURL(URL(string: "focalyst://focus?action=\(action)"))

      view.focalystWidgetBackground(FocalystThemeBackground(widget: name, props: entry.props))
    }
    .configurationDisplayName("Focus Timer")
    .description("Quick-start and track your Pomodoro focus sessions.")
    .supportedFamilies([.systemSmall, .systemMedium])

    if #available(iOS 17.0, *) {
      return config.contentMarginsDisabled()
    } else {
      return config
    }
  }
}