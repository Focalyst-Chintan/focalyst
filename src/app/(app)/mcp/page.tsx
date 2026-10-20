'use client';

import React, { useEffect, useState } from 'react';
import McpView from '@/components/desktop/mcp/McpView';
import { createClient } from '@/lib/supabase';

export default function MCPPage() {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          setEmail(session.user.email);
        }
        const { data: profile } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', session?.user?.id)
          .maybeSingle();

        if (profile?.full_name) {
          const first = profile.full_name.trim().split(/\s+/)[0];
          setFirstName(first);
        }
      } catch {
        // ignore
      }
    }
    loadUser();
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1200px] py-6">
      <McpView defaultEmail={email} firstName={firstName} isSignedIn={true} />
    </div>
  );
}
