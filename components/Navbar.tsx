'use client';

import React, { useState } from 'react';
import {
  RefreshCw,
  LogOut,
  Sparkles,
  HelpCircle,
  ChevronDown,
  ArrowRightLeft,
  Box,
  Footprints,
  Ban,
  Settings2,
} from 'lucide-react';
import { AuthSession } from '@/lib/types';

export type ActiveTabType = 'cleaner' | 'unsubscriber' | 'osint' | 'blocklist' | 'setup';

interface NavbarProps {
  session: AuthSession;
  activeTab: ActiveTabType;
  setActiveTab: (tab: ActiveTabType) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenGuide: () => void;
  onToggleDemo: () => void;
  fetchLimit: number;
  onFetchLimitChange: (limit: number) => void;
  emailCount: number;
  onOpenWizard?: () => void;
  onOpenAutoRules?: () => void;
  autoRulesCount?: number;
}

const FETCH_LIMIT_OPTIONS = [100, 250, 500, 1000];

export function Navbar({
  session,
  activeTab,
  setActiveTab,
  onRefresh,
  isRefreshing,
  onOpenGuide,
  onToggleDemo,
  fetchLimit,
  onFetchLimitChange,
  emailCount,
  onOpenWizard,
}: NavbarProps) {
  const [limitOpen, setLimitOpen] = useState(false);

  const tabs = [
    { id: 'setup' as const, label: 'Setup', icon: Settings2, comingSoon: false },
    { id: 'cleaner' as const, label: 'Cleaner', icon: Box, comingSoon: false },
    { id: 'unsubscriber' as const, label: 'Unsubscribe', icon: ArrowRightLeft, comingSoon: false },
    { id: 'osint' as const, label: 'Footprint', icon: Footprints, comingSoon: false },
    { id: 'blocklist' as const, label: 'Blocklist', icon: Ban, comingSoon: false },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-black/40 depot-rail shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="flex min-h-14 items-center justify-between gap-2 py-2 md:h-14 md:py-0 md:gap-3">

          {/* Left: Brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-signal text-ink">
              <Box className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <span className="hidden sm:block text-[15px] font-extrabold tracking-tight text-paper whitespace-nowrap">
              MailYard
            </span>
          </div>

          {/* Center: Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const disabled = tab.comingSoon;
              return (
                <button
                  key={tab.id}
                  onClick={() => !disabled && setActiveTab(tab.id)}
                  disabled={disabled}
                  title={disabled ? 'Coming Soon' : tab.label}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                    disabled
                      ? 'cursor-not-allowed text-ink-mute opacity-60'
                      : isActive
                      ? 'bg-paper text-ink'
                      : 'text-paper/70 hover:text-paper hover:bg-white/10'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

            {/* Scan gauge */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setLimitOpen((v) => !v)}
                className="tnum flex items-center gap-1.5 rounded-md border border-white/15 px-2.5 py-1.5 font-mono text-[11px] font-bold text-paper hover:bg-white/10 transition"
                title={`Scanning the ${fetchLimit.toLocaleString()} most recent emails`}
              >
                <span className="text-paper/50 font-medium">{emailCount.toLocaleString()}</span>
                <span className="text-paper/30">/ {fetchLimit.toLocaleString()}</span>
                <ChevronDown className="h-3 w-3 text-paper/50" />
              </button>
              {limitOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-36 sheet shadow-lg overflow-hidden z-50">
                  <p className="px-3 py-2 text-[10px] font-bold text-ink-soft uppercase tracking-[0.18em] border-b border-linen-2">
                    Emails to scan
                  </p>
                  {FETCH_LIMIT_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => { onFetchLimitChange(opt); setLimitOpen(false); }}
                      className={`tnum flex w-full items-center justify-between px-3 py-2 text-xs transition ${
                        fetchLimit === opt
                          ? 'bg-paper-2 text-ink font-semibold'
                          : 'text-ink-soft hover:bg-paper-2'
                      }`}
                    >
                      <span>{opt.toLocaleString()} emails</span>
                      {fetchLimit === opt && <span className="h-2 w-2 bg-keep" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Clean Wizard Button */}
            {onOpenWizard && (
              <button
                onClick={onOpenWizard}
                className="hidden sm:flex items-center gap-1.5 rounded-md border border-paper/20 bg-transparent px-3 py-1.5 text-xs font-bold whitespace-nowrap text-paper hover:bg-paper hover:text-ink transition"
                title="Launch step-by-step cleaning wizard"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Clean Wizard
              </button>
            )}

            {/* Freight tools: weigh in + guide */}
            <div className="flex items-center gap-1">
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                title="Weigh in — rescan the inbox"
                aria-label="Weigh in — rescan the inbox"
                className="flex items-center justify-center rounded-md border border-white/15 p-1.5 text-paper/80 hover:text-paper hover:bg-white/10 transition disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onOpenGuide}
                title="Setup guide"
                aria-label="Setup guide"
                className="flex items-center justify-center rounded-md border border-white/15 p-1.5 text-paper/80 hover:text-paper hover:bg-white/10 transition"
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="hidden sm:block h-5 border-l border-white/15" aria-hidden />

            {/* Account / Connect */}
            {session.isAuthenticated ? (
              <div className="flex items-center gap-1.5 rounded-md border border-keep/40 bg-keep/15 px-1.5 sm:pl-2 sm:pr-1.5 py-1 text-xs">
                {session.userPicture ? (
                  <img
                    src={session.userPicture}
                    alt="Profile"
                    className="h-5 w-5 rounded-full object-cover"
                  />
                ) : (
                  <span className="h-2 w-2 bg-keep-bright" />
                )}
                <span className="hidden lg:block max-w-[110px] truncate font-medium text-paper text-[11px]">
                  {session.userName || session.userEmail}
                </span>
                <a
                  href="/api/auth/logout"
                  title="Disconnect"
                  className="p-0.5 text-paper/50 hover:text-trash-bright transition ml-0.5"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </a>
              </div>
            ) : session.isDemoMode ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onToggleDemo}
                  className="flex items-center gap-1.5 rounded-md border border-white/25 bg-transparent hover:bg-white/10 px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-paper/90 transition"
                  title="Exit demo mode"
                >
                  <span className="hidden lg:inline">Demo depot</span>
                  <span className="lg:hidden">Demo</span>
                  <span className="hidden sm:inline text-paper/50">(exit)</span>
                </button>
                <a
                  href="/api/auth/google"
                  className="flex items-center gap-1.5 rounded-md bg-paper px-3 py-1.5 text-xs font-bold whitespace-nowrap text-ink hover:bg-paper-2 transition"
                >
                  <span className="hidden sm:inline">Connect Gmail</span>
                  <span className="sm:hidden">Connect</span>
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onToggleDemo}
                  className="flex items-center gap-1 rounded-md border border-white/25 bg-transparent px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-paper/90 hover:bg-white/10 transition"
                  title="Explore with sample demo data"
                >
                  <Sparkles className="h-3 w-3" />
                  <span className="hidden lg:inline">Demo depot</span>
                  <span className="lg:hidden">Demo</span>
                </button>
                <a
                  href="/api/auth/google"
                  className="flex items-center gap-1.5 rounded-md bg-paper px-3 py-1.5 text-xs font-bold whitespace-nowrap text-ink hover:bg-paper-2 transition"
                >
                  <span className="hidden sm:inline">Connect Gmail</span>
                  <span className="sm:hidden">Connect</span>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Tabs */}
        <div className="flex md:hidden -mx-1 overflow-x-auto px-1 py-2 gap-1 border-t border-white/10 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const disabled = tab.comingSoon;
            return (
              <button
                key={tab.id}
                onClick={() => !disabled && setActiveTab(tab.id)}
                disabled={disabled}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                  disabled
                    ? 'cursor-not-allowed text-ink-mute opacity-50'
                    : isActive
                    ? 'bg-paper text-ink'
                    : 'text-paper/70 hover:bg-white/10'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
