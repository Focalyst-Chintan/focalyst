import { Redirect } from 'expo-router';

// The old onboarding name screen is gone. The paywall still links here for signed-in users
// who haven't onboarded, so this path forwards to the new flow.
export default function OldOnboardingName() {
  return <Redirect href={{ pathname: '/onboarding', params: { signedIn: '1' } } as any} />;
}
