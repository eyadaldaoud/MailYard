'use client';

import React, { useState, useMemo } from 'react';
import {
  Tag,
  Users,
  BellRing,
  Newspaper,
  Receipt,
  Code2,
  UserCheck,
  Inbox,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Search,
  Ban,
  ShieldCheck,
  Trash2,
  Loader2,
  X,
  Layers,
} from 'lucide-react';
import { EmailMetadata, BlockedSenderRecord } from '@/lib/types';
import {
  EMAIL_CATEGORIES,
  EmailCategoryId,
  classifyEmailCategory,
  aggregateSenders,
} from '@/lib/categories';
import { formatBytes } from '@/lib/gmail/parser';

interface CategoryExplorerWidgetProps {
  emails: EmailMetadata[];
  blockedSenders: BlockedSenderRecord[];
  selectedCategory: EmailCategoryId;
  onSelectCategory: (category: EmailCategoryId) => void;
  selectedSenderEmail: string | null;
  onSelectSenderEmail: (senderEmail: string | null) => void;
  onSelectAllFromSender?: (emailIds: string[]) => void;
  onBlockSender?: (domain: string, senderEmail?: string) => Promise<void>;
  onUnsubscribe?: (email: EmailMetadata) => Promise<{ success: boolean; message: string }>;
  onBatchTrash?: (ids: string[]) => Promise<void>;
  selectedEmailIds?: Set<string>;
  onBatchTrashSelected?: () => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Inbox,
  Tag,
  Users,
  BellRing,
  Newspaper,
  Receipt,
  Code2,
  UserCheck,
};

