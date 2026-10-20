'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import PublicLayout from '@/components/desktop/public/PublicLayout';
import type { BlogPost } from '@/lib/blog/source';

export default function ArticleLayout({
  post,
  children,
}: {
  post: BlogPost;
  children: React.ReactNode;
}) {
  return (
    <PublicLayout>
      <div className="mx-auto w-full max-w-[800px] px-4 py-8 sm:px-6">
        <div className="mb-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-[14px] font-medium text-ink-3 transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to blog</span>
          </Link>
        </div>

        <header className="mb-10">
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
            <span>{post.publishedAt}</span>
            <span>·</span>
            <span>{post.readingMinutes} min read</span>
            <span>·</span>
            <div className="flex gap-1.5">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] font-medium text-ink-3"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <h1 className="mt-4 font-display text-[clamp(36px,5vw,52px)] leading-[1.1] text-ink">
            {post.title}
          </h1>

          <p className="mt-4 text-[18px] leading-[28px] text-ink-2">
            {post.description}
          </p>
        </header>

        {post.coverImageUrl ? (
          <div className="relative mb-12 aspect-[16/9] w-full overflow-hidden rounded-[24px] bg-surface-2">
            <Image
              src={post.coverImageUrl}
              alt={post.title}
              fill
              className="object-cover"
            />
          </div>
        ) : null}

        <article className="fx-article">{children}</article>
      </div>
    </PublicLayout>
  );
}
