'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { EditorToolbar } from './EditorToolbar'
import { useAutoSave } from '@/hooks/useAutoSave'
import { generatePdf, slugify } from '@/lib/pdf'
import { Note } from '@/types'
import { UpgradeModal } from './UpgradeModal'
import { createClient } from '@/lib/supabase'

interface NoteEditorProps {
    initialNote: Note;
    userId: string;
    userPlan: string;
}

const MAX_FREE_CHARS = 100000;

export const NoteEditor = ({ initialNote, userId, userPlan }: NoteEditorProps) => {
    const router = useRouter()
    const supabase = createClient()

    const [note, setNote] = useState<Note>(initialNote)
    const [title, setTitle] = useState(initialNote.title || 'Untitled document')
    const [content, setContent] = useState(initialNote.content || '')
    const [charCount, setCharCount] = useState(0)

    const [titleError, setTitleError] = useState('')
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<'summary' | 'transcript'>('summary')

    const isPaidUser = ['pro_monthly', 'pro_yearly', 'lifetime'].includes(userPlan)
    const isVoiceNote = note.note_type === 'voice'

    // AutoSave Hook setup
    const dataToSave = { title, content }

    const saveToSupabase = useCallback(async (data: typeof dataToSave) => {
        // Validation before save
        if (data.title.length > 200) {
            setTitleError('Title too long')
            throw new Error('Title too long')
        }

        let plainText = ''
        if (editorRef.current) {
            plainText = editorRef.current.getText()
        }

        const { error } = await supabase
            .from('notes')
            .update({
                title: data.title,
                content: data.content,
                updated_at: new Date().toISOString()
            })
            .eq('id', note.id)

        if (error) throw error
    }, [note.id, supabase])

    const { status: saveStatus, triggerSave, retrySave } = useAutoSave(saveToSupabase, dataToSave, 30000)

    const editorRef = useRef<any>(null)

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            TaskList.configure({ HTMLAttributes: { class: 'not-prose pl-2' } }),
            TaskItem.configure({ nested: true, HTMLAttributes: { class: 'flex gap-2 items-start my-1' } }),
        ],
        content: initialNote.content || '',
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl focus:outline-none max-w-none w-full min-h-[50vh] text-navy',
            },
        },
        onUpdate: ({ editor }) => {
            const html = editor.getHTML()
            const text = editor.getText()
            setCharCount(text.length)

            if (!isPaidUser && text.length > MAX_FREE_CHARS) {
                setIsUpgradeModalOpen(true)
                // We should revert the change or keep it blocked, but tiptap doesn't have an easy "prevent default" on update.
                // Reverting complexly isn't ideal UX, but we can set readOnly
                editor.setEditable(false)
            } else {
                setContent(html)
            }
        },
    })

    useEffect(() => {
        editorRef.current = editor
    }, [editor])

    // Update char count on mount
    useEffect(() => {
        if (editor) {
            setCharCount(editor.getText().length)
        }
    }, [editor])

    const handleBack = async () => {
        try {
            const isTitleEmpty = !title.trim() || title === 'Untitled document';
            const isContentEmpty = !editor?.getText().trim();

            if (isTitleEmpty && isContentEmpty) {
                // If it's a blank document, just delete it on exit so it doesn't clutter the list
                await supabase.from('notes').delete().eq('id', note.id).eq('user_id', userId);
            } else {
                await saveToSupabase(dataToSave)
            }
        } catch (e) {
            console.error('Save before exit failed:', e)
        }
        router.push('/notes')
    }

    const handleToggleFavourite = async () => {
        const newValue = !note.is_favourite
        setNote(prev => ({ ...prev, is_favourite: newValue }))
        await supabase.from('notes').update({ is_favourite: newValue }).eq('id', note.id)
    }

    const handleDownloadPdf = () => {
        if (!editor) return
        const plainText = editor.getText()
        generatePdf(title, plainText, `${slugify(title)}-focalyst.pdf`)
    }

    const formatVoiceDate = (dateStr: string) => {
        const d = new Date(dateStr)
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    const formatVoiceTime = (dateStr: string) => {
        const d = new Date(dateStr)
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()
    }

    const formatVoiceDuration = (seconds?: number | null) => {
        if (!seconds) return '0 min'
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        if (h > 0) return `${h}h ${m}m`
        return `${m} min`
    }

    // Distraction-free: we assume the global layout doesn't wrap this, or we hide things via CSS/state.
    // In focalyst app layout, checking the pathname can hide bottom nav and header.
    // For this component, we render the custom top bar.

    return (
        <div className="flex flex-col min-h-screen bg-white">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-4 h-14 bg-white border-b border-card-bg sticky top-0 z-30">
                {/* Back Arrow */}
                <button onClick={handleBack} className="p-2 -ml-2 text-navy hover:bg-card-bg/20 rounded-full transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                {/* Title Input & Save Status */}
                <div className="flex flex-col items-center justify-center flex-1 px-4 mt-2">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => {
                            setTitle(e.target.value)
                            if (e.target.value.length <= 200) setTitleError('')
                        }}
                        placeholder="Untitled document"
                        className="w-full text-center text-[18px] font-semibold text-navy bg-transparent outline-none placeholder:text-blue-muted placeholder:font-normal"
                    />
                    {titleError && <p className="text-[11px] text-red-600 mt-0.5">{titleError}</p>}

                    {isVoiceNote && (
                        <p className="text-[12px] text-navy font-semibold mt-1">
                            {formatVoiceDate(note.created_at)} • {formatVoiceTime(note.created_at)} • {formatVoiceDuration(note.duration_seconds)}
                        </p>
                    )}

                    {/* Save Status Indicator */}
                    <div className="h-4 flex items-center justify-center mt-0.5">
                        {saveStatus === 'saving' && <span className="text-[11px] text-blue-muted">Saving...</span>}
                        {saveStatus === 'saved' && (
                            <span className="text-[11px] text-green-600 flex items-center">
                                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                Saved
                            </span>
                        )}
                        {saveStatus === 'error' && (
                            <button onClick={retrySave} className="text-[11px] text-red-600 hover:underline">
                                Save failed. Tap to retry.
                            </button>
                        )}
                    </div>
                </div>

                {/* Right side icons */}
                <div className="flex items-center gap-1">
                    <button onClick={handleToggleFavourite} className="p-2 rounded-full hover:bg-card-bg/20 transition-colors">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill={note.is_favourite ? '#4A6C8C' : 'none'} xmlns="http://www.w3.org/2000/svg">
                            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" stroke={note.is_favourite ? '#4A6C8C' : '#95A7B5'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <button onClick={handleDownloadPdf} className="p-2 -mr-2 rounded-full hover:bg-card-bg/20 transition-colors">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" stroke="#95A7B5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Voice Toggle Tabs and Actions */}
            {isVoiceNote && (
                <div className="flex items-center justify-between px-4 py-3 bg-white">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setActiveTab('summary')}
                            className={`text-[15px] font-medium transition-colors ${activeTab === 'summary' ? 'bg-navy text-white px-4 py-1.5 rounded-full' : 'text-navy px-4 py-1.5'}`}
                        >
                            Note summary
                        </button>
                        <button
                            onClick={() => setActiveTab('transcript')}
                            className={`text-[15px] font-medium transition-colors ${activeTab === 'transcript' ? 'bg-navy text-white px-4 py-1.5 rounded-full' : 'text-navy px-4 py-1.5'}`}
                        >
                            Transcript
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        {activeTab === 'summary' && (
                            <>
                                <button className="p-2 hover:bg-card-bg/20 rounded-full transition-colors" title="Edit Summary" onClick={() => {
                                    // Focus the editor if edit is clicked
                                    if (editor) {
                                        editor.commands.focus()
                                    }
                                }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M8.5 5.5L18.5 15.5" stroke="#33363F" strokeWidth="2" strokeLinecap="round" />
                                        <path d="M14.5 4.5L4 15L3.5 20.5L9 20L19.5 9.5C20.8807 8.11929 20.8807 5.88071 19.5 4.5C18.1193 3.11929 15.8807 3.11929 14.5 4.5Z" stroke="#33363F" strokeWidth="2" strokeLinejoin="round" />
                                    </svg>
                                </button>
                                <button className="p-2 hover:bg-card-bg/20 rounded-full transition-colors" title="Copy Summary" onClick={async () => {
                                    if (editor) {
                                        await navigator.clipboard.writeText(editor.getText() || '');
                                        alert("Summary copied to clipboard!");
                                    }
                                }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12.1716 21H9C7.11438 21 6.17157 21 5.58579 20.4142C5 19.8284 5 18.8856 5 17V7C5 5.11438 5 4.17157 5.58579 3.58579C6.17157 3 7.11438 3 9 3H15C16.8856 3 17.8284 3 18.4142 3.58579C19 4.17157 19 5.11438 19 7V14.1716C19 14.5803 19 14.7847 18.9239 14.9685C18.8478 15.1522 18.7032 15.2968 18.4142 15.5858L13.5858 20.4142C13.2968 20.7032 13.1522 20.8478 12.9685 20.9239C12.7847 21 12.5803 21 12.1716 21Z" stroke="#222222" />
                                        <path d="M12 21V16.3333C12 15.2334 12 14.6834 12.3417 14.3417C12.6834 14 13.2334 14 14.3333 14H19" stroke="#222222" />
                                    </svg>
                                </button>
                            </>
                        )}
                        {activeTab === 'transcript' && (
                            <button className="px-5 py-2 hover:bg-accent/90 rounded-full transition-colors bg-accent text-white text-sm font-semibold shadow-sm" title="Copy Transcript" onClick={async () => {
                                await navigator.clipboard.writeText(note.transcript || '');
                                alert("Transcript copied to clipboard!");
                            }}>
                                Copy transcript
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Editor Area (Summary) */}
            <div className={`flex-1 overflow-y-auto px-4 py-6 pb-32 ${activeTab !== 'summary' ? 'hidden' : ''}`}>
                {isVoiceNote && (
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[18px] font-bold text-navy">Summary</h3>
                    </div>
                )}
                <EditorContent editor={editor} />
            </div>

            {/* Transcript Area */}
            {isVoiceNote && activeTab === 'transcript' && (
                <div className="flex-1 overflow-y-auto px-4 py-6 pb-32">
                    <div className="prose prose-sm sm:prose-base text-navy font-medium whitespace-pre-wrap">
                        {note.transcript}
                    </div>
                </div>
            )}

            {/* Free Plan Character Counter */}
            {!isPaidUser && (
                <div className="fixed bottom-[56px] right-4 z-30 pointer-events-none">
                    <span className={`text-[11px] ${charCount >= MAX_FREE_CHARS ? 'text-red-500 font-bold' : 'text-blue-muted'}`}>
                        {charCount.toLocaleString()} / {MAX_FREE_CHARS.toLocaleString()}
                    </span>
                </div>
            )}

            {activeTab === 'summary' && <EditorToolbar editor={editor} />}

            {/* Upgrade Modal */}
            <UpgradeModal
                isOpen={isUpgradeModalOpen}
                title="You've reached your free limit"
                description="Free plan supports up to 100,000 characters per note. Upgrade to Pro for unlimited notes."
                onDismiss={() => {
                    setIsUpgradeModalOpen(false)
                    // Optionally re-enable if we want them to delete text, for now leaving it blocked 
                    // or they can just navigate away.
                }}
            />

            {/* Global style override for Tiptap placeholder behavior */}
            <style jsx global>{`
                .ProseMirror p.is-editor-empty:first-child::before {
                    content: 'Start writing...';
                    float: left;
                    color: #95A7B5;
                    font-size: 15px;
                    pointer-events: none;
                    height: 0;
                }
                
                .ProseMirror ul[data-type="taskList"] {
                    list-style: none;
                    padding: 0;
                }
                
                .ProseMirror ul[data-type="taskList"] p {
                    margin: 0;
                }
                
                .ProseMirror ul[data-type="taskList"] li {
                    display: flex;
                    align-items: start;
                }
                
                .ProseMirror ul[data-type="taskList"] li > label {
                    flex: 0 0 auto;
                    margin-right: 0.5rem;
                    user-select: none;
                }
                
                .ProseMirror ul[data-type="taskList"] li > div {
                    flex: 1 1 auto;
                }
            `}</style>
        </div>
    )
}
