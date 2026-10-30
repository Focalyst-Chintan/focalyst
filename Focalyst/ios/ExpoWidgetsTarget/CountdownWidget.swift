import WidgetKit
import SwiftUI
internal import ExpoWidgets

struct CountdownWidget: Widget {
  let name: String = "CountdownWidget"

  var body: some WidgetConfiguration {
    let config = StaticConfiguration(kind: name, provider: WidgetsTimelineProvider(name: name)) { entry in
      let view = WidgetsEntryView(entry: entry)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .unredacted()
        .widgetURL(URL(string: "focalyst://?view=countdown"))

      view.focalystWidgetBackground(FocalystThemeBackground(widget: name, props: entry.props))
    }
    .configurationDisplayName("Day Countdown")
    .description("Count down days, hours, and minutes to your next milestone.")
    .supportedFamilies([.systemSmall, .systemMedium])

    if #available(iOS 17.0, *) {
      return config.contentMarginsDisabled()
    } else {
      return config
    }
  }
}