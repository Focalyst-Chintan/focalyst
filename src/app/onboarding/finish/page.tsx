import type { Metadata } from 'next';
import FinishFlow from './FinishFlow';

export const metadata: Metadata = {
  title: { absolute: 'Get started · Focalyst' },
  robots: { index: false, follow: false },
};

// A server wrapper only for the metadata; everything runs in the client FinishFlow (no route handler).
export default function OnboardingFinishPage() {
  return <FinishFlow />;
}