export function CategoryExplorerWidget({
  emails,
  blockedSenders,
  selectedCategory,
  onSelectCategory,
  selectedSenderEmail,
  onSelectSenderEmail,
  onSelectAllFromSender,
  onBlockSender,
  onUnsubscribe,
  onBatchTrash,
  selectedEmailIds,
  onBatchTrashSelected,
}: CategoryExplorerWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [senderSearch, setSenderSearch] = useState('');
  const [showAllSenders, setShowAllSenders] = useState(false);
  const [unsubLoading, setUnsubLoading] = useState<string | null>(null);
  const [blockLoading, setBlockLoading] = useState<string | null>(null);
  const [bulkTrashLoading, setBulkTrashLoading] = useState(false);
  const [bulkCombinedLoading, setBulkCombinedLoading] = useState(false);
  const [bulkUnsubLoading, setBulkUnsubLoading] = useState(false);
  const [bulkUnsubProgress, setBulkUnsubProgress] = useState<{ done: number; total: number } | null>(null);

  // Build quick lookup: senderEmail -> emails with unsubscribe options
  const emailsBySender = useMemo(() => {
    const map = new Map<string, EmailMetadata[]>();
    for (const email of emails) {
      const key = email.senderEmail.toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(email);
    }
    return map;
  }, [emails]);

  // Set of blocked domains for fast lookup
  const blockedDomainSet = useMemo(() => {
    return new Set(blockedSenders.map((b) => b.domain.toLowerCase()));
  }, [blockedSenders]);

  // Pre-classify all emails
  const classifiedEmails = useMemo(() => {
    return emails.map((email) => ({
      email,
      category: classifyEmailCategory(email),
    }));
  }, [emails]);

  // Per-category counts and size stats
  const categoryStats = useMemo(() => {
    const stats: Record<
      EmailCategoryId,
      { count: number; totalSizeBytes: number; senders: Map<string, number> }
    > = {
      all: { count: emails.length, totalSizeBytes: 0, senders: new Map() },
      promotions: { count: 0, totalSizeBytes: 0, senders: new Map() },
      social: { count: 0, totalSizeBytes: 0, senders: new Map() },
      updates: { count: 0, totalSizeBytes: 0, senders: new Map() },
      newsletters: { count: 0, totalSizeBytes: 0, senders: new Map() },
      finance: { count: 0, totalSizeBytes: 0, senders: new Map() },
      dev_work: { count: 0, totalSizeBytes: 0, senders: new Map() },
      personal: { count: 0, totalSizeBytes: 0, senders: new Map() },
    };

    for (const { email, category } of classifiedEmails) {
      const size = email.sizeBytes || 0;
      stats.all.totalSizeBytes += size;
      const senderKey = email.senderEmail || email.senderDomain;
      stats.all.senders.set(senderKey, (stats.all.senders.get(senderKey) || 0) + 1);

      if (stats[category]) {
        stats[category].count += 1;
        stats[category].totalSizeBytes += size;
        stats[category].senders.set(senderKey, (stats[category].senders.get(senderKey) || 0) + 1);
      }
    }

    return stats;
  }, [emails, classifiedEmails]);

  // Filter emails to the currently selected category for sender breakdown
  const categoryEmails = useMemo(() => {
    if (selectedCategory === 'all') return emails;
    return classifiedEmails
      .filter((item) => item.category === selectedCategory)
      .map((item) => item.email);
  }, [emails, classifiedEmails, selectedCategory]);

  // Aggregate senders within this active category
  const sendersList = useMemo(() => {
    return aggregateSenders(categoryEmails);
  }, [categoryEmails]);

  // Filtered senders based on search
  const filteredSenders = useMemo(() => {
    if (!senderSearch.trim()) return sendersList;
    const q = senderSearch.toLowerCase();
    return sendersList.filter(
      (s) =>
        s.senderName.toLowerCase().includes(q) ||
        s.senderEmail.toLowerCase().includes(q) ||
        s.senderDomain.toLowerCase().includes(q)
    );
  }, [sendersList, senderSearch]);

  const visibleSenders = showAllSenders ? filteredSenders : filteredSenders.slice(0, 8);

  const activeCategoryDef = EMAIL_CATEGORIES.find((c) => c.id === selectedCategory) || EMAIL_CATEGORIES[0];
  const activeSender = selectedSenderEmail ? sendersList.find((s) => s.senderEmail === selectedSenderEmail) : null;

  // Assign a consistent depot stream color per sender for initials avatars
  const getAvatarGradient = (str: string) => {
    const colors = [
      'bg-unload',
      'bg-keep',
      'bg-trash',
      'bg-warn',
      'bg-ink',
      'bg-unload',
      'bg-keep',
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  return (
    <div className="rounded-2xl border border-linen bg-sheet shadow-xl transition-all duration-300">
      {/* Top Banner Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-linen px-4 py-3 bg-sheet">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-unload text-paper shadow-sm">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-ink tracking-wide">
                Category & Sender Matrix
              </span>
              <span className="rounded-full bg-unload border border-unload px-2 py-0.2 text-[10px] font-bold text-paper">
                Live Filter
              </span>
            </div>
            <p className="text-[11px] text-ink-soft">
              Filter your inbox by intelligent categories and top high-volume senders
            </p>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2">
          {(selectedCategory !== 'all' || selectedSenderEmail) && (
            <button
              onClick={() => {
                onSelectCategory('all');
                onSelectSenderEmail(null);
              }}
              className="flex items-center gap-1 rounded-lg border border-linen bg-sheet px-2.5 py-1 text-xs font-medium text-ink hover:bg-linen/50 hover:text-ink transition"
              title="Reset all category and sender filters"
            >
              <X className="h-3.5 w-3.5 text-trash" />
              <span>Clear Filter</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 rounded-lg border border-linen bg-sheet px-2.5 py-1 text-xs font-medium text-ink hover:bg-linen/50 hover:text-ink transition"
          >
            <span>{isExpanded ? 'Collapse' : 'Expand Matrix'}</span>
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-ink-soft" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-ink-soft" />
            )}
          </button>
        </div>
      </div>

      {/* Active Filter Pill Bar + Bulk Action Bar */}
      {(selectedCategory !== 'all' || selectedSenderEmail || (selectedEmailIds && selectedEmailIds.size > 0)) && (
        <div className="border-b border-unload bg-unload/10">
          {/* Filter pills row */}
          {(selectedCategory !== 'all' || selectedSenderEmail) && (
            <div className="flex flex-wrap items-center gap-2 px-4 pt-2.5 pb-1.5 text-xs">
              <span className="text-ink-soft font-medium">Filtering by:</span>

              {selectedCategory !== 'all' && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-unload border border-unload px-2.5 py-0.5 font-semibold text-paper">
                  <span>{activeCategoryDef.label}</span>
                  <span className="text-[10px] text-paper/80 font-mono">
                    ({categoryEmails.length})
                  </span>
                  <button
                    onClick={() => onSelectCategory('all')}
                    className="ml-0.5 transition hover:opacity-70"
                    title="Remove category filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {selectedSenderEmail && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-unload border border-unload px-2.5 py-0.5 font-semibold text-paper">
                  <span className="truncate max-w-[200px]">
                    Sender: {activeSender?.senderName || selectedSenderEmail}
                  </span>
                  <span className="text-[10px] text-paper/80 font-mono">
                    ({activeSender?.count || 0})
                  </span>
                  <button
                    onClick={() => onSelectSenderEmail(null)}
                    className="ml-0.5 transition hover:opacity-70"
                    title="Remove sender filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Bulk Action Buttons Bar */}
          <div className="flex flex-wrap items-center gap-2 px-4 pb-2.5 pt-1">
            {/* Scope label */}
            <span className="text-[10px] text-ink-soft font-medium uppercase tracking-wider shrink-0">
              {selectedSenderEmail
                ? `${activeSender?.count ?? 0} emails from sender:`
                : selectedCategory !== 'all'
                ? `${categoryEmails.length} emails in category:`
                : `${selectedEmailIds?.size ?? 0} selected:`}
            </span>

            {/* Trash selected (only when something is actually selected) */}
            {selectedEmailIds && selectedEmailIds.size > 0 && onBatchTrashSelected && (
              <button
                onClick={onBatchTrashSelected}
                className="flex items-center gap-1.5 rounded-lg border border-trash/30 bg-trash/15 px-2.5 py-1 text-xs font-semibold text-trash hover:bg-trash/25 hover:border-trash/50 transition shadow-sm"
                title={`Move ${selectedEmailIds.size} selected emails to Trash`}
              >
                <Trash2 className="h-3.5 w-3.5 shrink-0" />
                <span>Trash {selectedEmailIds.size} selected</span>
              </button>
            )}

            {/* Combined Unsub & Trash ALL (shown when there are both emails to trash AND senders to unsubscribe) */}
            {onBatchTrash && onUnsubscribe && (() => {
              const targetIds = selectedSenderEmail && activeSender
                ? activeSender.emailIds
                : categoryEmails.map((e) => e.id);
              const targetEmails = sendersList
                .filter((s) => s.hasUnsubscribe)
                .map((s) => {
                  const senderEmails = emailsBySender.get(s.senderEmail.toLowerCase()) || [];
                  return senderEmails.find((e) => e.hasUnsubscribe && e.unsubscribeOptions);
                })
                .filter(Boolean) as EmailMetadata[];

              if (targetIds.length === 0 || targetEmails.length === 0) return null;
              if (selectedCategory === 'all' && !selectedSenderEmail) return null;

              return (
                <button
                  onClick={async () => {
                    setBulkCombinedLoading(true);
                    try {
                      for (let i = 0; i < targetEmails.length; i++) {
                        await onUnsubscribe(targetEmails[i]);
                      }
                      await onBatchTrash(targetIds);
                    } finally {
                      setBulkCombinedLoading(false);
                    }
                  }}
                  disabled={bulkCombinedLoading || bulkTrashLoading}
                  className="flex items-center gap-1.5 rounded-lg border border-unload bg-unload px-2.5 py-1 text-xs font-bold text-paper transition shadow-sm disabled:opacity-50"
                  title={`Unsubscribe from ${targetEmails.length} sender(s) AND move all ${targetIds.length} emails to Trash`}
                >
                  {bulkCombinedLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-paper" />
                  ) : (
                    <span className="flex items-center gap-0.5">
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-paper" />
                      <Trash2 className="h-3.5 w-3.5 shrink-0 text-paper" />
                    </span>
                  )}
                  <span>
                    {bulkCombinedLoading ? 'Unsubbing & Trashing…' : `Unsub & Trash all ${targetIds.length}`}
                  </span>
                </button>
              );
            })()}

            {/* Trash ALL in current filter view without unsubscribing */}
            {onBatchTrash && (() => {
              // Determine which email IDs to trash: sender filter > category filter
              const targetIds = selectedSenderEmail && activeSender
                ? activeSender.emailIds
                : categoryEmails.map((e) => e.id);
              if (targetIds.length === 0) return null;
              return (
                <button
                  onClick={async () => {
                    setBulkTrashLoading(true);
                    try { await onBatchTrash(targetIds); } finally { setBulkTrashLoading(false); }
                  }}
                  disabled={bulkTrashLoading || bulkCombinedLoading}
                  className="flex items-center gap-1.5 rounded-lg border border-trash/40 bg-trash/20 px-2.5 py-1 text-xs font-semibold text-trash hover:bg-trash/30 hover:border-trash/60 transition shadow-sm disabled:opacity-50"
                  title={`Immediately move all ${targetIds.length} emails to Trash without unsubscribing`}
                >
                  {bulkTrashLoading
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                    : <Trash2 className="h-3.5 w-3.5 shrink-0" />}
                  <span>
                    {bulkTrashLoading ? 'Trashing…' : `Trash all ${targetIds.length}`}
                  </span>
                </button>
              );
            })()}

            {/* Unsubscribe ALL — fires sequentially for all senders with unsub options */}
            {onUnsubscribe && (() => {
              // Collect one unsub email per sender from current view
              const targetEmails = sendersList
                .filter((s) => s.hasUnsubscribe)
                .map((s) => {
                  const senderEmails = emailsBySender.get(s.senderEmail.toLowerCase()) || [];
                  return senderEmails.find((e) => e.hasUnsubscribe && e.unsubscribeOptions);
                })
                .filter(Boolean) as EmailMetadata[];

              // Only show when scoped to category or sender
              if (targetEmails.length === 0 || selectedCategory === 'all' && !selectedSenderEmail) return null;

              return (
                <button
                  onClick={async () => {
                    setBulkUnsubLoading(true);
                    setBulkUnsubProgress({ done: 0, total: targetEmails.length });
                    try {
                      for (let i = 0; i < targetEmails.length; i++) {
                        await onUnsubscribe(targetEmails[i]);
                        setBulkUnsubProgress({ done: i + 1, total: targetEmails.length });
                      }
                    } finally {
                      setBulkUnsubLoading(false);
                      setTimeout(() => setBulkUnsubProgress(null), 2500);
                    }
                  }}
                  disabled={bulkUnsubLoading}
                  className="flex items-center gap-1.5 rounded-lg border border-keep/30 bg-keep/15 px-2.5 py-1 text-xs font-semibold text-keep hover:bg-keep/25 hover:border-keep/50 transition shadow-sm disabled:opacity-50"
                  title={`Send unsubscribe to all ${targetEmails.length} senders in this view`}
                >
                  {bulkUnsubLoading
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                    : <ShieldCheck className="h-3.5 w-3.5 shrink-0" />}
                  <span>
                    {bulkUnsubLoading && bulkUnsubProgress
                      ? `Unsubbing ${bulkUnsubProgress.done}/${bulkUnsubProgress.total}…`
                      : `Unsub all ${targetEmails.length} senders`}
                  </span>
                </button>
              );
            })()}
          </div>
        </div>
      )}

      {/* Main Expandable Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Categories Grid / Cards Carousel */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                Select Category
              </span>
              <span className="text-[11px] text-ink-soft">
                {emails.length} total messages scanned
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {EMAIL_CATEGORIES.map((cat) => {
                const IconComponent = ICON_MAP[cat.iconName] || Tag;
                const stats = categoryStats[cat.id];
                const isSelected = selectedCategory === cat.id;
                const count = stats?.count || 0;
                const sizeFormatted = formatBytes(stats?.totalSizeBytes || 0);

                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      onSelectCategory(cat.id);
                      // Reset sender filter if category changed and sender doesn't exist here
                      onSelectSenderEmail(null);
                    }}
                    className={`group relative flex flex-col text-left p-2.5 rounded-xl border transition-all duration-200 ${
                      isSelected
                        ? 'bg-sheet border-unload shadow-sm ring-1 ring-unload/50'
                        : 'bg-sheet border-linen hover:bg-linen/50 hover:border-linen'
                    }`}
                  >
                    {/* Glowing active indicator dot */}
                    {isSelected && (
                      <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-unload animate-pulse shadow-sm shadow-unload" />
                    )}

                    <div className="flex items-center gap-2 mb-1.5">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-lg border transition ${
                          isSelected
                            ? 'bg-unload border-unload text-paper'
                            : 'bg-sheet border-linen text-ink-soft group-hover:text-ink'
                        }`}
                      >
                        <IconComponent className="h-3.5 w-3.5" />
                      </div>
                      <span
                        className={`text-xs font-bold truncate ${
                          isSelected ? 'text-ink' : 'text-ink group-hover:text-ink'
                        }`}
                      >
                        {cat.shortLabel}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between mt-auto">
                      <span
                        className={`text-sm font-black tracking-tight ${
                          isSelected ? 'text-unload' : 'text-ink'
                        }`}
                      >
                        {count.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-ink-soft font-mono truncate">
                        {sizeFormatted}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Senders Drill-Down Panel */}
          <div className="rounded-xl border border-linen bg-sheet p-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-ink">
                  Top Senders in{' '}
                  <span className="text-unload">
                    {selectedCategory === 'all' ? 'All Categories' : activeCategoryDef.label}
                  </span>
                </span>
                <span className="rounded-full bg-sheet px-2 py-0.5 text-[10px] font-semibold text-ink-soft">
                  {sendersList.length} senders
                </span>
              </div>

              {/* Senders Search Bar */}
              <div className="relative min-w-[200px] sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-soft" />
                <input
                  type="text"
                  value={senderSearch}
                  onChange={(e) => setSenderSearch(e.target.value)}
                  placeholder="Filter senders..."
                  className="w-full rounded-lg border border-linen bg-sheet pl-8 pr-3 py-1 text-xs text-ink placeholder-ink-mute focus:border-unload focus:outline-none focus:ring-1 focus:ring-unload transition"
                />
                {senderSearch && (
                  <button
                    onClick={() => setSenderSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Senders Cards / Pills List */}
            {sendersList.length === 0 ? (
              <div className="py-6 text-center text-xs text-ink-soft">
                No emails found in this category.
              </div>
            ) : filteredSenders.length === 0 ? (
              <div className="py-6 text-center text-xs text-ink-soft">
                No senders match &ldquo;{senderSearch}&rdquo;.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {visibleSenders.map((sender) => {
                    const isSelected = selectedSenderEmail === sender.senderEmail;
                    const isBlocked = blockedDomainSet.has(sender.senderDomain.toLowerCase());
                    const gradient = getAvatarGradient(sender.senderDomain || sender.senderEmail);

                    return (
                      <div
                        key={sender.senderEmail}
                        className={`group relative flex flex-col justify-between p-2.5 rounded-xl border transition-all duration-150 ${
                          isSelected
                            ? 'bg-unload/10 border-unload shadow-sm ring-1 ring-unload/40'
                            : 'bg-sheet border-linen hover:bg-linen/50 hover:border-linen'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            onClick={() => {
                              onSelectSenderEmail(isSelected ? null : sender.senderEmail);
                            }}
                            className="flex items-start gap-2 text-left flex-1 min-w-0"
                            title={`Click to filter by ${sender.senderName}`}
                          >
                            {/* Avatar */}
                            <div
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${gradient} text-[11px] font-bold text-paper shadow-sm`}
                            >
                              {(sender.senderName || sender.senderEmail)
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            {/* Name & Domain */}
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-ink group-hover:text-ink truncate">
                                {sender.senderName}
                              </p>
                              <p className="text-[10px] text-ink-soft font-mono truncate">
                                @{sender.senderDomain}
                              </p>
                            </div>
                          </button>

                          {/* Compact filter indicator */}
                          {isSelected && (
                            <span className="shrink-0 h-2 w-2 rounded-full bg-unload animate-pulse" />
                          )}
                        </div>

                        {/* Bottom action row — stats + labeled action buttons */}
                        <div className="mt-2 pt-2 border-t border-linen space-y-1.5">
                          {/* Stats line */}
                          <button
                            onClick={() => onSelectSenderEmail(isSelected ? null : sender.senderEmail)}
                            className="flex items-center gap-1 text-[10px] text-ink-soft hover:text-unload transition w-full"
                          >
                            <span className="font-bold text-ink">{sender.count}</span>
                            <span>{sender.count === 1 ? 'email' : 'emails'}</span>
                            <span className="text-ink-soft">·</span>
                            <span className="font-mono">{formatBytes(sender.totalSizeBytes)}</span>
                          </button>

                          {/* Labeled action buttons row */}
                          <div className="flex flex-wrap gap-1">
                            {/* Select All */}
                            {onSelectAllFromSender && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onSelectAllFromSender(sender.emailIds); }}
                                className="flex items-center gap-1 rounded-md border border-unload bg-unload px-2 py-0.5 text-[10px] font-semibold text-paper hover:bg-unload hover:border-unload transition"
                                title={`Select all ${sender.count} emails from ${sender.senderName} for bulk trash`}
                              >
                                <CheckSquare className="h-3 w-3 shrink-0" />
                                <span>Select all</span>
                              </button>
                            )}

                            {/* Combined Trash + Unsubscribe (shown when BOTH are available — the recommended one-click cleanup) */}
                            {onBatchTrash && sender.hasUnsubscribe && onUnsubscribe && (() => {
                              const senderEmails = emailsBySender.get(sender.senderEmail.toLowerCase()) || [];
                              const unsubEmail = senderEmails.find((e) => e.hasUnsubscribe && e.unsubscribeOptions);
                              if (!unsubEmail) return null;
                              const key = '__trashAndUnsub__' + sender.senderEmail;
                              const isLoading = blockLoading === key;
                              return (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    setBlockLoading(key);
                                    try {
                                      // 1. Unsubscribe first
                                      await onUnsubscribe(unsubEmail);
                                      // 2. Then trash all emails from this sender
                                      await onBatchTrash(sender.emailIds);
                                    } finally {
                                      setBlockLoading(null);
                                    }
                                  }}
                                  disabled={isLoading}
                                  className="flex items-center gap-1 rounded-md border border-unload bg-unload px-2 py-0.5 text-[10px] font-bold text-paper transition disabled:opacity-40"
                                  title={`Unsubscribe from ${sender.senderDomain} AND move all ${sender.count} emails to Trash`}
                                >
                                  {isLoading
                                    ? <span className="h-3 w-3 border border-paper border-t-transparent rounded-full animate-spin shrink-0" />
                                    : <span className="flex items-center gap-0.5"><ShieldCheck className="h-3 w-3 shrink-0 text-paper" /><Trash2 className="h-3 w-3 shrink-0 text-paper" /></span>}
                                  <span>{isLoading ? 'Working…' : `Unsub & Trash all ${sender.count}`}</span>
                                </button>
                              );
                            })()}

                            {/* Trash all without unsubscribing — always available */}
                            {onBatchTrash && (() => {
                              const key = '__trash__' + sender.senderEmail;
                              const isLoading = blockLoading === key;
                              return (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    setBlockLoading(key);
                                    try { await onBatchTrash(sender.emailIds); } finally { setBlockLoading(null); }
                                  }}
                                  disabled={isLoading}
                                  className="flex items-center gap-1 rounded-md border border-trash/30 bg-trash/15 px-2 py-0.5 text-[10px] font-semibold text-trash hover:bg-trash/25 hover:border-trash/50 transition disabled:opacity-40"
                                  title={
                                    sender.hasUnsubscribe
                                      ? `Move all ${sender.count} emails from ${sender.senderName} to Trash without unsubscribing`
                                      : `Move all ${sender.count} emails from ${sender.senderName} to Trash`
                                  }
                                >
                                  {isLoading
                                    ? <span className="h-3 w-3 border border-trash border-t-transparent rounded-full animate-spin shrink-0" />
                                    : <Trash2 className="h-3 w-3 shrink-0" />}
                                  <span>{isLoading ? 'Trashing…' : `Trash all ${sender.count}`}</span>
                                </button>
                              );
                            })()}

                            {/* Unsubscribe only (without trashing emails) */}
                            {sender.hasUnsubscribe && onUnsubscribe && (() => {
                              const senderEmails = emailsBySender.get(sender.senderEmail.toLowerCase()) || [];
                              const unsubEmail = senderEmails.find((e) => e.hasUnsubscribe && e.unsubscribeOptions);
                              if (!unsubEmail) return null;
                              const isLoading = unsubLoading === sender.senderEmail;
                              return (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    setUnsubLoading(sender.senderEmail);
                                    try { await onUnsubscribe(unsubEmail); } finally { setUnsubLoading(null); }
                                  }}
                                  disabled={isLoading}
                                  className="flex items-center gap-1 rounded-md border border-keep/25 bg-keep/10 px-2 py-0.5 text-[10px] font-semibold text-keep hover:bg-keep/20 hover:border-keep/40 transition disabled:opacity-40"
                                  title={`Send unsubscribe request to ${sender.senderDomain} (keep emails in inbox)`}
                                >
                                  {isLoading
                                    ? <span className="h-3 w-3 border border-keep border-t-transparent rounded-full animate-spin shrink-0" />
                                    : <ShieldCheck className="h-3 w-3 shrink-0" />}
                                  <span>{isLoading ? 'Unsubbing…' : 'Unsubscribe'}</span>
                                </button>
                              );
                            })()}

                            {/* Block domain */}
                            {onBlockSender && !isBlocked && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setBlockLoading(sender.senderEmail);
                                  try { await onBlockSender(sender.senderDomain, sender.senderEmail); } finally { setBlockLoading(null); }
                                }}
                                disabled={blockLoading === sender.senderEmail}
                                className="flex items-center gap-1 rounded-md border border-warn bg-warn px-2 py-0.5 text-[10px] font-semibold text-paper hover:bg-warn hover:border-warn transition disabled:opacity-40"
                                title={`Block all future emails from @${sender.senderDomain}`}
                              >
                                {blockLoading === sender.senderEmail
                                  ? <span className="h-3 w-3 border border-warn border-t-transparent rounded-full animate-spin shrink-0" />
                                  : <Ban className="h-3 w-3 shrink-0" />}
                                <span>{blockLoading === sender.senderEmail ? 'Blocking…' : 'Block domain'}</span>
                              </button>
                            )}

                            {/* Blocked status indicator */}
                            {isBlocked && (
                              <span className="flex items-center gap-1 rounded-md border border-trash/25 bg-trash/10 px-2 py-0.5 text-[10px] font-semibold text-trash">
                                <Ban className="h-3 w-3 shrink-0" />
                                <span>Domain blocked</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Show more senders toggle */}
                {filteredSenders.length > 8 && (
                  <div className="text-center pt-1">
                    <button
                      onClick={() => setShowAllSenders(!showAllSenders)}
                      className="inline-flex items-center gap-1 rounded-lg border border-linen bg-sheet px-3 py-1 text-xs font-semibold text-unload hover:bg-linen/50 hover:text-unload transition"
                    >
                      <span>
                        {showAllSenders
                          ? 'Show fewer senders'
                          : `View all ${filteredSenders.length} senders`}
                      </span>
                      {showAllSenders ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
