'use client';

import React, { useEffect, useRef } from 'react';
import { CheckCircle2, Loader2, X, MailOpen, Inbox } from 'lucide-react';

export type FetchPhase = 'listing' | 'metadata' | 'done' | 'error' | 'demo' | 'idle';

export interface FetchProgressState {
  phase: FetchPhase;
  fetched: number;
  target: number;
  message: string;
}

interface FetchProgressProps {
  progress: FetchProgressState | null;
  onDismiss?: () => void;
}

// Parcels entering the weighbridge — drawn mail glyphs, not emoji
function ParcelParade({ count }: { count: number }) {
  const visibleCount = Math.min(Math.ceil(count / 20), 8);
  return (
    <div className="flex items-center gap-1 h-5 overflow-hidden" aria-hidden>
      {Array.from({ length: Math.max(1, visibleCount) }).map((_, i) => (
        <MailOpen
          key={i}
          className="h-3.5 w-3.5 text-unload animate-parcel-float"
          style={{
            animationDelay: `${i * 120}ms`,
            animationDuration: '1s',
            opacity: 1 - i * 0.08,
          }}
        />
      ))}
    </div>
  );
}

// Segmented weigh-in bar
function SegmentedBar({ value, max, tone }: { value: number; max: number; tone: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const segments = 20;
  const filledSegments = Math.round((pct / 100) * segments);

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: segments }).map((_, i) => {
        const filled = i < filledSegments;
        return (
          <div
            key={i}
            className={`h-1.5 flex-1 transition-all ${filled ? tone : 'bg-paper-2'}`}
            style={{ transitionDelay: `${i * 15}ms` }}
          />
        );
      })}
    </div>
  );
}

export function FetchProgress({ progress, onDismiss }: FetchProgressProps) {
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (progress?.fetched) prevCountRef.current = progress.fetched;
  }, [progress?.fetched]);

  if (!progress || progress.phase === 'idle') return null;

  const pct = progress.target > 0 ? Math.min((progress.fetched / progress.target) * 100, 100) : 0;
  const isDone = progress.phase === 'done' || progress.phase === 'demo' || progress.phase === 'error';
  const isActive = progress.phase === 'listing' || progress.phase === 'metadata';

  const tone =
    progress.phase === 'done' ? 'bg-keep' : progress.phase === 'error' ? 'bg-trash' : progress.phase === 'demo' ? 'bg-signal' : 'bg-unload';
  const toneText =
    progress.phase === 'done' ? 'text-keep' : progress.phase === 'error' ? 'text-trash' : progress.phase === 'demo' ? 'text-warn' : 'text-unload';

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
      role="status"
      aria-live="polite"
    >
      <div className="ticket shadow-lg overflow-hidden">
        <div className="px-4 py-3.5 space-y-3">
          {/* Header row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className={`flex items-center justify-center h-7 w-7 border ${toneText}`} style={{ borderColor: 'currentColor' }}>
                {isActive ? (
                  <Loader2 className={`h-3.5 w-3.5 animate-spin ${toneText}`} />
                ) : progress.phase === 'done' ? (
                  <CheckCircle2 className={`h-3.5 w-3.5 ${toneText}`} />
                ) : progress.phase === 'error' ? (
                  <X className={`h-3.5 w-3.5 ${toneText}`} />
                ) : (
                  <Inbox className={`h-3.5 w-3.5 ${toneText}`} />
                )}
              </div>

              <div>
                <p className={`text-xs font-bold tracking-wide ${toneText}`}>
                  {isActive
                    ? progress.phase === 'listing'
                      ? 'Contacting Gmail — listing IDs'
                      : 'Weighing in your mail'
                    : progress.phase === 'done'
                    ? 'Weigh-in complete'
                    : progress.phase === 'demo'
                    ? 'Demo depot loaded'
                    : 'Weigh-in failed'}
                </p>
                <p className="text-[11px] text-ink-soft mt-0.5 truncate max-w-[260px]">
                  {progress.message}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Live counter */}
              {progress.target > 0 && (
                <div className="tnum flex items-center gap-1 border border-linen px-2 py-1">
                  <span className="text-[11px] font-bold text-ink">
                    {progress.fetched.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-ink-mute">/</span>
                  <span className="text-[11px] text-ink-soft">
                    {progress.target.toLocaleString()}
                  </span>
                </div>
              )}

              {isDone && onDismiss && (
                <button
                  onClick={onDismiss}
                  className="p-1 text-ink-mute hover:text-ink transition"
                  aria-label="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Weigh-in bar */}
          {!isDone && progress.target > 0 && (
            <div className="space-y-2">
              <SegmentedBar value={progress.fetched} max={progress.target} tone={tone} />
              <div className="flex items-center justify-between">
                <ParcelParade count={progress.fetched} />
                <div className="tnum text-[10px] text-ink-mute">{Math.round(pct)}% complete</div>
              </div>
            </div>
          )}

          {/* Done: filled bar */}
          {isDone && progress.phase === 'done' && (
            <div>
              <div className="h-1.5 w-full bg-keep" />
              <p className="tnum text-[10px] text-keep mt-1.5 text-center">
                All done — {progress.fetched.toLocaleString()} emails ready to sort
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
