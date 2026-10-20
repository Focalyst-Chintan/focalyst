'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { BlogPost } from '@/lib/blog/source';

export default function PostCard({ post }: { post: BlogPost }) {
  return (
    <article className="frost group flex flex-col overflow-hidden rounded-[22px] transition-transform duration-200 hover:-translate-y-1">
      {post.coverImageUrl ? (
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-2">
          <Image
            src={post.coverImageUrl}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center gap-2 text-[12px] text-ink-3">
          <span>{post.publishedAt}</span>
          <span>·</span>
          <span>{post.readingMinutes} min read</span>
        </div>
        <h3 className="mt-2.5 text-[18px] font-semibold leading-[26px] text-ink group-hover:text-primary-text">
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-[14px] leading-[22px] text-ink-2">
          {post.description}
        </p>
        <div className="mt-auto pt-4 flex flex-wrap gap-1.5">
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
    </article>
  );
}
