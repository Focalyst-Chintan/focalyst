import Link from 'next/link';
import PublicLayout from '@/components/desktop/public/PublicLayout';

export default function NotFound() {
  return (
    <PublicLayout>
      <div className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-6">
        <div className="frost mx-auto my-12 max-w-[520px] rounded-[28px] p-10 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
            404
          </div>
          <h1 className="mt-3 font-display text-[36px] leading-[42px] text-ink">
            This page took a focus break.
          </h1>
          <p className="mt-2 text-[15px] leading-[24px] text-ink-2">
            It may have moved, or the link may be incomplete.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/today"
              className="inline-flex h-10 items-center justify-center rounded-[14px] bg-primary px-5 text-[14px] font-medium text-snow transition-colors hover:bg-primary-hover"
            >
              Go to Today
            </Link>
            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-[14px] border border-line bg-surface-2 px-5 text-[14px] font-medium text-ink transition-colors hover:bg-surface-3"
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
