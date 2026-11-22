import Constants, { ExecutionEnvironment } from 'expo-constants';

function getExpoWidgetsCreateWidget(): ((name: string, component: any, initialProps: any) => any) | null {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return null;
  }
  try {
    const mod = require('expo-widgets');
    return typeof mod?.createWidget === 'function' ? mod.createWidget : null;
  } catch {
    return null;
  }
}

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
  const createWidget = getExpoWidgetsCreateWidget();
  if (!createWidget) {
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

  try {
    const widget = createWidget(name, component, initialProps);
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
