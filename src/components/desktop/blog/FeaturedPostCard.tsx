'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { BlogPost } from '@/lib/blog/source';

export default function FeaturedPostCard({ post }: { post: BlogPost }) {
  return (
    <article className="glass liquid group grid grid-cols-1 overflow-hidden rounded-[28px] border border-line md:grid-cols-2">
      {post.coverImageUrl ? (
        <div className="relative min-h-[260px] w-full overflow-hidden bg-surface-2 md:min-h-full">
          <Image
            src={post.coverImageUrl}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      ) : (
        <div className="relative flex min-h-[260px] items-center justify-center bg-surface-2 p-8">
          <span className="font-display text-[32px] italic text-ink-3">Featured</span>
        </div>
      )}
      <div className="flex flex-col p-8 md:p-10">
        <div className="flex items-center gap-2 text-[12px] text-ink-3">
          <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-semibold text-primary-text">
            Featured
          </span>
          <span>·</span>
          <span>{post.publishedAt}</span>
          <span>·</span>
          <span>{post.readingMinutes} min read</span>
        </div>
        <h2 className="mt-4 font-display text-[28px] leading-[34px] text-ink group-hover:text-primary-text sm:text-[34px]">
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h2>
        <p className="mt-3 text-[15px] leading-[24px] text-ink-2">
          {post.description}
        </p>
        <div className="mt-auto pt-6 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-surface-2 px-3 py-1 text-[12px] font-medium text-ink-3"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}
