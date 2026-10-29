import type { Metadata } from 'next';
import GetApp from './GetApp';

export const metadata: Metadata = {
  title: { absolute: 'Get started · Focalyst' },
  robots: { index: false, follow: false },
};

export default function GetAppPage() {
  return <GetApp />;
}
