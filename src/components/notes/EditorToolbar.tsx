'use client'

import { Editor } from '@tiptap/react'
import { useSpeechToText } from '@/hooks/useSpeechToText'
import { useEffect } from 'react'

interface EditorToolbarProps {
    editor: Editor | null;
}

export const EditorToolbar = ({ editor }: EditorToolbarProps) => {
    // We handle speech to text here, injecting into editor
    const { isListening, isSupported, toggleListening } = useSpeechToText((transcript) => {
        if (editor) {
            editor.commands.insertContent(transcript);
        }
    });

    if (!editor) {
        return null;
    }

    const toggleTool = (e: React.MouseEvent, action: () => void) => {
        e.preventDefault();
        action();
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-card-bg z-40 pb-safe">
            {isListening && (
                <div className="w-full text-center py-1 bg-red-50 text-red-600 text-[11px] font-medium tracking-wide">
                    Listening...
                </div>
            )}

            {/* Scrollable container for smaller screens if needed, though they fit well on most */}
            <div className="flex items-center justify-between px-2 py-2 overflow-x-auto scrollbar-hide">
                <div className="flex items-center gap-1">
                    {/* 1. Bold */}
                    <button
                        onPointerDown={(e) => toggleTool(e, () => editor.chain().focus().toggleBold().run())}
                        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${editor.isActive('bold') ? 'bg-navy text-white' : 'text-navy hover:bg-card-bg/30'
                            }`}
                    >
                        <span className="text-[16px] font-semibold">B</span>
                    </button>

                    {/* 2. Italic */}
                    <button
                        onPointerDown={(e) => toggleTool(e, () => editor.chain().focus().toggleItalic().run())}
                        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${editor.isActive('italic') ? 'bg-navy text-white' : 'text-navy hover:bg-card-bg/30'
                            }`}
                    >
                        <span className="text-[16px] italic font-serif">I</span>
                    </button>

                    {/* 3. Underline */}
                    <button
                        onPointerDown={(e) => toggleTool(e, () => editor.chain().focus().toggleUnderline().run())}
                        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${editor.isActive('underline') ? 'bg-navy text-white' : 'text-navy hover:bg-card-bg/30'
                            }`}
                    >
                        <span className="text-[16px] underline decoration-1 underline-offset-2">U</span>
                    </button>

                    <div className="w-[1px] h-6 bg-card-bg mx-1" />

                    {/* 4. H1 */}
                    <button
                        onPointerDown={(e) => toggleTool(e, () => editor.chain().focus().toggleHeading({ level: 1 }).run())}
                        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-navy text-white' : 'text-navy hover:bg-card-bg/30'
                            }`}
                    >
                        <span className="text-[13px] font-semibold">H1</span>
                    </button>

                    {/* 5. H2 */}
                    <button
                        onPointerDown={(e) => toggleTool(e, () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
                        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-navy text-white' : 'text-navy hover:bg-card-bg/30'
                            }`}
                    >
                        <span className="text-[13px] font-semibold">H2</span>
                    </button>

                    <div className="w-[1px] h-6 bg-card-bg mx-1" />

                    {/* 6. Bullet List */}
                    <button
                        onPointerDown={(e) => toggleTool(e, () => editor.chain().focus().toggleBulletList().run())}
                        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${editor.isActive('bulletList') ? 'bg-navy text-white' : 'text-navy hover:bg-card-bg/30'
                            }`}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="8" y1="6" x2="21" y2="6"></line>
                            <line x1="8" y1="12" x2="21" y2="12"></line>
                            <line x1="8" y1="18" x2="21" y2="18"></line>
                            <line x1="3" y1="6" x2="3.01" y2="6"></line>
                            <line x1="3" y1="12" x2="3.01" y2="12"></line>
                            <line x1="3" y1="18" x2="3.01" y2="18"></line>
                        </svg>
                    </button>

                    {/* 7. Numbered List */}
                    <button
                        onPointerDown={(e) => toggleTool(e, () => editor.chain().focus().toggleOrderedList().run())}
                        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${editor.isActive('orderedList') ? 'bg-navy text-white' : 'text-navy hover:bg-card-bg/30'
                            }`}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="10" y1="6" x2="21" y2="6"></line>
                            <line x1="10" y1="12" x2="21" y2="12"></line>
                            <line x1="10" y1="18" x2="21" y2="18"></line>
                            <path d="M4 6h1v4"></path>
                            <path d="M4 10h2"></path>
                            <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path>
                        </svg>
                    </button>

                    {/* 8. Checklist */}
                    <button
                        onPointerDown={(e) => toggleTool(e, () => editor.chain().focus().toggleTaskList().run())}
                        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${editor.isActive('taskList') ? 'bg-navy text-white' : 'text-navy hover:bg-card-bg/30'
                            }`}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 11 12 14 22 4"></polyline>
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                        </svg>
                    </button>

                    <div className="w-[1px] h-6 bg-card-bg mx-1" />

                    {/* 9. Mic */}
                    {isSupported ? (
                        <button
                            onPointerDown={(e) => {
                                e.preventDefault();
                                toggleListening();
                            }}
                            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${isListening
                                    ? 'bg-red-50 text-red-600 animate-pulse border border-red-200'
                                    : 'text-navy hover:bg-card-bg/30'
                                }`}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                <line x1="12" y1="19" x2="12" y2="23"></line>
                                <line x1="8" y1="23" x2="16" y2="23"></line>
                            </svg>
                        </button>
                    ) : (
                        <button
                            onPointerDown={(e) => {
                                e.preventDefault();
                                alert("Speech to text is not supported in this browser");
                            }}
                            className="w-10 h-10 flex items-center justify-center rounded-lg text-blue-muted opacity-50"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                <line x1="12" y1="19" x2="12" y2="23"></line>
                                <line x1="8" y1="23" x2="16" y2="23"></line>
                                <line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" strokeWidth="2"></line>
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
