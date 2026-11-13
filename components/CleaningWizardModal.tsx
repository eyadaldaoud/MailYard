'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { EmailMetadata } from '@/lib/types';
import {
  classifyEmailCategory,
  aggregateSenders,
  EMAIL_CATEGORIES,
  EmailCategoryId,
  SenderAggregate,
} from '@/lib/categories';
import { saveBulkAutoRules, AutoDeleteRule } from '@/lib/autoRules';
import {
  Sparkles,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Trash2,
  ShieldCheck,
  Zap,
  Check,
  Mail,
  SlidersHorizontal,
  
  RefreshCw,
  Info,
} from 'lucide-react';

interface CleaningWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  emails: EmailMetadata[];
  onBatchTrash: (ids: string[]) => Promise<void>;
  onUnsubscribe: (email: EmailMetadata) => Promise<{ success: boolean; message: string }>;
  onRefreshInbox?: () => void;
  onAutoRulesUpdated?: () => void;
}

type WizardPhase = 'intro' | 'category' | 'review' | 'success';
type SenderActionChoice = 'keep' | 'unsub_and_trash' | 'trash_only';

interface SenderDecision {
  senderEmail: string;
  senderDomain: string;
  senderName: string;
  category: EmailCategoryId;
  emailIds: string[];
  action: SenderActionChoice;
  autoDeleteFuture: boolean;
  hasUnsubscribe: boolean;
  count: number;
  totalSizeBytes: number;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function CleaningWizardModal({
  isOpen,
  onClose,
  emails,
  onBatchTrash,
  onUnsubscribe,
  onRefreshInbox,
  onAutoRulesUpdated,
}: CleaningWizardModalProps) {
  // Phase state machine (robust against category list changes during trash operations)
  const [phase, setPhase] = useState<WizardPhase>('intro');
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState<number>(0);

  // Execution states
  const [isExecuting, setIsExecuting] = useState(false);
  const [executingStatus, setExecutingStatus] = useState<string>('');
  const [executionProgress, setExecutionProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });

  // Frozen snapshot of emails & categories captured when modal opens
  const [snapshotEmails, setSnapshotEmails] = useState<EmailMetadata[]>([]);
  const [frozenCategories, setFrozenCategories] = useState<EmailCategoryId[]>([]);

  // Decisions state
  const [decisions, setDecisions] = useState<Record<string, SenderDecision>>({});

  // Reset & initialize wizard state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setPhase('intro');
      setCurrentCategoryIndex(0);
      setIsExecuting(false);
      setExecutingStatus('');

      // Freeze emails snapshot
      setSnapshotEmails(emails);

      // Categorize snapshot emails
      const catMap = new Map<EmailCategoryId, EmailMetadata[]>();
      for (const cat of EMAIL_CATEGORIES) {
        if (cat.id !== 'all') catMap.set(cat.id, []);
      }
      for (const e of emails) {
        const cat = classifyEmailCategory(e);
        const list = catMap.get(cat) || [];
        list.push(e);
        catMap.set(cat, list);
      }

      // Priority category order
      const priorityOrder: EmailCategoryId[] = [
        'promotions',
        'newsletters',
        'social',
        'updates',
        'finance',
        'dev_work',
        'personal',
      ];

      const active = priorityOrder.filter((catId) => {
        const list = catMap.get(catId);
        return list && list.length > 0;
      });

      setFrozenCategories(active);

