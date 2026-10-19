'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Users, UserPlus } from 'lucide-react';
import { Button } from '@/components/desktop/ui/Button';

export default function GroupsPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-[540px] mx-auto text-center px-4">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary-text mb-4">
        <Users className="w-7 h-7" />
      </div>
      <h1 className="font-display text-[32px] font-normal text-ink mb-2">
        Habit Accountability Groups
      </h1>
      <p className="font-ui text-[15px] text-ink-3 mb-6 leading-relaxed">
        Join or create accountability groups to track consistency with friends and teammates.
      </p>
      <div className="flex items-center gap-3">
        <Button variant="primary" size="md" onClick={() => router.push('/today')}>
          Back to Today
        </Button>
      </div>
    </div>
  );
}
