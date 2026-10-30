import { createWidget } from 'expo-widgets';

export type SafeWidgetController<T> = {
  updateSnapshot: (props: T) => void;
  updateTimeline: (entries: { date: Date; props: T }[]) => void;
  getTimeline: () => Promise<{ date?: Date; props?: T }[]>;
};

export function safeCreateWidget<T extends Record<string, any>>(
  name: string,
  component: any,
  initialProps: T
): SafeWidgetController<T> {
  try {
    const widget = (createWidget as any)(name, component, initialProps);
    return {
      updateSnapshot: (props: T) => {
        try {
          widget?.updateSnapshot?.(props);
        } catch {}
      },
      updateTimeline: (entries: { date: Date; props: T }[]) => {
        try {
          if (typeof widget?.updateTimeline === 'function') {
            widget.updateTimeline(entries);
          } else if (entries.length > 0) {
            widget?.updateSnapshot?.(entries[0].props);
          }
        } catch {}
      },
      getTimeline: async () => {
        try {
          return (await widget?.getTimeline?.()) ?? [];
        } catch {
          return [];
        }
      },
    };
  } catch {
    let latestProps = initialProps;
    return {
      updateSnapshot: (props: T) => {
        latestProps = props;
      },
      updateTimeline: (entries: { date: Date; props: T }[]) => {
        if (entries.length > 0) latestProps = entries[0].props;
      },
      getTimeline: async () => [{ date: new Date(), props: latestProps }],
    };
  }
}
