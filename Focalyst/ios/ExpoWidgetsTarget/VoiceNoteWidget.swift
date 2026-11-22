import WidgetKit
import SwiftUI
internal import ExpoWidgets

struct VoiceNoteWidget: Widget {
  let name: String = "VoiceNoteWidget"

  var body: some WidgetConfiguration {
    let config = StaticConfiguration(kind: name, provider: WidgetsTimelineProvider(name: name)) { entry in
      let view = WidgetsEntryView(entry: entry)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .unredacted()
        .widgetURL(URL(string: "focalyst://voice-note?action=start"))

      view.focalystWidgetBackground(FocalystThemeBackground(widget: name, props: entry.props))
    }
    .configurationDisplayName("Voice Note")
    .description("Start recording a voice note instantly.")
    .supportedFamilies([.systemSmall])

    if #available(iOS 17.0, *) {
      return config.contentMarginsDisabled()
    } else {
      return config
    }
  }
}
