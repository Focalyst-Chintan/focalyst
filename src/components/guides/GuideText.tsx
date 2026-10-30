import React from 'react';
import { Kbd } from '@/components/desktop/ui/Kbd';

// Renders **text** as <strong> and [[Key]] as <Kbd>. Everything else is plain
// text: React escapes it, so guide copy can never inject HTML.
const TOKEN = /(\*\*[^*]+\*\*|\[\[[^\]]+\]\])/g;

export function GuideText({ text }: { text: string }) {
  const parts = text.split(TOKEN).filter(Boolean);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="font-semibold text-ink">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('[[') && part.endsWith(']]')) {
          return (
            <Kbd key={i} className="mx-0.5 align-[2px]">
              {part.slice(2, -2)}
            </Kbd>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

export default GuideText;
