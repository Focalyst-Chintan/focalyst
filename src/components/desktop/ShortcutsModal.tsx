'use client';

import React from 'react';
import { Modal } from '@/components/desktop/ui/Modal';
import { Kbd } from '@/components/desktop/ui/Kbd';

export interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  label: string;
}

interface ShortcutCategory {
  category: string;
  items: ShortcutItem[];
}

const SHORTCUT_GROUPS: ShortcutCategory[] = [
  {
    category: 'General',
    items: [
      { keys: ['⌘', 'K'], label: 'Open command palette' },
      { keys: ['⌘', 'J'], label: 'Toggle AI coach drawer' },
      { keys: ['⌘', '\\'], label: 'Toggle sidebar' },
      { keys: ['⌘', '.'], label: 'Toggle details panel' },
      { keys: ['?'], label: 'Keyboard shortcuts' },
      { keys: ['Esc'], label: 'Close modal or panel' },
    ],
  },
  {
    category: 'Creation & Focus',
    items: [
      { keys: ['N'], label: 'New item (context-aware: task, habit, reminder or note)' },
      { keys: ['F'], label: 'Toggle desk mode (fullscreen focus)' },
      { keys: ['Space'], label: 'Start or pause timer in desk mode' },
    ],
  },
  {
    category: 'Go to (press G then key)',
    items: [
      { keys: ['G', 'T'], label: 'Go to Today' },
      { keys: ['G', 'P'], label: 'Go to Plan' },
      { keys: ['G', 'F'], label: 'Go to Focus' },
      { keys: ['G', 'N'], label: 'Go to Notes' },
      { keys: ['G', 'I'], label: 'Go to Insights' },
    ],
  },
];

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Keyboard shortcuts"
      subtitle="Quick actions to navigate and focus faster without touching your mouse."
      size="md"
    >
      <div className="space-y-6 pt-1 max-h-[60vh] overflow-y-auto pr-1">
        {SHORTCUT_GROUPS.map((group) => (
          <div key={group.category} className="space-y-2.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
              {group.category}
            </h3>
            <div className="rounded-[16px] bg-surface-2/40 border border-line divide-y divide-line overflow-hidden">
              {group.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-4 py-2.5 text-[13px] hover:bg-surface-2/60 transition-colors"
                >
                  <span className="text-ink font-medium">{item.label}</span>
                  <div className="flex items-center gap-1">
                    {item.keys.map((k, kIdx) => (
                      <React.Fragment key={kIdx}>
                        <Kbd>{k}</Kbd>
                        {kIdx < item.keys.length - 1 && (
                          <span className="text-[11px] text-ink-3">+</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export default ShortcutsModal;