      // Initialize decisions: ALWAYS SAFE DEFAULT ('keep'). NO AUTO-SELECTION FOR TRASH!
      const initialDecisions: Record<string, SenderDecision> = {};
      for (const catId of active) {
        const catEmails = catMap.get(catId) || [];
        const senders = aggregateSenders(catEmails);
        for (const s of senders) {
          initialDecisions[s.senderEmail.toLowerCase()] = {
            senderEmail: s.senderEmail,
            senderDomain: s.senderDomain,
            senderName: s.senderName,
            category: catId,
            emailIds: s.emailIds,
            action: 'keep', // SAFE DEFAULT: User must explicitly choose to trash
            autoDeleteFuture: false,
            hasUnsubscribe: s.hasUnsubscribe,
            count: s.count,
            totalSizeBytes: s.totalSizeBytes,
          };
        }
      }
      setDecisions(initialDecisions);
    }
  }, [isOpen]); // Only initialize when modal opens

  // Group snapshot emails by category
  const categorizedEmails = useMemo(() => {
    const map = new Map<EmailCategoryId, EmailMetadata[]>();
    for (const cat of EMAIL_CATEGORIES) {
      if (cat.id !== 'all') map.set(cat.id, []);
    }
    for (const email of snapshotEmails) {
      const cat = classifyEmailCategory(email);
      const list = map.get(cat) || [];
      list.push(email);
      map.set(cat, list);
    }
    return map;
  }, [snapshotEmails]);

  // Aggregate senders per category
  const categorySenders = useMemo(() => {
    const map = new Map<EmailCategoryId, SenderAggregate[]>();
    for (const catId of frozenCategories) {
      const catEmails = categorizedEmails.get(catId) || [];
      const senders = aggregateSenders(catEmails);
      senders.sort((a, b) => b.count - a.count);
      map.set(catId, senders);
    }
    return map;
  }, [frozenCategories, categorizedEmails]);

  if (!isOpen) return null;

  // Active category for the current step
  const activeCategoryId = frozenCategories[currentCategoryIndex];
  const activeCategoryDef = EMAIL_CATEGORIES.find((c) => c.id === activeCategoryId);
  const activeCategorySenders = activeCategoryId ? categorySenders.get(activeCategoryId) || [] : [];

  // Total steps: Intro (1) + Categories (N) + Review (1)
  const totalCategorySteps = frozenCategories.length;
  const currentStepNumber =
    phase === 'intro'
      ? 1
      : phase === 'category'
      ? currentCategoryIndex + 2
      : phase === 'review'
      ? totalCategorySteps + 2
      : totalCategorySteps + 2;

  const totalStepsCount = totalCategorySteps + 2;
  const progressPercent = Math.min(
    100,
    Math.round(((currentStepNumber - 1) / Math.max(1, totalStepsCount - 1)) * 100)
  );

  // Statistics
  const pendingDecisionsList = Object.values(decisions);
  const toTrashEmailsCount = pendingDecisionsList
    .filter((d) => d.action === 'unsub_and_trash' || d.action === 'trash_only')
    .reduce((sum, d) => sum + d.count, 0);

  const toUnsubSendersCount = pendingDecisionsList.filter(
    (d) => d.action === 'unsub_and_trash' && d.hasUnsubscribe
  ).length;

  const toAutoDeleteRules = pendingDecisionsList.filter(
    (d) => d.autoDeleteFuture && (d.action === 'unsub_and_trash' || d.action === 'trash_only')
  );

  const estimatedSavedBytes = pendingDecisionsList
    .filter((d) => d.action === 'unsub_and_trash' || d.action === 'trash_only')
    .reduce((sum, d) => sum + d.totalSizeBytes, 0);

  // Helper to change sender decision
  const setSenderAction = (senderEmail: string, action: SenderActionChoice) => {
    setDecisions((prev) => {
      const key = senderEmail.toLowerCase();
      const existing = prev[key];
      if (!existing) return prev;
      return {
        ...prev,
        [key]: {
          ...existing,
          action,
          // When keeping, turn off auto-delete; when trashing, enable auto-delete by default
          autoDeleteFuture: action !== 'keep' ? existing.autoDeleteFuture || true : false,
        },
      };
    });
  };

  const toggleAutoDelete = (senderEmail: string) => {
    setDecisions((prev) => {
      const key = senderEmail.toLowerCase();
      const existing = prev[key];
      if (!existing) return prev;
      return {
        ...prev,
        [key]: {
          ...existing,
          autoDeleteFuture: !existing.autoDeleteFuture,
        },
      };
    });
  };

  // Bulk actions for the current category
  const selectAllCategoryToClean = () => {
    setDecisions((prev) => {
      const next = { ...prev };
      for (const s of activeCategorySenders) {
        const key = s.senderEmail.toLowerCase();
        if (next[key]) {
          next[key] = {
            ...next[key],
            action: s.hasUnsubscribe ? 'unsub_and_trash' : 'trash_only',
            autoDeleteFuture: true,
          };
        }
      }
      return next;
    });
  };

  const resetAllCategoryToKeep = () => {
    setDecisions((prev) => {
      const next = { ...prev };
      for (const s of activeCategorySenders) {
        const key = s.senderEmail.toLowerCase();
        if (next[key]) {
          next[key] = {
            ...next[key],
            action: 'keep',
            autoDeleteFuture: false,
          };
        }
      }
      return next;
    });
  };

  // Step Navigation Handlers
  const handleNext = () => {
    if (phase === 'intro') {
      if (frozenCategories.length > 0) {
        setPhase('category');
        setCurrentCategoryIndex(0);
      } else {
        setPhase('review');
      }
    } else if (phase === 'category') {
      if (currentCategoryIndex < frozenCategories.length - 1) {
        setCurrentCategoryIndex((prev) => prev + 1);
      } else {
        setPhase('review');
      }
    }
  };

  const handleBack = () => {
    if (phase === 'category') {
      if (currentCategoryIndex > 0) {
        setCurrentCategoryIndex((prev) => prev - 1);
      } else {
        setPhase('intro');
      }
    } else if (phase === 'review') {
      if (frozenCategories.length > 0) {
        setPhase('category');
        setCurrentCategoryIndex(frozenCategories.length - 1);
      } else {
        setPhase('intro');
      }
    }
  };

  // Execute Cleanup Handler
  const handleExecuteCleanup = async () => {
    setIsExecuting(true);
    const toTrashIds: string[] = [];
    const unsubEmailTargets: EmailMetadata[] = [];
    const autoRulesToSave: Array<Omit<AutoDeleteRule, 'id' | 'createdAt' | 'deletedCount'>> = [];

    for (const d of Object.values(decisions)) {
      if (d.action === 'unsub_and_trash' || d.action === 'trash_only') {
        toTrashIds.push(...d.emailIds);
      }

      if (d.action === 'unsub_and_trash' && d.hasUnsubscribe) {
        const sampleEmail = snapshotEmails.find(
          (e) => e.senderEmail.toLowerCase() === d.senderEmail.toLowerCase() && e.hasUnsubscribe
        );
        if (sampleEmail) unsubEmailTargets.push(sampleEmail);
      }

      if (d.autoDeleteFuture && (d.action === 'unsub_and_trash' || d.action === 'trash_only')) {
        autoRulesToSave.push({
          target: 'sender',
          pattern: d.senderEmail.toLowerCase(),
          senderName: d.senderName,
          action: d.action === 'unsub_and_trash' ? 'trash_and_unsub' : 'trash',
          enabled: true,
          category: d.category,
        });
      }
    }

    const totalOps = unsubEmailTargets.length + (toTrashIds.length > 0 ? 1 : 0) + 1;
    let completed = 0;
    setExecutionProgress({ current: 0, total: totalOps });

    try {
      // 1. Unsubscribes
      if (unsubEmailTargets.length > 0) {
        setExecutingStatus(`Sending unsubscribe requests (0/${unsubEmailTargets.length})…`);
        for (let i = 0; i < unsubEmailTargets.length; i++) {
          try {
            await onUnsubscribe(unsubEmailTargets[i]);
          } catch {
            /* ignore individual errors */
          }
          completed++;
          setExecutionProgress({ current: completed, total: totalOps });
          setExecutingStatus(`Sending unsubscribe requests (${i + 1}/${unsubEmailTargets.length})…`);
        }
      }

      // 2. Batch Trash
      if (toTrashIds.length > 0) {
        setExecutingStatus(`Moving ${toTrashIds.length} emails to Trash…`);
        await onBatchTrash(toTrashIds);
        completed++;
        setExecutionProgress({ current: completed, total: totalOps });
      }

      // 3. Save Auto-rules
      if (autoRulesToSave.length > 0) {
        setExecutingStatus(`Saving ${autoRulesToSave.length} Auto-Delete sync rules…`);
        saveBulkAutoRules(autoRulesToSave);
        if (onAutoRulesUpdated) onAutoRulesUpdated();
      }

      completed++;
      setExecutionProgress({ current: completed, total: totalOps });
      setExecutingStatus('Cleanup complete!');

      // Transition to success screen
      setPhase('success');
    } catch (err) {
      console.error('Wizard execution error:', err);
      setExecutingStatus('An error occurred during cleanup.');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/60 backdrop-blur-sm">
      <div className="relative flex flex-col w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border border-unload bg-paper shadow-sm">
        {/* Glow Header Accent Bar */}
        <div className="h-1.5 w-full bg-signal" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-linen px-6 py-4 bg-sheet">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-signal text-ink shadow-md">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-ink tracking-wide">
                  Inbox Cleaning Wizard
                </h2>
                {phase !== 'success' && (
                  <span className="rounded-full bg-unload border border-unload px-2 py-0.5 text-[10px] font-semibold text-paper">
                    Step {currentStepNumber} of {totalStepsCount}
                  </span>
                )}
              </div>
              <p className="text-xs text-ink-soft mt-0.5">
                Review your categories, choose what to clean, and set auto-delete rules.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isExecuting}
            className="rounded-lg p-1.5 text-ink-soft hover:bg-linen/50 hover:text-ink transition disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress Bar (capped at 100%, never glitches or overshoots) */}
        {phase !== 'success' && (
          <div className="px-6 py-2.5 border-b border-linen bg-sheet">
            <div className="flex items-center justify-between text-xs font-medium text-ink-soft mb-1.5">
              <span>
                {phase === 'intro'
                  ? 'Overview & Scan'
                  : phase === 'review'
                  ? 'Review & Confirm'
                  : `${activeCategoryDef?.label || 'Category'} (${currentCategoryIndex + 1}/${frozenCategories.length})`}
              </span>
              <span className="font-mono text-unload font-bold">{progressPercent}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-sheet overflow-hidden">
              <div
                className="h-full bg-ink transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* PHASE 1: INTRO & INBOX SCAN */}
          {phase === 'intro' && (
            <div className="space-y-6">
              <div className="relative overflow-hidden rounded-2xl border border-linen bg-sheet p-5 text-center">
                <span className="stream-band absolute inset-x-0 top-0 h-1" style={{ ['--stream-color' as string]: 'var(--color-keep)' }} aria-hidden />
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-keep/15 border border-keep/40 text-keep mb-3">
                  <Mail className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-ink">Let&apos;s clean up your inbox</h3>
                <p className="text-xs text-ink max-w-md mx-auto mt-1.5 leading-relaxed">
                  We found <span className="font-bold text-ink">{snapshotEmails.length}</span> emails across{' '}
                  <span className="font-bold text-unload">{frozenCategories.length} categories</span>. You have full control — nothing is deleted until you select it and confirm.
                </p>
              </div>

              {/* Informational Notice about Safe Defaults */}
              <div className="flex items-center gap-2.5 rounded-xl border border-unload/40 bg-unload/10 p-3 text-xs text-ink">
                <Info className="h-4 w-4 shrink-0 text-unload" />
                <span>
                  All senders start in <strong>Keep</strong> mode by default. You choose exactly which senders to unsubscribe from or trash.
                </span>
              </div>

              {/* Categories list */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
                  Categories ready for review:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {frozenCategories.map((catId) => {
                    const catDef = EMAIL_CATEGORIES.find((c) => c.id === catId);
                    const count = categorizedEmails.get(catId)?.length || 0;
                    const senders = categorySenders.get(catId)?.length || 0;
                    if (!catDef) return null;
                    return (
                      <div
                        key={catId}
                        className="flex items-center justify-between rounded-xl border border-linen bg-sheet p-3.5"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="inline-flex items-center gap-1.5 rounded-lg border border-linen px-2.5 py-1 text-xs font-bold text-ink bg-sheet"
                          >
                            <span className={`h-2 w-2 rounded-[2px] ${catDef.dot}`} aria-hidden />
                            {catDef.shortLabel}
                          </span>
                          <div>
                            <p className="text-xs font-semibold text-ink">{catDef.label}</p>
                            <p className="text-[11px] text-ink-soft">{senders} top senders</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-ink font-mono">{count} emails</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* PHASE 2: CATEGORY SENDER AUDIT */}
          {phase === 'category' && activeCategoryDef && (
            <div className="space-y-5">
              {/* Category Header Banner with Spacious Layout */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-linen bg-sheet p-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-xl border border-linen px-3 py-1 text-xs font-bold text-ink bg-sheet"
                    >
                      <span className={`h-2 w-2 rounded-[2px] ${activeCategoryDef.dot}`} aria-hidden />
                      {activeCategoryDef.label}
                    </span>
                    <span className="text-xs text-ink-soft">
                      {categorizedEmails.get(activeCategoryId)?.length || 0} emails · {activeCategorySenders.length} senders
                    </span>
                  </div>
                  <p className="text-xs text-ink mt-1">{activeCategoryDef.description}</p>
                </div>

                {/* Clear Quick Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={selectAllCategoryToClean}
                    className="rounded-lg border border-unload bg-unload px-3 py-1.5 text-xs font-bold text-paper hover:bg-unload transition"
                  >
                    Select All to Clean
                  </button>
                  <button
                    onClick={resetAllCategoryToKeep}
                    className="rounded-lg border border-linen bg-sheet px-3 py-1.5 text-xs font-semibold text-ink-soft hover:text-ink transition"
                  >
                    Keep All
                  </button>
                </div>
              </div>

              {/* Senders Drilldown List with Clean, Spacious Cards */}
              <div className="space-y-3">
                {activeCategorySenders.map((sender) => {
                  const key = sender.senderEmail.toLowerCase();
                  const decision = decisions[key] || {
                    action: 'keep',
                    autoDeleteFuture: false,
                  };

                  const isCleaning = decision.action !== 'keep';

                  return (
                    <div
                      key={sender.senderEmail}
                      className={`rounded-xl border p-4 transition-all space-y-3 ${
                        decision.action === 'unsub_and_trash'
                          ? 'border-unload bg-unload/10 shadow-sm'
                          : decision.action === 'trash_only'
                          ? 'border-trash/40 bg-trash/20 shadow-sm'
                          : 'border-linen bg-sheet'
                      }`}
                    >
                      {/* Top Row: Sender Info + Segmented Action Buttons */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Sender details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-ink truncate max-w-[220px]">
                              {sender.senderName}
                            </span>
                            <span className="text-xs text-ink-soft font-mono">
                              @{sender.senderDomain}
                            </span>
                            {sender.hasUnsubscribe && (
                              <span className="rounded-full bg-keep/15 border border-keep/30 px-2 py-0.5 text-[10px] font-bold text-keep flex items-center gap-1">
                                <ShieldCheck className="h-3 w-3" />
                                1-Click Unsub
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-ink-soft">
                            <span className="font-semibold text-ink">{sender.count} emails</span>
                            <span>·</span>
                            <span className="font-mono text-unload">{formatBytes(sender.totalSizeBytes)}</span>
                          </div>
                        </div>

                        {/* Action Choices Segmented Control */}
                        <div className="flex items-center rounded-xl border border-linen bg-sheet p-1 gap-1 shrink-0">
                          {/* Keep button */}
                          <button
                            onClick={() => setSenderAction(sender.senderEmail, 'keep')}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                              decision.action === 'keep'
                                ? 'bg-sheet text-ink shadow-sm'
                                : 'text-ink-soft hover:text-ink'
                            }`}
                          >
                            Keep
                          </button>

                          {/* Trash Only button */}
                          <button
                            onClick={() => setSenderAction(sender.senderEmail, 'trash_only')}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                              decision.action === 'trash_only'
                                ? 'bg-trash text-paper shadow-md shadow-trash/20'
                                : 'text-trash hover:bg-trash/15'
                            }`}
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Trash Only</span>
                          </button>

                          {/* Unsub & Trash combo button (only if unsub available) */}
                          {sender.hasUnsubscribe && (
                            <button
                              onClick={() => setSenderAction(sender.senderEmail, 'unsub_and_trash')}
                              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                decision.action === 'unsub_and_trash'
                                  ? 'bg-ink text-paper shadow-md'
                                  : 'text-unload hover:bg-unload/15'
                              }`}
                            >
                              <ShieldCheck className="h-3 w-3 text-keep" />
                              <span>+</span>
                              <Trash2 className="h-3 w-3 text-trash" />
                              <span>Unsub &amp; Trash</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Bottom Row: Auto-Delete Future Emails Toggle (only shown when user chose to clean) */}
                      {isCleaning && (
                        <div className="pt-2.5 border-t border-linen flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={decision.autoDeleteFuture}
                              onChange={() => toggleAutoDelete(sender.senderEmail)}
                              className="rounded border-linen text-unload focus:ring-unload h-4 w-4 bg-sheet"
                            />
                            <span className="text-xs text-ink flex items-center gap-1.5">
                              <Zap className="h-3.5 w-3.5 text-warn" />
                              <span>Auto-delete future emails from this sender on sync</span>
                            </span>
                          </label>
                          <span className="text-[11px] text-ink-soft font-mono">
                            @{sender.senderDomain}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PHASE 3: REVIEW & CONFIRMATION */}
          {phase === 'review' && (
            <div className="space-y-6">
              <div className="relative overflow-hidden rounded-2xl border border-linen bg-sheet p-5">
                <span className="stream-band absolute inset-x-0 top-0 h-1" style={{ ['--stream-color' as string]: 'var(--color-unload)' }} aria-hidden />
                <h3 className="text-base font-bold text-ink flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-unload" />
                  <span>Review Your Cleanup Plan</span>
                </h3>
                <p className="text-xs text-ink mt-1">
                  Nothing has been deleted yet. Check the summary below and click execute when you are ready.
                </p>
              </div>

              {/* Review metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-trash/30 bg-trash/20 p-4 text-center">
                  <div className="text-2xl font-bold text-trash">{toTrashEmailsCount}</div>
                  <div className="text-xs text-ink-soft mt-0.5">Emails to Trash</div>
                </div>
                <div className="rounded-xl border border-unload bg-unload/10 p-4 text-center">
                  <div className="text-2xl font-bold text-unload font-mono">
                    {formatBytes(estimatedSavedBytes)}
                  </div>
                  <div className="text-xs text-ink-soft mt-0.5">Space Saved</div>
                </div>
                <div className="rounded-xl border border-keep/30 bg-keep/20 p-4 text-center">
                  <div className="text-2xl font-bold text-keep">{toUnsubSendersCount}</div>
                  <div className="text-xs text-ink-soft mt-0.5">Unsubscribes</div>
                </div>
                <div className="rounded-xl border border-warn/30 bg-warn/20 p-4 text-center">
                  <div className="text-2xl font-bold text-warn">{toAutoDeleteRules.length}</div>
                  <div className="text-xs text-ink-soft mt-0.5">Auto-Clean Rules</div>
                </div>
              </div>

              {toTrashEmailsCount === 0 && toUnsubSendersCount === 0 && (
                <div className="rounded-xl border border-linen bg-sheet p-5 text-center text-xs text-ink-soft">
                  You have not selected any emails to trash or senders to unsubscribe from. You can go back to previous steps to choose senders, or close the wizard.
                </div>
              )}

              {/* Auto-delete rules preview */}
              {toAutoDeleteRules.length > 0 && (
                <div className="rounded-xl border border-linen bg-sheet p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-warn">
                    <Zap className="h-4 w-4" />
                    <span>Auto-Delete Rules to Register ({toAutoDeleteRules.length})</span>
                  </div>
                  <p className="text-xs text-ink-soft">
                    On future syncs, MailYard will automatically move incoming emails from these senders to Trash:
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-1">
                    {toAutoDeleteRules.map((r) => (
                      <span
                        key={r.senderEmail}
                        className="inline-flex items-center gap-1 rounded-lg border border-warn bg-warn px-2.5 py-1 text-xs font-mono text-paper"
                      >
                        <Zap className="h-3 w-3 text-warn" />
                        {r.senderEmail}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Live progress indicator during execution */}
              {isExecuting && (
                <div className="rounded-xl border border-unload bg-unload/10 p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-ink">
                    <span className="font-semibold flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-unload" />
                      {executingStatus}
                    </span>
                    <span className="font-mono text-ink-soft">
                      {executionProgress.current} / {executionProgress.total}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-sheet overflow-hidden">
                    <div
                      className="h-full bg-trash transition-all duration-300"
                      style={{
                        width: `${
                          executionProgress.total > 0
                            ? (executionProgress.current / executionProgress.total) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PHASE 4: SUCCESS CELEBRATION */}
          {phase === 'success' && (
            <div className="text-center py-8 space-y-6">
              <div className="relative inline-flex items-center justify-center">
                <div className="h-20 w-20 rounded-full bg-keep/20 border-2 border-keep flex items-center justify-center text-keep shadow-sm">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-ink tracking-wide">
                  Inbox Cleaned &amp; Automated!
                </h3>
                <p className="text-xs text-ink max-w-md mx-auto mt-1.5 leading-relaxed">
                  Successfully cleaned <span className="font-bold text-ink">{toTrashEmailsCount} emails</span> and freed{' '}
                  <span className="font-mono font-bold text-unload">{formatBytes(estimatedSavedBytes)}</span> of space.
                </p>
              </div>

              {toAutoDeleteRules.length > 0 && (
                <div className="inline-block rounded-xl border border-warn bg-warn px-5 py-3 text-xs text-paper">
                  <p className="font-semibold flex items-center justify-center gap-2">
                    <Zap className="h-4 w-4 text-warn" />
                    <span>{toAutoDeleteRules.length} Auto-Delete sync rules are now active!</span>
                  </p>
                  <p className="text-[11px] text-warn/80 mt-1">
                    Whenever you sync new batches of emails, these senders will be moved to Trash automatically.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between border-t border-linen px-6 py-4 bg-sheet">
          {phase !== 'success' ? (
            <>
              {/* Back button */}
              <button
                onClick={handleBack}
                disabled={phase === 'intro' || isExecuting}
                className="flex items-center gap-1.5 rounded-xl border border-linen bg-sheet px-3.5 py-2 text-xs font-semibold text-ink hover:bg-linen/50 hover:text-ink transition disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back</span>
              </button>

              {/* Right: Next or Execute button */}
              {phase === 'review' ? (
                <button
                  onClick={handleExecuteCleanup}
                  disabled={isExecuting || (toTrashEmailsCount === 0 && toUnsubSendersCount === 0)}
                  className="flex items-center gap-2 rounded-xl bg-keep px-5 py-2.5 text-xs font-bold text-paper shadow-lg shadow-keep/20 hover:bg-ink transition disabled:opacity-50"
                >
                  {isExecuting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 text-warn" />
                  )}
                  <span>{isExecuting ? 'Cleaning…' : `Execute Cleanup (${toTrashEmailsCount} emails)`}</span>
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-xs font-bold text-paper shadow-md hover:bg-depot transition"
                >
                  <span>{phase === 'intro' ? 'Start Guided Clean' : 'Next Category'}</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </>
          ) : (
            <div className="w-full flex items-center justify-end gap-2.5">
              {onRefreshInbox && (
                <button
                  onClick={() => {
                    onRefreshInbox();
                    onClose();
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-linen bg-sheet px-4 py-2 text-xs font-semibold text-ink hover:bg-linen/50 transition"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-unload" />
                  <span>Refresh Inbox</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 rounded-xl border border-linen bg-sheet px-5 py-2 text-xs font-bold text-ink hover:border-ink transition"
              >
                <Check className="h-4 w-4" />
                <span>Done</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
