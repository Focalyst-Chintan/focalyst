import { PILLARS, type Pillar } from '@/lib/blog/constants';

// Brand gradient tile used instead of a cover photo (same look as the OG image)
export default function TypographicCover({
  title,
  pillar,
  size = 'hero',
}: {
  title: string;
  pillar: Pillar | null;
  size?: 'hero' | 'card';
}) {
  const hero = size === 'hero';
  return (
    <div
      className={`relative w-full overflow-hidden ${
        hero ? 'aspect-[16/10] rounded-[24px] md:aspect-[21/9]' : 'aspect-[16/9]'
      }`}
      style={{
        background:
          'radial-gradient(120% 120% at 0% 100%, #1951FC 0%, #0B2CB1 45%, #03195B 100%)',
      }}
      aria-hidden="true"
    >
      <div className="ambient-grain" style={{ opacity: 0.08 }} />
      <div className={`relative flex h-full flex-col justify-end ${hero ? 'p-6 md:p-10' : 'p-5'}`}>
        {pillar ? (
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/75">
            {PILLARS[pillar].name}
          </div>
        ) : null}
        <div
          className={`mt-2 font-display leading-[1.1] text-white ${
            hero ? 'text-[clamp(26px,4.5vw,44px)]' : 'line-clamp-3 text-[22px]'
          }`}
        >
          {title}
        </div>
      </div>
    </div>
  );
}
