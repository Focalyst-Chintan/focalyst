'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { peekCheckoutIntent, clearCheckoutIntent } from '@/lib/billing/checkoutIntent';
import { isPaidPlan } from '@/lib/featureGates';
import { startCheckout } from '@/lib/billing/checkout';
import { useToast, GlobalToastContainer } from '@/components/desktop/ui/Toast';
import { FocusRing } from '@/components/desktop/focus/FocusRing';

export default function CheckoutIntentRunner() {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const toast = useToast();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    const intent = peekCheckoutIntent();
    if (!intent) return;

    const run = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        ranRef.current = true;
        clearCheckoutIntent();

        const { data: profile } = await supabase
          .from('users')
          .select('plan, plan_expires_at')
          .eq('id', user.id)
          .maybeSingle();

        if (isPaidPlan(profile?.plan, profile?.plan_expires_at)) {
          toast.show('You already have Focalyst Pro.', 'info');
          return;
        }

        setIsCheckingOut(true);
        const res = await startCheckout(intent, { returnPath: '/pricing' });
        if (!res.ok) {
          setIsCheckingOut(false);
          toast.show(res.message || 'Could not open checkout.', 'error');
        }
      } catch (err: any) {
        setIsCheckingOut(false);
        toast.show(err?.message || 'Could not open checkout.', 'error');
      }
    };

    run();
  }, [toast]);

  return (
    <>
      <GlobalToastContainer />
      {isCheckingOut && (
        <div
          className="dark fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#05070F] text-snow gap-4"
          data-theme="dark"
          style={{ colorScheme: 'dark' }}
        >
          <div className="animate-spin">
            <FocusRing progress={0.3} size="56px" />
          </div>
          <p className="font-ui text-sm font-medium text-snow/90">
            Opening secure checkout
          </p>
        </div>
      )}
    </>
  );
}
