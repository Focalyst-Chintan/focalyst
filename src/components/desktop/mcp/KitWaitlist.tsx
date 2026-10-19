'use client';
import { FormEvent, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';

const KIT_FORM_ACTION = 'https://app.kit.com/forms/10065151/subscriptions';
type Status = 'idle' | 'loading' | 'success' | 'error';

export default function KitWaitlist({
  defaultEmail = '',
  firstName,
}: {
  defaultEmail?: string;
  firstName?: string;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const value = email.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError('Enter a valid email.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setError('');

    let res: Response;
    try {
      res = await fetch(KIT_FORM_ACTION, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });
    } catch {
      form.submit();
      setStatus('success');
      return;
    }

    if (!res.ok) {
      setError('Could not join right now. Try again.');
      setStatus('error');
      return;
    }
    setStatus('success');
  }

  if (status === 'success') {
    return (
      <div className="glass liquid flex h-[60px] items-center justify-center gap-3 rounded-full px-6 text-[15px] font-medium text-ink">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-snow">
          <Check className="h-4 w-4" strokeWidth={2.25} />
        </span>
        You&apos;re on the list. We&apos;ll email you first.
      </div>
    );
  }

  return (
    <div>
      <form
        action={KIT_FORM_ACTION}
        method="post"
        target="_blank"
        noValidate
        onSubmit={onSubmit}
        className="glass liquid flex h-[60px] items-center gap-2 rounded-full p-1.5 pl-6"
      >
        {firstName ? <input type="hidden" name="fields[first_name]" value={firstName} /> : null}
        <input
          type="email"
          name="email_address"
          required
          autoComplete="email"
          aria-label="Email address"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === 'error') setStatus('idle');
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink-3 outline-none"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="flex h-12 shrink-0 items-center gap-2 rounded-full bg-primary px-6 text-[15px] font-semibold text-snow transition-colors duration-150 hover:bg-primary-hover disabled:opacity-70 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)]"
        >
          {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Join the waitlist
        </button>
      </form>
      {status === 'error' && error ? (
        <p role="alert" className="mt-2 pl-6 text-[13px] text-danger">{error}</p>
      ) : null}
    </div>
  );
}
