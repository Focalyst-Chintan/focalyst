import WidgetKit
import SwiftUI
internal import ExpoWidgets

struct HeatmapWidget: Widget {
  let name: String = "HeatmapWidget"

  var body: some WidgetConfiguration {
    let config = StaticConfiguration(kind: name, provider: WidgetsTimelineProvider(name: name)) { entry in
      let view = WidgetsEntryView(entry: entry)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .unredacted()

      view.focalystWidgetBackground(FocalystThemeBackground(widget: name, props: entry.props))
    }
    .configurationDisplayName("Monthly Consistency")
    .description("Visualize your monthly habit heatmap squares.")
    .supportedFamilies([.systemSmall, .systemMedium])

    if #available(iOS 17.0, *) {
      return config.contentMarginsDisabled()
    } else {
      return config
    }
  }
}