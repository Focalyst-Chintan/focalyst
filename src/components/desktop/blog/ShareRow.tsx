'use client';

import { useState } from 'react';
import { Check, Link2 } from 'lucide-react';

export default function ShareRow({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const links = [
    { label: 'X', href: `https://x.com/intent/post?url=${u}&text=${t}` },
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { label: 'WhatsApp', href: `https://wa.me/?text=${t}%20${u}` },
  ];

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-6">
      <span className="mr-1 text-[13px] text-ink-3">Share</span>
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noopener"
          className="frost rounded-full px-3 py-1.5 text-[13px] font-medium text-ink-2 hover:text-ink"
        >
          {l.label}
        </a>
      ))}
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(url).then(() => setCopied(true), () => {});
        }}
        className="frost inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-ink-2 hover:text-ink"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </div>
  );
}
