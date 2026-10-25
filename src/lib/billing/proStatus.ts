import { isPaidPlan } from '@/lib/featureGates';

export function hasPro(
  profile: { plan?: string | null; plan_expires_at?: string | null } | null | undefined,
  storeActive: boolean = false
): boolean {
  return storeActive || isPaidPlan(profile?.plan, profile?.plan_expires_at);
}
