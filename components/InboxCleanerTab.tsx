'use client';

import React, { useState, useMemo } from 'react';
import {
  Trash2,
  Search,
  CheckSquare,
  Square,
  HardDrive,
  BellRing,
  History,
  ShieldCheck,
  Ban,
  ArrowUpDown,
  AlertTriangle,
  Loader2,
  Sparkles,
  Layers,
  Zap,
  
} from 'lucide-react';
import { EmailMetadata, BlockedSenderRecord } from '@/lib/types';
import { formatBytes } from '@/lib/gmail/parser';
import {
  CategoryExplorerWidget,
} from './CategoryExplorerWidget';
import {
  classifyEmailCategory,
  EmailCategoryId,
  EMAIL_CATEGORIES,
} from '@/lib/categories';

interface InboxCleanerTabProps {
  emails: EmailMetadata[];
  blockedSenders: BlockedSenderRecord[];
  onBatchTrash: (ids: string[]) => Promise<void>;
  onUnsubscribe: (email: EmailMetadata) => Promise<any>;
  onBlockSender: (domain: string, senderEmail?: string) => Promise<void>;
  isProcessing: boolean;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  nextPageToken?: string;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  fetchLimit?: number;
  onFetchLimitChange?: (limit: number) => void;
  onOpenWizard?: () => void;
  onOpenAutoRules?: () => void;
  autoRulesCount?: number;
}

