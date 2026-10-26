#!/bin/bash
cd ~/Downloads/focalyst-main || exit 1
OUT=~/Downloads/fx-legal-debug.txt
{
  echo "=== git"; git log -6 --oneline
  echo "=== folders"; ls -la src/app/privacy src/app/terms src/components/desktop/public 2>/dev/null
  for f in src/app/privacy/page.tsx src/app/privacy/layout.tsx src/app/terms/page.tsx src/app/terms/layout.tsx src/components/desktop/public/LegalLayout.tsx src/components/desktop/public/PublicLayout.tsx src/app/layout.tsx; do
    [ -f "$f" ] && { echo; echo "=== FILE $f"; cat "$f"; }
  done
  echo; echo "=== components imported by the legal pages and layouts"
  for imp in $(grep -hoE "from '@/[^']+'" src/app/privacy/page.tsx src/app/terms/page.tsx src/components/desktop/public/LegalLayout.tsx src/components/desktop/public/PublicLayout.tsx 2>/dev/null | sed -E "s/from '@\/(.*)'/\1/" | sort -u); do
    for ext in .tsx .ts /index.tsx /index.ts; do
      f="src/$imp$ext"
      if [ -f "$f" ]; then echo; echo "=== FILE $f"; cat "$f"; break; fi
    done
  done
  echo; echo "=== globals.css: themes, tokens, reveal, motion, glass"
  grep -nE "fx-reveal|reduce-motion|prefers-reduced|data-theme|\.dark|@custom-variant|--ink|--canvas|--surface|--line|opacity|\.glass|\.liquid|\.frost|legal|prose|scroll-mt|content-visibility" src/app/globals.css
  echo; echo "=== files that render a public nav (contain /mcp-preview)"
  grep -rln -E "/mcp-preview" src --include=*.tsx
  echo; echo "=== built pages (from the last build, if present)"
  ls -la .next/server/app 2>/dev/null | grep -E "privacy|terms"
  for p in privacy terms; do
    f=".next/server/app/$p.html"
    if [ -f "$f" ]; then
      echo "$p.html bytes: $(wc -c < "$f")"
      echo "$p: 'Information we collect' count: $(grep -o 'Information we collect' "$f" | wc -l)"
      echo "$p: 'Refunds' count: $(grep -o 'Refunds' "$f" | wc -l)"
      echo "$p: 'opacity-0' count: $(grep -o 'opacity-0' "$f" | wc -l)"
      echo "$p: 'fx-reveal' count: $(grep -o 'fx-reveal' "$f" | wc -l)"
      echo "$p: 'data-theme=\"dark\"' count: $(grep -o 'data-theme="dark"' "$f" | wc -l)"
      echo "$p: 'hidden lg:' count: $(grep -o 'hidden lg:' "$f" | wc -l)"
    else
      echo "$p.html not found (page may be dynamic)"
    fi
  done
  echo; echo "=== PHASE6_AUDIT.md"
  cat PHASE6_AUDIT.md 2>/dev/null || echo "PHASE6_AUDIT.md not found"
} 2>&1 | sed -E 's/sk-or-v1-[A-Za-z0-9]+/sk-or-REDACTED/g; s/AIza[0-9A-Za-z_-]{20,}/AIza-REDACTED/g; s/eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/JWT-REDACTED/g; s/(polar_[a-z]{3}_)[A-Za-z0-9]+/\1REDACTED/g' > "$OUT"
echo "Written: $OUT ($(wc -c < "$OUT") bytes)"
