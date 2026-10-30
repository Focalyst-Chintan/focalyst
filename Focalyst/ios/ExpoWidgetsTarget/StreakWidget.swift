import WidgetKit
import SwiftUI
internal import ExpoWidgets

struct StreakWidget: Widget {
  let name: String = "StreakWidget"

  var body: some WidgetConfiguration {
    let config = StaticConfiguration(kind: name, provider: WidgetsTimelineProvider(name: name)) { entry in
      let view = WidgetsEntryView(entry: entry)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .unredacted()

      view.focalystWidgetBackground(FocalystThemeBackground(widget: name, props: entry.props))
    }
    .configurationDisplayName("Habit Streak")
    .description("Track your active streak and total habit days.")
    .supportedFamilies([.systemSmall, .systemMedium])

    if #available(iOS 17.0, *) {
      return config.contentMarginsDisabled()
    } else {
      return config
    }
  }
}