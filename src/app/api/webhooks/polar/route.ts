import { Webhooks } from '@polar-sh/nextjs';
import { applyPolarEvent } from '@/lib/billing/sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
  onOrderCreated: async (p) => applyPolarEvent('order.created', p.data),
  onOrderUpdated: async (p) => applyPolarEvent('order.updated', p.data),
  onOrderPaid: async (p) => applyPolarEvent('order.paid', p.data),
  onOrderRefunded: async (p) => applyPolarEvent('order.refunded', p.data),
  onSubscriptionActive: async (p) => applyPolarEvent('subscription.active', p.data),
  onSubscriptionUpdated: async (p) => applyPolarEvent('subscription.updated', p.data),
  onSubscriptionUncanceled: async (p) => applyPolarEvent('subscription.uncanceled', p.data),
  onSubscriptionCanceled: async (p) => applyPolarEvent('subscription.canceled', p.data),
  onSubscriptionRevoked: async (p) => applyPolarEvent('subscription.revoked', p.data),
});
