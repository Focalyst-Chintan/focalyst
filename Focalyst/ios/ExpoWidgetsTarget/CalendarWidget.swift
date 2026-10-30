import WidgetKit
import SwiftUI
internal import ExpoWidgets

struct CalendarWidget: Widget {
  let name: String = "CalendarWidget"

  var body: some WidgetConfiguration {
    let config = StaticConfiguration(kind: name, provider: WidgetsTimelineProvider(name: name)) { entry in
      let view = WidgetsEntryView(entry: entry)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .unredacted()
        .widgetURL(URL(string: "focalyst://?view=calendar"))

      view.focalystWidgetBackground(FocalystThemeBackground(widget: name, props: entry.props))
    }
    .configurationDisplayName("Calendar & Reminders")
    .description("View today’s date, calendar schedule, and reminder events.")
    .supportedFamilies([.systemSmall, .systemMedium])

    if #available(iOS 17.0, *) {
      return config.contentMarginsDisabled()
    } else {
      return config
    }
  }
}