'use client';

import React from 'react';
import {
  Trash2,
  ArrowRightLeft,
  CheckCircle2,
  HardDrive,
  BellRing,
  History,
  Footprints,
} from 'lucide-react';
import { EmailMetadata, UserAccountRecord } from '@/lib/types';
import { formatBytes } from '@/lib/gmail/parser';

interface KpiMetricsProps {
  emails: EmailMetadata[];
  accounts: UserAccountRecord[];
  onSelectFilter: (filter: string) => void;
  activeFilter: string;
}

/** Intake bins: the three streams a cleanup weighs into, plus granular stream chips. */
export function KpiMetrics({
  emails,
  accounts,
  onSelectFilter,
  activeFilter,
}: KpiMetricsProps) {
  const totalCount = emails.length;
  const totalSizeBytes = emails.reduce((acc, e) => acc + (e.sizeBytes || 0), 0);
  const totalSizeFormatted = formatBytes(totalSizeBytes);

  const heavyEmails = emails.filter((e) => e.isHeavy5MB);
  const heavySizeFormatted = formatBytes(heavyEmails.reduce((acc, e) => acc + (e.sizeBytes || 0), 0));
  const massNotifications = emails.filter((e) => e.isMassNotification);
  const ancientEmails = emails.filter((e) => e.isAncient1Year);
  const unsubscribable = emails.filter((e) => e.hasUnsubscribe);
  const breachedCount = accounts.filter((a) => a.breach_count > 0).length;

  // The trash stream: union of mass notifications, heavy files and ancient mail
  const trashableIds = new Set<string>();
  for (const e of [...massNotifications, ...heavyEmails, ...ancientEmails]) trashableIds.add(e.id);
  const unsubIds = new Set(unsubscribable.map((e) => e.id));
  const claimedIds = new Set<string>([...trashableIds, ...unsubIds]);
  const keepCount = emails.filter((e) => !claimedIds.has(e.id)).length;
  const trashableSizeFormatted = formatBytes(
    emails.filter((e) => trashableIds.has(e.id)).reduce((acc, e) => acc + (e.sizeBytes || 0), 0)
  );

  const bins = [
    {
      id: 'trash',
      streamColor: 'var(--color-trash)',
      glyphBg: 'bg-trash',
      icon: Trash2,
      n: trashableIds.size.toLocaleString(),
      label: 'Trash candidates',
      note: `${trashableSizeFormatted} recoverable`,
      filter: 'mass_notifications',
    },
    {
      id: 'unsub',
      streamColor: 'var(--color-unload)',
      glyphBg: 'bg-unload',
      icon: ArrowRightLeft,
      n: unsubscribable.length.toLocaleString(),
      label: 'Unsubscribe queue',
      note: 'lists with one-click headers',
      filter: 'unsubscribable',
    },
    {
      id: 'keep',
      streamColor: 'var(--color-keep)',
      glyphBg: 'bg-keep',
      icon: CheckCircle2,
      n: keepCount.toLocaleString(),
      label: 'Keeping',
      note: `${totalSizeFormatted} total weighed in`,
      filter: 'all',
    },
  ];

  const chips = [
    { id: 'heavy_5mb', label: 'Heavy files', icon: HardDrive, count: heavyEmails.length, meta: heavySizeFormatted },
    { id: 'mass_notifications', label: 'Mass notifications', icon: BellRing, count: massNotifications.length },
    { id: 'ancient_1yr', label: 'Ancient mail', icon: History, count: ancientEmails.length },
    { id: 'osint_breached', label: 'Breached accounts', icon: Footprints, count: breachedCount, meta: 'in footprint' },
  ];

  return (
    <section aria-label="Intake overview" className="space-y-2.5">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {bins.map((bin) => {
          const Icon = bin.icon;
          const isSelected =
            (bin.id === 'trash' && activeFilter === 'mass_notifications') ||
            (bin.id === 'unsub' && activeFilter === 'unsubscribable');
          return (
            <button
              key={bin.id}
              onClick={() => onSelectFilter(bin.filter)}
              className={`sheet group relative overflow-hidden text-left transition-colors ${
                isSelected ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper' : 'hover:border-ink-mute'
              }`}
            >
              <div className="stream-band" style={{ ['--stream-color' as string]: bin.streamColor }} />
              <div className="flex items-center gap-3.5 p-4">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center text-paper ${bin.glyphBg}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="tnum text-3xl font-extrabold tracking-tighter leading-none">
                    {bin.n}
                  </div>
                  <div className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
                    {bin.label}
                  </div>
                  <div className="tnum truncate text-[11px] text-ink-mute">{bin.note}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Granular stream chips */}
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip) => {
          const Icon = chip.icon;
          const isActive =
            activeFilter === chip.id ||
            (chip.id === 'heavy_5mb' && activeFilter === 'heavy') ||
            (chip.id === 'ancient_1yr' && activeFilter === 'ancient');
          return (
            <button
              key={chip.id}
              onClick={() => onSelectFilter(chip.id)}
              className={`tnum flex items-center gap-1.5 border px-2.5 py-1 text-[11px] font-semibold transition ${
                isActive
                  ? 'border-ink bg-ink text-paper'
                  : 'border-linen bg-sheet text-ink-soft hover:border-ink-mute hover:text-ink'
              }`}
            >
              <Icon className="h-3 w-3" />
              <span>{chip.label}</span>
              <span className={isActive ? 'text-signal' : 'text-ink-mute'}>{chip.count.toLocaleString()}</span>
              {chip.meta && <span className="font-normal text-ink-mute">· {chip.meta}</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
