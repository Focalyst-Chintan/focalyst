// Display-only copy cleanup for strings built inside protected logic (toasts set in effects
// or handlers). Applies the copy rules (no exclamation marks, no emoji) without touching the logic.
export function plainCopy(text: string): string {
    return text
        .replace(/\p{Extended_Pictographic}️?/gu, '')
        .replace(/!+/g, '.')
        .replace(/\.\s*\./g, '.')
        .replace(/\s+/g, ' ')
        .trim()
}
