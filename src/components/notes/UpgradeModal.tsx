'use client'
import { useRouter } from 'next/navigation'

interface UpgradeModalProps {
    isOpen: boolean;
    title: string;
    description: string;
    onDismiss: () => void;
}

export const UpgradeModal = ({ isOpen, title, description, onDismiss }: UpgradeModalProps) => {
    const router = useRouter()

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl flex flex-col gap-4">
                <div className="flex flex-col gap-2 text-center mt-2">
                    <div className="mx-auto w-12 h-12 bg-accent/10 text-accent rounded-full flex items-center justify-center mb-2">
                        {/* Simple lock outline SVG inline */}
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M16 11V7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7V11M5 11H19V21H5V11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <h3 className="text-[18px] font-bold text-navy">{title}</h3>
                    <p className="text-[14px] text-blue-muted">{description}</p>
                </div>

                <div className="flex flex-col gap-3 mt-4">
                    <button
                        onClick={() => {
                            onDismiss();
                            router.push('/plans'); // Adjust if plans route is different
                        }}
                        className="w-full h-12 bg-accent text-white rounded-xl font-semibold text-[15px]"
                    >
                        Upgrade to Pro →
                    </button>
                    <button
                        onClick={onDismiss}
                        className="w-full py-2 text-blue-muted font-medium text-[14px]"
                    >
                        Maybe Later
                    </button>
                </div>
            </div>
        </div>
    )
}
