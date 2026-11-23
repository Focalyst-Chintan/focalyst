import Image from 'next/image';
import { Plug } from 'lucide-react';
import { AI_LOGO_MANIFEST, type AiLogoAsset } from './mediaManifest';

type MarqueeClientItem =
  | {
      kind: 'logo';
      id: string;
      name: string;
      logo: AiLogoAsset;
    }
  | {
      kind: 'icon';
      id: string;
      name: string;
    };

const ROW_1_CLIENTS: MarqueeClientItem[] = [
  { kind: 'logo', id: 'claude', name: 'Claude', logo: AI_LOGO_MANIFEST.claude },
  { kind: 'logo', id: 'chatgpt', name: 'ChatGPT', logo: AI_LOGO_MANIFEST.chatgpt },
  { kind: 'logo', id: 'gemini', name: 'Gemini', logo: AI_LOGO_MANIFEST.gemini },
  { kind: 'logo', id: 'claude-code', name: 'Claude Code', logo: AI_LOGO_MANIFEST.claudeCode },
  { kind: 'logo', id: 'perplexity', name: 'Perplexity', logo: AI_LOGO_MANIFEST.perplexity },
];

const ROW_2_CLIENTS: MarqueeClientItem[] = [
  { kind: 'logo', id: 'deepseek', name: 'DeepSeek', logo: AI_LOGO_MANIFEST.deepseek },
  { kind: 'logo', id: 'qwen', name: 'Qwen', logo: AI_LOGO_MANIFEST.qwen },
  { kind: 'logo', id: 'grok', name: 'Grok', logo: AI_LOGO_MANIFEST.grok },
  { kind: 'logo', id: 'kimi', name: 'Kimi', logo: AI_LOGO_MANIFEST.kimi },
  { kind: 'icon', id: 'any-mcp-client', name: 'Any MCP Client' },
];

function ClientPill({ item }: { item: MarqueeClientItem }) {
  return (
    <div className="flex shrink-0 items-center gap-2.5 rounded-full border border-line bg-surface-2 px-3.5 py-2">
      {item.kind === 'logo' ? (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-line bg-snow p-1.5">
          <Image
            src={item.logo.src}
            alt={item.logo.alt}
            width={item.logo.width}
            height={item.logo.height}
            className="h-full w-full object-contain"
          />
        </span>
      ) : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-line bg-primary-soft text-primary-text">
          <Plug className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </span>
      )}
      <span className="whitespace-nowrap text-[13px] font-medium text-ink">{item.name}</span>
    </div>
  );
}

function MarqueeTrack({
  items,
  direction,
}: {
  items: MarqueeClientItem[];
  direction: 'left' | 'right';
}) {
  const trackClass =
    direction === 'left' ? 'fx-marquee-track-left' : 'fx-marquee-track-right';

  return (
    <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)] motion-reduce:[mask-image:none]">
      <div
        className={`flex w-max items-center group-hover:[animation-play-state:paused] ${trackClass}`}
      >
        <div className="flex items-center gap-3 pr-3 motion-reduce:flex-wrap motion-reduce:pr-0">
          {items.map((item) => (
            <ClientPill key={item.id} item={item} />
          ))}
        </div>
        <div
          aria-hidden="true"
          className="flex items-center gap-3 pr-3 motion-reduce:hidden"
        >
          {items.map((item) => (
            <ClientPill key={`${item.id}-dup`} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function McpEcosystemMarquee() {
  return (
    <div className="frost overflow-hidden rounded-[24px] p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5 sm:items-center">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-[12px] border border-line bg-snow shadow-[var(--shadow-1)]">
            <Image
              src={AI_LOGO_MANIFEST.focalyst.src}
              alt={AI_LOGO_MANIFEST.focalyst.alt}
              width={AI_LOGO_MANIFEST.focalyst.width}
              height={AI_LOGO_MANIFEST.focalyst.height}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-primary-text">
              COMPATIBLE AI ASSISTANTS
            </p>
            <p className="max-w-[60ch] text-[14px] leading-[22px] text-ink-2">
              Connect Focalyst MCP to Claude, Gemini, ChatGPT, or any compatible AI client you
              already use.
            </p>
          </div>
        </div>
      </div>

      <div className="group mt-6 space-y-3">
        <MarqueeTrack items={ROW_1_CLIENTS} direction="left" />
        <MarqueeTrack items={ROW_2_CLIENTS} direction="right" />
      </div>
    </div>
  );
}
