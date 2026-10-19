/**
 * HabitKit-inspired color palette helper.
 * Converts any 6-digit hex color into an RGB/HSL palette tailored for
 * both dark and light modes with a 5-level multi-shade heatmap gradient.
 */

export interface HabitColorShades {
  base: string;          // Original or fallback hex
  emptyCell: string;     // Base color at 16% opacity for uncompleted boxes (no border)
  level1: string;        // Base color at 65% opacity (1-day completion)
  level2: string;        // 100% vibrant base habit color (2-day streak)
  level3: string;        // Base color mixed 35% toward white (3-4 day streak pastel pop)
  level4: string;        // Base color mixed 60% toward white (5+ day streak brightest tone)
  iconBg: string;        // Base color at 16% opacity
  badgeBg: string;       // Base color at 15% opacity
  badgeText: string;     // Brightened readable text shade
  borderColor: string;   // Subtle border tint
  checkboxBorder: string;// 30% border tint for unchecked state
  perfContainerTint: string; // 6% subtle surface tint for Performance Breakdown container
}

export function parseHex(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length !== 6) {
    return { r: 59, g: 130, b: 246 }; // fallback #3B82F6
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) {
    return { r: 59, g: 130, b: 246 };
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360;
  s /= 100;
  l /= 100;
  if (s === 0) {
    const val = Math.round(l * 255);
    return { r: val, g: val, b: val };
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

export function getHabitColorShades(hexColor?: string | null, isDarkMode = true): HabitColorShades {
  const fallback = '#3B82F6';
  const rawHex = hexColor && hexColor.trim() ? hexColor.trim() : fallback;
  const { r, g, b } = parseHex(rawHex);
  const hsl = rgbToHsl(r, g, b);

  // 16% opacity for empty cells over dark card surface so uncompleted cells remain dark but tinted
  const emptyCell = `rgba(${r}, ${g}, ${b}, ${isDarkMode ? 0.16 : 0.12})`;

  // Level 1: 1-day completion at 65% opacity
  const level1 = `rgba(${r}, ${g}, ${b}, 0.65)`;

  // Level 2: 2-day consecutive streak at 100% vibrant base color
  const level2 = `rgb(${r}, ${g}, ${b})`;

  // Level 3: 3-4 day consecutive streak mixed 35% toward white (#FFFFFF) for bright pastel pop
  const r3 = Math.round(r + (255 - r) * 0.35);
  const g3 = Math.round(g + (255 - g) * 0.35);
  const b3 = Math.round(b + (255 - b) * 0.35);
  const level3 = `rgb(${r3}, ${g3}, ${b3})`;

  // Level 4: 5+ day streak mixed 60% toward white (#FFFFFF) for brightest highlight tone
  const r4 = Math.round(r + (255 - r) * 0.60);
  const g4 = Math.round(g + (255 - g) * 0.60);
  const b4 = Math.round(b + (255 - b) * 0.60);
  const level4 = `rgb(${r4}, ${g4}, ${b4})`;

  const iconBg = `rgba(${r}, ${g}, ${b}, 0.16)`;
  const badgeBg = `rgba(${r}, ${g}, ${b}, 0.15)`;

  // Brightened readable badge text
  const textHsl = {
    h: hsl.h,
    s: Math.max(70, hsl.s),
    l: isDarkMode ? Math.max(68, Math.min(88, hsl.l + 22)) : Math.min(42, Math.max(26, hsl.l - 14)),
  };
  const textRgb = hslToRgb(textHsl.h, textHsl.s, textHsl.l);
  const badgeText = `rgb(${textRgb.r}, ${textRgb.g}, ${textRgb.b})`;

  const borderColor = `rgba(${r}, ${g}, ${b}, 0.22)`;
  const checkboxBorder = `rgba(${r}, ${g}, ${b}, 0.30)`;

  // 6% subtle surface tint for Performance Breakdown container
  const perfContainerTint = `rgba(${r}, ${g}, ${b}, ${isDarkMode ? 0.06 : 0.05})`;

  const normalizedHex = rawHex.startsWith('#') ? rawHex : `#${rawHex}`;

  return {
    base: normalizedHex,
    emptyCell,
    level1,
    level2,
    level3,
    level4,
    iconBg,
    badgeBg,
    badgeText,
    borderColor,
    checkboxBorder,
    perfContainerTint,
  };
}
