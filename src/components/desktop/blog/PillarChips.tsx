import Link from 'next/link';
import { PILLARS, PILLAR_KEYS, type Pillar } from '@/lib/blog/constants';

export default function PillarChips({ active }: { active?: Pillar }) {
  return (
    <nav aria-label="Topics" className="flex flex-wrap items-center justify-center gap-2">
      {PILLAR_KEYS.map((key) => (
        <Link
          key={key}
          href={`/blog/topics/${key}`}
          aria-current={active === key ? 'page' : undefined}
          className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
            active === key ? 'bg-primary text-white' : 'frost text-ink-2 hover:text-ink'
          }`}
        >
          {PILLARS[key].name}
        </Link>
      ))}
    </nav>
  );
}
