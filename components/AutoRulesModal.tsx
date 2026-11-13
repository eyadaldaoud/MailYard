'use client';

import React, { useState, useEffect } from 'react';
import {
  AutoDeleteRule,
  getAutoRules,
  deleteAutoRule,
  toggleAutoRule,
} from '@/lib/autoRules';
import {
  Zap,
  Trash2,
  X,
  
  
  ToggleLeft,
  ToggleRight,
  
  Search,
} from 'lucide-react';

interface AutoRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRulesChanged?: () => void;
}

export function AutoRulesModal({ isOpen, onClose, onRulesChanged }: AutoRulesModalProps) {
  const [rules, setRules] = useState<AutoDeleteRule[]>([]);
  const [search, setSearch] = useState('');

  const refreshRules = () => {
    setRules(getAutoRules());
  };

  useEffect(() => {
    if (isOpen) {
      refreshRules();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = (id: string) => {
    deleteAutoRule(id);
    refreshRules();
    if (onRulesChanged) onRulesChanged();
  };

  const handleToggle = (id: string) => {
    toggleAutoRule(id);
    refreshRules();
    if (onRulesChanged) onRulesChanged();
  };

  const filteredRules = rules.filter(
    (r) =>
      r.pattern.toLowerCase().includes(search.toLowerCase()) ||
      r.senderName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm">
      <div className="relative flex flex-col w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl border border-warn bg-paper shadow-sm">
        <div className="h-1.5 w-full bg-warn" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-linen px-6 py-4 bg-sheet">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-warn border border-warn text-paper">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink tracking-wide flex items-center gap-2">
                <span>Auto-Delete Rules Engine</span>
                <span className="rounded-full bg-warn border border-warn px-2 py-0.2 text-[10px] font-semibold text-paper">
                  {rules.length} active pattern{rules.length === 1 ? '' : 's'}
                </span>
              </h2>
              <p className="text-[11px] text-ink-soft">
                Whenever you sync new batches of emails, Mailyard automatically trashes matching messages.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-soft hover:bg-linen/50 hover:text-ink transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-linen bg-sheet">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-ink-soft" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search automated rules by sender or domain..."
              className="w-full rounded-xl border border-linen bg-sheet pl-9 pr-3 py-1.5 text-xs text-ink placeholder-ink-mute focus:border-warn focus:outline-none focus:ring-1 focus:ring-warn"
            />
          </div>
        </div>

        {/* Rules List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2.5">
          {filteredRules.length === 0 ? (
            <div className="rounded-2xl border border-linen bg-sheet p-8 text-center">
              <Zap className="mx-auto h-8 w-8 text-ink-soft mb-2" />
              <h3 className="text-sm font-semibold text-ink">No Auto-Delete Rules Yet</h3>
              <p className="text-xs text-ink-soft mt-1 max-w-sm mx-auto">
                Launch the Cleaning Wizard or check the &ldquo;Auto-delete future emails&rdquo; option when cleaning senders to register automatic sync rules.
              </p>
            </div>
          ) : (
            filteredRules.map((rule) => (
              <div
                key={rule.id}
                className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition-all ${
                  rule.enabled
                    ? 'border-warn bg-warn'
                    : 'border-linen bg-sheet opacity-50'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-ink truncate">
                      {rule.senderName || rule.pattern}
                    </span>
                    <span className="text-[10px] font-mono text-warn/80 rounded bg-warn px-1.5 py-0.2 border border-warn">
                      {rule.pattern}
                    </span>
                    {rule.category && (
                      <span className="text-[9px] uppercase tracking-wider text-ink-soft font-semibold">
                        {rule.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-ink-soft">
                    <span className="flex items-center gap-1 text-trash">
                      <Trash2 className="h-2.5 w-2.5" />
                      <span>{rule.action === 'trash_and_unsub' ? 'Auto Unsub & Trash' : 'Auto Trash'}</span>
                    </span>
                    <span>·</span>
                    <span>Created {new Date(rule.createdAt).toLocaleDateString()}</span>
                    {rule.deletedCount > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-unload font-semibold">
                          {rule.deletedCount} emails auto-trashed
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(rule.id)}
                    className="p-1 text-ink-soft hover:text-ink transition"
                    title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                  >
                    {rule.enabled ? (
                      <ToggleRight className="h-6 w-6 text-warn" />
                    ) : (
                      <ToggleLeft className="h-6 w-6 text-ink-soft" />
                    )}
                  </button>

                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="p-1.5 rounded-lg text-ink-soft hover:text-trash hover:bg-linen/50 transition"
                    title="Delete rule"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-linen px-6 py-3 bg-sheet">
          <span className="text-[11px] text-ink-soft">
            Rules apply automatically on every new email batch sync.
          </span>
          <button
            onClick={onClose}
            className="rounded-xl bg-sheet border border-linen px-4 py-1.5 text-xs font-semibold text-ink hover:bg-linen/50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
