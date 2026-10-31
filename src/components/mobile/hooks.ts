'use client'

// UI-only state for the phone shell. Reads the browser, never writes data.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

// ── Window scrolled past a threshold (header blur, spec 7.1) ────────────────
function subscribeScroll(cb: () => void) {
    window.addEventListener('scroll', cb, { passive: true })
    return () => window.removeEventListener('scroll', cb)
}

export function useScrolledPast(px: number): boolean {
    return useSyncExternalStore(
        subscribeScroll,
        () => window.scrollY > px,
        () => false,
    )
}

// ── On-screen keyboard open (hide the tab bar, brief section 4) ─────────────
// A text field has focus AND the visible height dropped by more than 150px
// against the tallest height seen in this orientation. Works for iOS (visual
// viewport shrinks) and Android (window shrinks).
const tallest: Record<'p' | 'l', number> = { p: 0, l: 0 }

function viewportHeight() {
    return window.visualViewport?.height ?? window.innerHeight
}

function orientationKey(): 'p' | 'l' {
    return window.innerWidth > window.innerHeight ? 'l' : 'p'
}

function rememberTallest() {
    const k = orientationKey()
    tallest[k] = Math.max(tallest[k], viewportHeight(), window.innerHeight)
}

function isEditable(el: Element | null): boolean {
    if (!el) return false
    if (el instanceof HTMLTextAreaElement) return true
    if (el instanceof HTMLInputElement) {
        return !['button', 'checkbox', 'radio', 'range', 'submit', 'reset', 'file', 'color'].includes(el.type)
    }
    return (el as HTMLElement).isContentEditable === true
}

function subscribeKeyboard(cb: () => void) {
    const vv = window.visualViewport
    const onChange = () => {
        if (!isEditable(document.activeElement)) rememberTallest()
        cb()
    }
    rememberTallest()
    vv?.addEventListener('resize', onChange)
    window.addEventListener('resize', onChange)
    document.addEventListener('focusin', onChange)
    document.addEventListener('focusout', onChange)
    return () => {
        vv?.removeEventListener('resize', onChange)
        window.removeEventListener('resize', onChange)
        document.removeEventListener('focusin', onChange)
        document.removeEventListener('focusout', onChange)
    }
}

function keyboardSnapshot(): boolean {
    if (!isEditable(document.activeElement)) return false
    const max = tallest[orientationKey()] || window.innerHeight
    return max - viewportHeight() > 150
}

export function useKeyboardOpen(): boolean {
    return useSyncExternalStore(subscribeKeyboard, keyboardSnapshot, () => false)
}

// ── Reduced motion (spec 9.2) ───────────────────────────────────────────────
function subscribeMotion(cb: () => void) {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    mq.addEventListener('change', cb)
    return () => mq.removeEventListener('change', cb)
}

export function useReducedMotion(): boolean {
    return useSyncExternalStore(
        subscribeMotion,
        () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        () => false,
    )
}

// ── Swipe down to close a bottom sheet (spec 7.12) ──────────────────────────
// Attach `handlers` to the sheet's grabber and header only, so lists inside still scroll.
// `onClose` is the screen's existing close function, called unchanged.
export function useSwipeToClose(onClose: () => void, threshold = 110) {
    const [dy, setDy] = useState(0)
    const [dragging, setDragging] = useState(false)
    const startY = useRef<number | null>(null)
    const handlers = {
        onTouchStart: (e: React.TouchEvent) => {
            startY.current = e.touches[0].clientY
            setDragging(true)
        },
        onTouchMove: (e: React.TouchEvent) => {
            if (startY.current === null) return
            setDy(Math.max(0, e.touches[0].clientY - startY.current))
        },
        onTouchEnd: () => {
            const shouldClose = dy > threshold
            startY.current = null
            setDragging(false)
            setDy(0)
            if (shouldClose) onClose()
        },
        onTouchCancel: () => {
            startY.current = null
            setDragging(false)
            setDy(0)
        },
    }
    const style: React.CSSProperties = dy
        ? { transform: `translateY(${dy}px)`, transition: dragging ? 'none' : undefined }
        : {}
    return { handlers, style }
}

// ── Lock page scroll while a sheet is open (brief section 4) ────────────────
// Restores the previous overflow value on close. UI only.
export function useBodyScrollLock(active: boolean) {
    useEffect(() => {
        if (!active) return
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = prev
        }
    }, [active])
}