export function InboxCleanerTab({
  emails,
  blockedSenders,
  onBatchTrash,
  onUnsubscribe,
  onBlockSender,
  isProcessing,
  activeFilter,
  setActiveFilter,
  nextPageToken,
  onLoadMore,
  isLoadingMore,
  fetchLimit = 100,
  onFetchLimitChange,
  onOpenWizard,
  onOpenAutoRules,
  autoRulesCount = 0,
}: InboxCleanerTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [heavyFilterSize, setHeavyFilterSize] = useState<'5mb' | '10mb'>('5mb');
  const [ancientFilterYears, setAncientFilterYears] = useState<'1yr' | '2yrs'>('1yr');
  const [sortField, setSortField] = useState<'date' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedCategory, setSelectedCategory] = useState<EmailCategoryId>('all');
  const [selectedSenderEmail, setSelectedSenderEmail] = useState<string | null>(null);
  const [showCategoryWidget, setShowCategoryWidget] = useState(true);

  // Set of blocked domains for fast lookup
  const blockedDomainSet = useMemo(() => {
    return new Set(blockedSenders.map((b) => b.domain.toLowerCase()));
  }, [blockedSenders]);

  // Filtered emails based on active filter, search query, category, and sender
  const filteredEmails = useMemo(() => {
    return emails.filter((item) => {
      // 1. Text Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSubject = item.subject.toLowerCase().includes(q);
        const matchesSender = item.senderName.toLowerCase().includes(q) || item.senderEmail.toLowerCase().includes(q);
        const matchesDomain = item.senderDomain.toLowerCase().includes(q);
        if (!matchesSubject && !matchesSender && !matchesDomain) {
          return false;
        }
      }

      // 2. Main KPI Category Filter
      if (activeFilter === 'heavy_5mb' || activeFilter === 'heavy') {
        if (heavyFilterSize === '10mb' ? !item.isHeavy10MB : !item.isHeavy5MB) return false;
      } else if (activeFilter === 'mass_notifications') {
        if (!item.isMassNotification) return false;
      } else if (activeFilter === 'ancient_1yr' || activeFilter === 'ancient') {
        if (ancientFilterYears === '2yrs' ? !item.isAncient2Years : !item.isAncient1Year) return false;
      } else if (activeFilter === 'unsubscribable') {
        if (!item.hasUnsubscribe) return false;
      } else if (activeFilter === 'blocked') {
        if (!blockedDomainSet.has(item.senderDomain.toLowerCase())) return false;
      }

      // 3. Category Matrix filter
      if (selectedCategory !== 'all') {
        const cat = classifyEmailCategory(item);
        if (cat !== selectedCategory) return false;
      }

      // 4. Sender Matrix filter
      if (selectedSenderEmail) {
        if (item.senderEmail.toLowerCase() !== selectedSenderEmail.toLowerCase()) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortField === 'size') {
        return sortOrder === 'desc' ? b.sizeBytes - a.sizeBytes : a.sizeBytes - b.sizeBytes;
      }
      // default: date
      return sortOrder === 'desc' ? b.internalDate - a.internalDate : a.internalDate - b.internalDate;
    });
  }, [
    emails,
    searchQuery,
    activeFilter,
    heavyFilterSize,
    ancientFilterYears,
    blockedDomainSet,
    selectedCategory,
    selectedSenderEmail,
    sortField,
    sortOrder,
  ]);

  // Handle select all emails from specific sender
  const handleSelectAllFromSender = (emailIds: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of emailIds) {
        next.add(id);
      }
      return next;
    });
  };

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAllVisible = () => {
    if (selectedIds.size === filteredEmails.length && filteredEmails.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEmails.map((e) => e.id)));
    }
  };

  const handleSelectOnlyMass = () => {
    const ids = filteredEmails.filter((e) => e.isMassNotification).map((e) => e.id);
    setSelectedIds(new Set(ids));
  };

  const handleSelectOnlyHeavy = () => {
    const ids = filteredEmails.filter((e) => e.isHeavy5MB).map((e) => e.id);
    setSelectedIds(new Set(ids));
  };

  const handleSelectOnlyAncient = () => {
    const ids = filteredEmails.filter((e) => e.isAncient1Year).map((e) => e.id);
    setSelectedIds(new Set(ids));
  };

  // Selected totals
  const selectedEmails = useMemo(() => {
    return emails.filter((e) => selectedIds.has(e.id));
  }, [emails, selectedIds]);

  const selectedSizeBytes = selectedEmails.reduce((acc, e) => acc + e.sizeBytes, 0);
  const selectedSizeFormatted = formatBytes(selectedSizeBytes);

  const executeBatchTrash = async () => {
    if (selectedIds.size === 0) return;
    const idsToRemove = Array.from(selectedIds);
    setRemovingIds(new Set(idsToRemove));
    setShowConfirmModal(false);
    // Allow smooth row-exit animation to complete before removing from state
    await new Promise((resolve) => setTimeout(resolve, 380));
    await onBatchTrash(idsToRemove);
    setSelectedIds(new Set());
    setRemovingIds(new Set());
  };

  const handleTrashSingle = async (id: string) => {
    setRemovingIds((prev) => new Set(prev).add(id));
    await new Promise((resolve) => setTimeout(resolve, 380));
    await onBatchTrash([id]);
    setRemovingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Onboarding Cleaning Wizard Hero Prompt Banner */}
      {emails.length > 0 && onOpenWizard && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 depot-rail p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-signal text-ink">
              <Sparkles className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-paper tracking-wide">
                Step-by-Step Cleaning Wizard
              </h3>
              <p className="text-[11px] text-paper/70 mt-0.5">
                Audit cluttered categories, 1-click unsubscribe, and set auto-delete patterns for future syncs.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end shrink-0">
            {onOpenAutoRules && (
              <button
                onClick={onOpenAutoRules}
                className="tnum flex items-center gap-1.5 border border-white/25 px-3 py-1.5 text-xs font-semibold text-paper hover:bg-white/10 transition"
                title="Manage automated sync rules"
              >
                <Zap className="h-3.5 w-3.5 text-signal" aria-hidden />
                <span>Auto-Rules</span>
                {autoRulesCount > 0 && (
                  <span className="tnum text-signal font-bold">{autoRulesCount}</span>
                )}
              </button>
            )}

            <button
              onClick={onOpenWizard}
              className="flex items-center gap-1.5 bg-signal px-4 py-1.5 text-xs font-bold text-ink hover:bg-paper-2 transition"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              <span>Launch Clean Wizard &rarr;</span>
            </button>
          </div>
        </div>
      )}
      {/* Category & Sender Explorer Widget */}
      {showCategoryWidget && (
        <CategoryExplorerWidget
          emails={emails}
          blockedSenders={blockedSenders}
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => setSelectedCategory(cat)}
          selectedSenderEmail={selectedSenderEmail}
          onSelectSenderEmail={(sender) => setSelectedSenderEmail(sender)}
          onSelectAllFromSender={handleSelectAllFromSender}
          onBlockSender={onBlockSender}
          onUnsubscribe={onUnsubscribe}
          onBatchTrash={onBatchTrash}
          selectedEmailIds={selectedIds}
          onBatchTrashSelected={() => setShowConfirmModal(true)}
        />
      )}

      {/* Controls Bar: Filters & Sub-toggles */}
      <div className="flex flex-col gap-3 rounded-2xl border border-linen bg-sheet p-4">
        <div className="flex flex-col items-stretch justify-between gap-3 lg:flex-row lg:items-center">
          {/* Main Filter Chips */}
          <div className="flex max-w-full gap-1.5 overflow-x-auto pb-1 scrollbar-none lg:flex-wrap lg:overflow-visible lg:pb-0">
            <button
              onClick={() => {
                setActiveFilter('all');
                setSelectedCategory('all');
                setSelectedSenderEmail(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeFilter === 'all' && selectedCategory === 'all' && !selectedSenderEmail
                  ? 'bg-ink text-paper'
                  : 'bg-sheet border border-linen text-ink-soft hover:border-ink-mute hover:text-ink'
              }`}
            >
              All ({emails.length})
            </button>

            {/* Quick Clean Wizard Button */}
            {onOpenWizard && (
              <button
                onClick={onOpenWizard}
                className="flex items-center gap-1.5 rounded-lg border border-ink bg-ink px-3 py-1.5 text-xs font-bold text-paper hover:bg-trash transition"
                title="Launch step-by-step cleaning wizard"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                <span>Clean Wizard</span>
              </button>
            )}

            {/* Category Matrix Widget Toggle Button */}
            <button
              onClick={() => setShowCategoryWidget(!showCategoryWidget)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                showCategoryWidget || selectedCategory !== 'all' || selectedSenderEmail
                  ? 'bg-unload/15 border border-unload text-unload'
                  : 'bg-sheet border border-linen text-ink-soft hover:border-ink-mute hover:text-ink'
              }`}
              title="Toggle Category & Sender Explorer Widget"
            >
              <Layers className="h-3.5 w-3.5 text-unload" />
              <span>Category Matrix</span>
              {(selectedCategory !== 'all' || selectedSenderEmail) && (
                <span className="rounded-full bg-unload px-1.5 py-0.2 text-[9px] font-black text-paper">
                  FILTERED
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveFilter('heavy')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeFilter === 'heavy' || activeFilter === 'heavy_5mb'
                  ? 'bg-warn text-paper shadow-sm shadow-warn/30'
                  : 'bg-sheet border border-transparent text-ink-soft hover:text-ink'
              }`}
            >
              <HardDrive className="h-3.5 w-3.5 text-warn" />
              Heavy Files
            </button>

            <button
              onClick={() => setActiveFilter('mass_notifications')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeFilter === 'mass_notifications'
                  ? 'bg-ink text-paper '
                  : 'bg-sheet border border-transparent text-ink-soft hover:text-ink'
              }`}
            >
              <BellRing className="h-3.5 w-3.5 text-unload" />
              Mass Notifications
            </button>

            <button
              onClick={() => setActiveFilter('ancient')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeFilter === 'ancient' || activeFilter === 'ancient_1yr'
                  ? 'bg-ink text-paper '
                  : 'bg-sheet border border-transparent text-ink-soft hover:text-ink'
              }`}
            >
              <History className="h-3.5 w-3.5 text-unload" />
              Ancient History
            </button>

            <button
              onClick={() => setActiveFilter('blocked')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeFilter === 'blocked'
                  ? 'bg-trash text-paper shadow-sm shadow-trash/20'
                  : 'bg-sheet border border-transparent text-ink-soft hover:text-ink'
              }`}
            >
              <Ban className="h-3.5 w-3.5 text-trash" />
              Blocked ({emails.filter((e) => blockedDomainSet.has(e.senderDomain.toLowerCase())).length})
            </button>
          </div>

          {/* Sub-threshold selectors */}
          <div className="flex flex-wrap items-center gap-2">
            {(activeFilter === 'heavy' || activeFilter === 'heavy_5mb') && (
              <div className="flex items-center rounded-lg border border-linen bg-sheet p-0.5 text-xs font-medium text-ink">
                <button
                  onClick={() => setHeavyFilterSize('5mb')}
                  className={`rounded-md px-2 py-1 ${
                    heavyFilterSize === '5mb' ? 'bg-warn text-paper' : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  &gt; 5 MB
                </button>
                <button
                  onClick={() => setHeavyFilterSize('10mb')}
                  className={`rounded-md px-2 py-1 ${
                    heavyFilterSize === '10mb' ? 'bg-warn text-paper' : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  &gt; 10 MB
                </button>
              </div>
            )}

            {(activeFilter === 'ancient' || activeFilter === 'ancient_1yr') && (
              <div className="flex items-center rounded-lg border border-linen bg-sheet p-0.5 text-xs font-medium text-ink">
                <button
                  onClick={() => setAncientFilterYears('1yr')}
                  className={`rounded-md px-2 py-1 ${
                    ancientFilterYears === '1yr' ? 'bg-ink text-paper' : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  &gt; 1 Year
                </button>
                <button
                  onClick={() => setAncientFilterYears('2yrs')}
                  className={`rounded-md px-2 py-1 ${
                    ancientFilterYears === '2yrs' ? 'bg-ink text-paper' : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  &gt; 2 Years
                </button>
              </div>
            )}

            {/* Scan Depth Selector */}
            {onFetchLimitChange && (
              <div className="flex items-center rounded-lg border border-linen bg-sheet p-0.5 text-xs font-medium text-ink">
                <span className="px-2 text-ink-soft text-[10px] uppercase font-bold">Scan:</span>
                {[100, 250, 500].map((limit) => (
                  <button
                    key={limit}
                    onClick={() => onFetchLimitChange(limit)}
                    disabled={isProcessing}
                    className={`rounded-md px-2 py-0.5 font-bold transition ${
                      fetchLimit === limit ? 'bg-ink text-paper shadow-sm' : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    {limit}
                  </button>
                ))}
              </div>
            )}

            {/* Sort Toggle */}
            <button
              onClick={() => {
                if (sortField === 'date') {
                  setSortField('size');
                  setSortOrder('desc');
                } else {
                  setSortField('date');
                  setSortOrder('desc');
                }
              }}
              className="flex items-center gap-1 rounded-lg border border-linen bg-sheet px-2.5 py-1 text-xs text-ink hover:bg-linen/50 transition"
              title="Toggle Sort by Date or Size"
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-ink-soft" />
              <span>Sort: {sortField === 'size' ? 'Size' : 'Date'}</span>
            </button>
          </div>
        </div>

        {/* Search bar and Quick Selectors */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-linen">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-soft" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sender, domain, or subject keywords..."
              className="w-full rounded-xl border border-linen bg-sheet pl-9 pr-3 py-1.5 text-xs text-ink placeholder-ink-mute focus:border-unload focus:outline-none focus:ring-1 focus:ring-unload"
            />
          </div>

          {/* Quick Preset Selector Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-soft">
            <span>Select:</span>
            <button
              onClick={handleSelectAllVisible}
              className="rounded-md border border-linen bg-sheet px-2 py-1 font-semibold text-ink hover:border-ink transition"
            >
              {selectedIds.size === filteredEmails.length && filteredEmails.length > 0
                ? 'Deselect All'
                : 'All Visible'}
            </button>
            <button
              onClick={handleSelectOnlyMass}
              className="rounded-md border border-unload/40 bg-unload/10 px-2 py-1 font-semibold text-unload hover:border-unload transition"
            >
              All Notifications
            </button>
            <button
              onClick={handleSelectOnlyHeavy}
              className="rounded-md border border-warn/40 bg-warn/10 px-2 py-1 font-semibold text-warn hover:border-warn transition"
            >
              All Heavy (&gt;5MB)
            </button>
            <button
              onClick={handleSelectOnlyAncient}
              className="rounded-md border border-warn/40 bg-warn/10 px-2 py-1 font-semibold text-warn hover:border-warn transition"
            >
              All Ancient (&gt;1yr)
            </button>
          </div>
        </div>
      </div>

      {/* Weighbridge Ticket: Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="ticket sticky top-20 z-30 flex flex-col items-stretch gap-3 p-3 shadow-lg shadow-ink/10 slide-in-from-top-2 duration-200 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckSquare className="h-4 w-4 text-keep shrink-0" />
            <span className="tnum text-xs font-bold text-ink">
              {selectedIds.size} email{selectedIds.size > 1 ? 's' : ''} on the scale
            </span>
            <span className="tnum rounded-full bg-paper-2 px-2 py-0.5 text-[11px] font-mono text-ink-soft">
              ~{selectedSizeFormatted}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="rounded-lg border border-linen bg-sheet px-2.5 py-1 text-xs font-semibold text-ink-soft hover:border-ink hover:text-ink transition"
            >
              Clear
            </button>
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={isProcessing}
              className="flex items-center gap-1.5 rounded-lg bg-signal px-3.5 py-1 text-xs font-bold text-ink hover:bg-ink hover:text-paper disabled:opacity-50 transition"
            >
              {isProcessing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              <span>Trash {selectedIds.size} Selected</span>
            </button>
          </div>
        </div>
      )}

      {/* Email List Items */}
      <div className="space-y-2">
        {filteredEmails.length === 0 ? (
          <div className="rounded-2xl border border-linen bg-sheet p-12 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-ink-soft mb-3" />
            <h3 className="text-base font-semibold text-ink">No matching emails found</h3>
            <p className="text-xs text-ink-soft mt-1 max-w-sm mx-auto">
              Your inbox is clean according to this filter, or try adjusting your search keywords.
            </p>
          </div>
        ) : (
          filteredEmails.map((item) => {
            const isSelected = selectedIds.has(item.id);
            const isBlocked = blockedDomainSet.has(item.senderDomain.toLowerCase());
            const isRemoving = removingIds.has(item.id);

            return (
              <div
                key={item.id}
                className={`group relative flex items-start sm:items-center justify-between gap-3 rounded-xl border p-3 transition-all ${
                  isRemoving ? 'animate-row-exit' : ''
                } ${
                  isSelected
                    ? 'border-unload bg-unload/10 shadow-sm'
                    : isBlocked
                    ? 'border-trash/40 bg-trash/10'
                    : 'border-linen bg-sheet hover:border-ink-mute'
                }`}
              >
                {isRemoving && (
                  <span className="stamp text-trash pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 bg-sheet/85 text-[10px]">
                    Sorted out
                  </span>
                )}
                {/* Left: Checkbox + Sender Avatar + Metadata */}
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  {/* Select Checkbox */}
                  <button
                    onClick={() => handleToggleSelect(item.id)}
                    className="mt-1 sm:mt-0 text-ink-soft hover:text-ink transition"
                    title={isSelected ? 'Deselect' : 'Select'}
                  >
                    {isSelected ? (
                      <CheckSquare className="h-4 w-4 text-unload" />
                    ) : (
                      <Square className="h-4 w-4 text-ink-soft hover:text-ink-soft" />
                    )}
                  </button>

                  {/* Sender Avatar Initials */}
                  <div
                    className={`hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-paper shadow-sm ${
                      item.isHeavy5MB
                        ? 'bg-warn'
                        : item.isMassNotification
                        ? 'bg-ink/80'
                        : isBlocked
                        ? 'bg-trash/80'
                        : 'bg-ink-soft'
                    }`}
                  >
                    {item.senderName.slice(0, 1).toUpperCase() || 'M'}
                  </div>

                  {/* Content snippet */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                      <button
                        onClick={() => {
                          setSelectedSenderEmail(item.senderEmail);
                          setShowCategoryWidget(true);
                        }}
                        className="text-xs font-bold text-ink hover:text-unload transition truncate max-w-[200px] text-left"
                        title="Filter to this sender"
                      >
                        {item.senderName}
                      </button>
                      <span className="text-[10px] text-ink-soft font-mono">
                        @{item.senderDomain}
                      </span>

                      {/* Category Badge */}
                      {(() => {
                        const cat = classifyEmailCategory(item);
                        const catDef = EMAIL_CATEGORIES.find((c) => c.id === cat);
                        if (!catDef || catDef.id === 'all') return null;
                        return (
                          <button
                            onClick={() => {
                              setSelectedCategory(cat);
                              setShowCategoryWidget(true);
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-linen px-1.5 py-0.2 text-[9px] font-semibold text-ink transition hover:border-ink bg-sheet"
                            title={`Filter to ${catDef.label}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-[2px] ${catDef.dot}`} aria-hidden />
                            {catDef.shortLabel}
                          </button>
                        );
                      })()}

                      {/* Status Badges */}
                      {item.isHeavy10MB ? (
                        <span className="rounded-md border border-trash/30 bg-trash/15 px-1.5 py-0.2 text-[9px] font-semibold text-trash">
                          {item.sizeFormatted} Heavy
                        </span>
                      ) : item.isHeavy5MB ? (
                        <span className="rounded-md border border-warn/40 bg-warn/10 px-1.5 py-0.2 text-[9px] font-semibold text-warn">
                          {item.sizeFormatted}
                        </span>
                      ) : null}

                      {item.isMassNotification && (
                        <span className="rounded-md border border-unload/40 bg-unload/10 px-1.5 py-0.2 text-[9px] font-semibold text-unload">
                          Mass Alert
                        </span>
                      )}

                      {item.isAncient2Years ? (
                        <span className="rounded-md border border-unload/40 bg-unload/10 px-1.5 py-0.2 text-[9px] font-semibold text-unload">
                          &gt;2 Years Old
                        </span>
                      ) : item.isAncient1Year ? (
                        <span className="rounded-md border border-unload/40 bg-unload/10 px-1.5 py-0.2 text-[9px] font-semibold text-unload">
                          &gt;1 Year Old
                        </span>
                      ) : null}

                      {isBlocked && (
                        <span className="rounded-md border border-trash/30 bg-trash/20 px-1.5 py-0.2 text-[9px] font-semibold text-trash">
                          Domain Blocked
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-medium text-ink truncate">
                      {item.subject}
                    </p>

                    {item.snippet && (
                      <p className="text-[11px] text-ink-soft truncate max-w-2xl mt-0.5">
                        {item.snippet}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Date + Size + Quick Actions */}
                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                  {/* Size + Date column */}
                  <div className="hidden sm:flex flex-col items-end gap-0.5 mr-1">
                    {/* Size badge — always shown */}
                    <div className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-mono font-semibold ${
                      item.isHeavy10MB
                        ? 'bg-trash/15 text-trash border border-trash/25'
                        : item.isHeavy5MB
                        ? 'bg-warn/10 text-warn border border-warn/25'
                        : item.sizeBytes > 1024 * 1024
                        ? 'bg-sheet text-ink border border-linen'
                        : 'bg-sheet text-ink-soft border border-linen'
                    }`}>
                      <HardDrive className="h-2.5 w-2.5" />
                      <span>{item.sizeFormatted}</span>
                    </div>
                    {/* Date */}
                    <span className="text-[10px] text-ink-soft tabular-nums">
                      {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}
                    </span>
                  </div>

                  {/* Unsubscribe Quick Action */}
                  {item.hasUnsubscribe && (
                    <button
                      onClick={() => onUnsubscribe(item)}
                      disabled={isProcessing}
                      title="1-Click Unsubscribe"
                      className="hidden md:flex items-center gap-1 rounded-lg border border-keep/30 bg-keep/10 px-2 py-1 text-[11px] font-medium text-keep hover:bg-keep/20 transition disabled:opacity-50"
                    >
                      <ShieldCheck className="h-3 w-3" />
                      <span>Unsub</span>
                    </button>
                  )}

                  {/* Block Sender Quick Action */}
                  {!isBlocked && (
                    <button
                      onClick={() => onBlockSender(item.senderDomain, item.senderEmail)}
                      disabled={isProcessing}
                      title="Block sender domain"
                      className="hidden lg:flex items-center gap-1 rounded-lg border border-linen bg-sheet px-2 py-1 text-[11px] text-ink-soft hover:text-trash hover:border-trash/30 transition disabled:opacity-50"
                    >
                      <Ban className="h-3 w-3" />
                      <span>Block</span>
                    </button>
                  )}

                  {/* Single Trash Action with smooth removal animation */}
                  <button
                    onClick={() => handleTrashSingle(item.id)}
                    disabled={isProcessing || isRemoving}
                    title="Trash this email"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-linen bg-sheet text-ink-soft hover:border-trash/40 hover:bg-trash/10 hover:text-trash transition disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination: Load Next Batch */}
      {nextPageToken && onLoadMore && (
        <div className="flex justify-center pt-2 pb-4">
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="flex items-center gap-2 rounded-2xl border border-unload bg-unload/10 hover:bg-unload/10 px-6 py-2.5 text-xs font-bold text-unload shadow-sm transition disabled:opacity-50"
          >
            {isLoadingMore ? (
              <Loader2 className="h-4 w-4 animate-spin text-unload" />
            ) : (
              <Sparkles className="h-4 w-4 text-unload" />
            )}
            <span>Load Next Batch (+100 Emails)</span>
          </button>
        </div>
      )}

      {/* Confirmation Modal for Batch Trash */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-linen bg-sheet p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-trash mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-trash/10 border border-trash/30">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">Trash Selected Emails</h3>
                <p className="text-xs text-ink-soft">Confirmation required</p>
              </div>
            </div>

            <p className="text-xs text-ink leading-relaxed">
              Are you sure you want to move{' '}
              <span className="font-bold text-ink">{selectedIds.size} emails</span> (~
              <span className="font-bold text-warn">{selectedSizeFormatted}</span>) to the
              Gmail Trash?
            </p>

            <p className="text-[11px] text-ink-soft mt-2 bg-sheet p-2.5 rounded-lg border border-linen">
              Note: Messages will be moved to your Gmail Trash folder immediately. You can still restore them within 30 days directly from Gmail if needed.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="rounded-xl border border-linen bg-sheet px-4 py-2 text-xs font-semibold text-ink hover:bg-sheet transition"
              >
                Cancel
              </button>
              <button
                onClick={executeBatchTrash}
                disabled={isProcessing}
                className="flex items-center gap-1.5 rounded-xl bg-trash px-4 py-2 text-xs font-bold text-paper shadow-lg shadow-trash/20 hover:bg-trash transition disabled:opacity-50"
              >
                {isProcessing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Confirm & Trash</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
