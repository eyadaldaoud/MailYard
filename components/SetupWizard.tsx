'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Terminal,
  Shield,
  Database,
  KeyRound,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  
  FolderGit2,
  Rocket,
  
  
  Mail,
  Zap,
} from 'lucide-react';

const GithubIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

interface SetupWizardProps {
  oauthConfigured: boolean;
  dbConfigured: boolean;
  hibpConfigured: boolean;
  onEnableDemo: () => void;
}

export function SetupWizard({
  oauthConfigured,
  dbConfigured,
  hibpConfigured,
  onEnableDemo,
}: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Custom env generator values
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [redirectUri, setRedirectUri] = useState(
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/auth/callback/google`
      : 'http://localhost:3000/api/auth/callback/google'
  );
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [supabaseServiceKey, setSupabaseServiceKey] = useState('');

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => {
      setCopiedSection((prev) => (prev === sectionId ? null : prev));
    }, 2200);
  };

  const sqlSchema = `-- =========================================================
-- MailYard Supabase Schema (Run in Supabase SQL Editor)
-- =========================================================

-- 1. Blocked Senders Table
CREATE TABLE IF NOT EXISTS public.blocked_senders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    domain TEXT NOT NULL,
    sender_email TEXT,
    reason TEXT DEFAULT 'Unsubscribed / Blocked via MailYard',
    auto_trash BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_blocked_senders_user_domain 
    ON public.blocked_senders (user_email, domain);

-- 2. Discovered Accounts & Footprint Table
CREATE TABLE IF NOT EXISTS public.user_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    domain TEXT NOT NULL,
    username TEXT,
    source TEXT NOT NULL DEFAULT 'chrome_csv',
    delete_url TEXT,
    delete_difficulty TEXT DEFAULT 'unknown',
    breach_count INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_accounts_user_domain_user 
    ON public.user_accounts (user_email, domain, COALESCE(username, ''));

-- 3. OAuth Tokens Table
CREATE TABLE IF NOT EXISTS public.oauth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT UNIQUE NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expiry_date BIGINT,
    scope TEXT,
    token_type TEXT DEFAULT 'Bearer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.blocked_senders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Allow policies
CREATE POLICY "Allow select on blocked_senders for all" ON public.blocked_senders FOR SELECT USING (true);
CREATE POLICY "Allow insert on blocked_senders for all" ON public.blocked_senders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on blocked_senders for all" ON public.blocked_senders FOR UPDATE USING (true);
CREATE POLICY "Allow delete on blocked_senders for all" ON public.blocked_senders FOR DELETE USING (true);

CREATE POLICY "Allow select on user_accounts for all" ON public.user_accounts FOR SELECT USING (true);
CREATE POLICY "Allow insert on user_accounts for all" ON public.user_accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on user_accounts for all" ON public.user_accounts FOR UPDATE USING (true);
CREATE POLICY "Allow delete on user_accounts for all" ON public.user_accounts FOR DELETE USING (true);

CREATE POLICY "Allow access on oauth_tokens for all" ON public.oauth_tokens FOR ALL USING (true);`;

  const generatedEnv = `# ==============================================================================
# EMAIL CLEANING & OSINT DASHBOARD - ENVIRONMENT CONFIGURATION (.env.local)
# ==============================================================================

# 1. GOOGLE OAUTH 2.0 (GMAIL API)
GOOGLE_CLIENT_ID="${clientId || 'your-google-client-id.apps.googleusercontent.com'}"
GOOGLE_CLIENT_SECRET="${clientSecret || 'your-google-client-secret'}"
GOOGLE_REDIRECT_URI="${redirectUri || 'http://localhost:3000/api/auth/callback/google'}"

# 2. SUPABASE DATABASE CONFIGURATION (Optional - falls back to local memory if empty)
NEXT_PUBLIC_SUPABASE_URL="${supabaseUrl || 'https://your-project.supabase.co'}"
NEXT_PUBLIC_SUPABASE_ANON_KEY="${supabaseAnonKey || 'your-anon-key'}"
SUPABASE_SERVICE_ROLE_KEY="${supabaseServiceKey || 'your-service-role-key'}"

# 3. HAVE I BEEN PWNED (HIBP) API KEY (Optional - offline catalog used if blank)
HIBP_API_KEY=""

# 4. APPLICATION SECURITY (Random secret for cookie encryption)
SESSION_SECRET="mc_sec_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}"
`;

  const steps = [
    {
      id: 1,
      title: 'Clone & Install',
      short: '01. Repository',
      icon: FolderGit2,
      description: 'Clone the source and install local dependencies',
    },
    {
      id: 2,
      title: 'Google OAuth & Gmail API',
      short: '02. Google Cloud',
      icon: KeyRound,
      description: 'Create OAuth Client ID & authorize redirect URI',
    },
    {
      id: 3,
      title: 'Supabase Database',
      short: '03. Database',
      icon: Database,
      description: 'Create PostgreSQL tables & RLS policies',
    },
    {
      id: 4,
      title: 'Config & Launch',
      short: '04. Environment',
      icon: Rocket,
      description: 'Generate .env.local and run locally or deploy',
    },
  ];

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-paper text-ink px-3 py-5 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-5 sm:space-y-8">
        
        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-linen bg-sheet p-5 sm:rounded-2xl sm:p-10 shadow-lg shadow-ink/10">
          <span className="stream-band absolute inset-x-0 top-0 h-1.5" style={{ ['--stream-color' as string]: 'var(--color-signal)' }} aria-hidden />

          <div className="relative z-10 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-paper shadow-lg">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-ink">
                      MailYard Setup Wizard
                    </h1>
                  </div>
                  <p className="text-xs sm:text-sm text-ink-soft">
                    Open-source Gmail cleaner, one-click unsubscriber, and digital footprint audit tool.
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                <a
                  href="https://github.com/eyadaldaoud/MailYard"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-xl border border-linen bg-sheet hover:bg-linen/50 px-3.5 py-2 text-xs font-semibold text-ink transition"
                >
                  <GithubIcon className="h-4 w-4" />
                  <span>GitHub Repo</span>
                  <ExternalLink className="h-3 w-3 text-ink-soft" />
                </a>

                <button
                  onClick={onEnableDemo}
                  className="flex items-center gap-1.5 rounded-xl border border-linen bg-sheet px-4 py-2 text-xs font-bold text-ink hover:border-ink transition"
                  title="Test drive without setting up credentials"
                >
                  <Sparkles className="h-3.5 w-3.5 text-warn animate-pulse" />
                  <span>Explore Demo Mode</span>
                </button>
              </div>
            </div>

            {/* Current Deployment Status Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div
                className={`rounded-2xl border p-3.5 transition ${
                  oauthConfigured
                    ? 'border-keep/30 bg-keep/10'
                    : 'border-linen bg-sheet'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <KeyRound className={`h-4 w-4 ${oauthConfigured ? 'text-keep' : 'text-warn'}`} />
                    <span className="text-xs font-bold text-ink">Google OAuth</span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      oauthConfigured
                        ? 'bg-keep/15 text-keep'
                        : 'border border-warn/40 bg-warn/10 text-warn'
                    }`}
                  >
                    {oauthConfigured ? 'Configured' : 'Setup Required'}
                  </span>
                </div>
                <p className="text-[11px] text-ink-soft">
                  {oauthConfigured
                    ? 'OAuth client keys detected! You can connect your Gmail now.'
                    : 'Add GOOGLE_CLIENT_ID & SECRET in .env.local for live Gmail sync.'}
                </p>
              </div>

              <div
                className={`rounded-2xl border p-3.5 transition ${
                  dbConfigured
                    ? 'border-keep/30 bg-keep/20'
                    : 'border-unload bg-unload/10'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Database className={`h-4 w-4 ${dbConfigured ? 'text-keep' : 'text-unload'}`} />
                    <span className="text-xs font-bold text-ink">Supabase DB</span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      dbConfigured
                        ? 'bg-keep/20 text-keep'
                        : 'bg-unload text-paper'
                    }`}
                  >
                    {dbConfigured ? 'Connected' : 'In-Memory Fallback'}
                  </span>
                </div>
                <p className="text-[11px] text-ink-soft">
                  {dbConfigured
                    ? 'PostgreSQL database connected for permanent rules and blocklists.'
                    : 'Runs in local memory without keys. Add Supabase keys to persist across sessions.'}
                </p>
              </div>

              <div
                className={`rounded-2xl border p-3.5 transition ${
                  hibpConfigured
                    ? 'border-keep/30 bg-keep/20'
                    : 'border-linen bg-sheet'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Shield className={`h-4 w-4 ${hibpConfigured ? 'text-keep' : 'text-unload'}`} />
                    <span className="text-xs font-bold text-ink">Security & OSINT</span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      hibpConfigured
                        ? 'bg-keep/20 text-keep'
                        : 'bg-sheet text-ink'
                    }`}
                  >
                    {hibpConfigured ? 'Live HIBP Key' : 'Built-in Catalog'}
                  </span>
                </div>
                <p className="text-[11px] text-ink-soft">
                  {hibpConfigured
                    ? 'Live HaveIBeenPwned API active.'
                    : 'Free offline curated catalog active (no paid key needed).'}
                </p>
              </div>
            </div>

            {/* Quick Banner if OAuth is already configured */}
            {oauthConfigured && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-keep/40 bg-keep/30 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-keep shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-ink">Google OAuth is Ready!</h4>
                    <p className="text-[11px] text-keep/80">
                      Your environment has detected valid Google OAuth credentials.
                    </p>
                  </div>
                </div>
                <a
                  href="/api/auth/google"
                  className="flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-xs font-bold text-paper shadow-sm hover:bg-trash transition"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Connect Gmail & Sign In</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Stepper Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {steps.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(step.id)}
                className={`relative flex flex-col items-start gap-1.5 rounded-2xl border p-3.5 text-left transition-all ${
                  isActive
                    ? 'border-unload bg-unload/10 shadow-sm'
                    : isCompleted
                    ? 'border-linen bg-sheet hover:border-linen'
                    : 'border-linen bg-sheet hover:border-linen'
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-xl text-xs font-bold ${
                      isActive
                        ? 'bg-ink text-paper shadow-sm'
                        : isCompleted
                        ? 'bg-keep/20 text-keep border border-keep/30'
                        : 'bg-sheet text-ink-soft'
                    }`}
                  >
                    {isCompleted ? <Check className="h-3.5 w-3.5" /> : step.id}
                  </div>
                  <Icon
                    className={`h-4 w-4 ${
                      isActive
                        ? 'text-unload'
                        : isCompleted
                        ? 'text-keep'
                        : 'text-ink-soft'
                    }`}
                  />
                </div>
                <div>
                  <h3
                    className={`text-xs font-bold ${
                      isActive ? 'text-ink' : 'text-ink'
                    }`}
                  >
                    {step.title}
                  </h3>
                  <p className="text-[10px] text-ink-soft line-clamp-1">
                    {step.description}
                  </p>
                </div>

                {/* Active indicator bar */}
                {isActive && (
                  <div className="absolute inset-x-3 bottom-0 h-[2px] bg-signal rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Step Content Container */}
        <div className="rounded-2xl border border-linen bg-sheet p-6 sm:p-8 shadow-xl">
          {/* STEP 1: CLONE & REPO */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-linen pb-4">
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-unload uppercase">
                    Step 1 of 4
                  </span>
                  <h2 className="text-lg font-bold text-ink">
                    Clone the Repository & Install Dependencies
                  </h2>
                  <p className="text-xs text-ink-soft">
                    MailYard runs locally on Node.js 18+ or can be deployed to Vercel/Fly/Docker.
                  </p>
                </div>
                <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-2xl bg-unload border border-unload text-paper">
                  <FolderGit2 className="h-5 w-5" />
                </div>
              </div>

              {/* Terminal Code Block */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                    <Terminal className="h-3.5 w-3.5 text-unload" />
                    <span>Run in your terminal:</span>
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `git clone https://github.com/eyadaldaoud/MailYard.git\ncd MailYard\nnpm install\ncp .env.example .env.local`,
                        'clone'
                      )
                    }
                    className="flex items-center gap-1.5 rounded-lg border border-linen bg-sheet px-2.5 py-1 text-xs text-ink hover:text-ink transition"
                  >
                    {copiedSection === 'clone' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-keep" />
                        <span className="text-keep">Copied Commands</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-ink-soft" />
                        <span>Copy Commands</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="relative rounded-2xl border border-ink bg-depot p-4 font-mono text-xs overflow-x-auto shadow-inner">
                  <div className="flex items-center gap-1.5 mb-3 pb-2 border-b border-paper/15">
                    <span className="h-2.5 w-2.5 rounded-full bg-trash-bright/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-warn" />
                    <span className="h-2.5 w-2.5 rounded-full bg-keep-bright/80" />
                    <span className="text-[10px] text-paper/60 font-sans ml-2">bash terminal</span>
                  </div>
                  <pre className="text-paper/85 leading-relaxed">
                    <span className="text-paper/45"># 1. Clone the project repository</span>{'\n'}
                    <span className="text-keep-bright">git clone </span>https://github.com/eyadaldaoud/MailYard.git{'\n\n'}
                    <span className="text-paper/45"># 2. Enter directory & install packages</span>{'\n'}
                    <span className="text-keep-bright">cd </span>MailYard{'\n'}
                    <span className="text-keep-bright">npm install</span>{'\n\n'}
                    <span className="text-paper/45"># 3. Create your local environment configuration</span>{'\n'}
                    <span className="text-keep-bright">cp </span>.env.example .env.local
                  </pre>
                </div>
              </div>

              {/* Requirements & Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="rounded-2xl border border-linen bg-sheet p-4">
                  <h4 className="text-xs font-bold text-ink mb-1.5 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-keep" />
                    <span>Prerequisites</span>
                  </h4>
                  <ul className="text-xs text-ink-soft space-y-1 list-disc list-inside">
                    <li>Node.js 18.17+ or Node 20+</li>
                    <li>npm, pnpm, or yarn</li>
                    <li>Standard Google/Gmail account</li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-linen bg-sheet p-4">
                  <h4 className="text-xs font-bold text-ink mb-1.5 flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-unload" />
                    <span>Privacy Architecture</span>
                  </h4>
                  <p className="text-xs text-ink-soft leading-relaxed">
                    MailYard communicates <strong>directly with your Gmail API</strong>. Your tokens and emails are never shared or sent to any 3rd party backend.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: GOOGLE CLOUD OAUTH */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-linen pb-4">
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-unload uppercase">
                    Step 2 of 4
                  </span>
                  <h2 className="text-lg font-bold text-ink">
                    Google Cloud Console & Gmail API Setup
                  </h2>
                  <p className="text-xs text-ink-soft">
                    Create an OAuth 2.0 Web Application client to securely read and clean your Gmail inbox.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-xl border border-unload bg-ink/20 hover:bg-ink/30 px-3 py-1.5 text-xs font-semibold text-unload transition"
                  >
                    <span>Google Console</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              {/* Step by step checklist */}
              <div className="space-y-3.5">
                {/* 2.1 */}
                <div className="rounded-2xl border border-linen bg-sheet p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-paper">
                      1
                    </span>
                    <h3 className="text-xs font-bold text-ink">
                      Create a Google Cloud Project & Enable Gmail API
                    </h3>
                  </div>
                  <p className="text-xs text-ink-soft pl-7">
                    Go to{' '}
                    <a
                      href="https://console.cloud.google.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-unload underline inline-flex items-center gap-0.5"
                    >
                      Google Cloud Console <ExternalLink className="h-2.5 w-2.5 inline" />
                    </a>
                    , click the project selector at the top, and click <strong>New Project</strong> (e.g. name it <em>MailYard</em>).
                  </p>
                  <div className="pl-7 pt-1">
                    <a
                      href="https://console.developers.google.com/apis/api/gmail.googleapis.com/overview"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-linen bg-sheet px-3 py-1.5 text-xs font-medium text-ink hover:text-ink transition"
                    >
                      <span>Enable Gmail API</span>
                      <ExternalLink className="h-3 w-3 text-unload" />
                    </a>
                  </div>
                </div>

                {/* 2.2 */}
                <div className="rounded-2xl border border-linen bg-sheet p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-paper">
                      2
                    </span>
                    <h3 className="text-xs font-bold text-ink">
                      Configure OAuth Consent Screen
                    </h3>
                  </div>
                  <div className="text-xs text-ink-soft pl-7 space-y-1.5">
                    <p>Under <strong>APIs & Services</strong> → <strong>OAuth consent screen</strong>:</p>
                    <ul className="list-disc list-inside space-y-1 text-ink">
                      <li>Choose <strong>External</strong> User Type.</li>
                      <li>Fill App Name (e.g., <em>MailYard</em>) and your email.</li>
                      <li>
                        <strong>Add Scopes:</strong> Add{' '}
                        <code className="text-unload bg-sheet px-1 py-0.5 rounded font-mono text-[11px]">
                          gmail.readonly
                        </code>
                        ,{' '}
                        <code className="text-unload bg-sheet px-1 py-0.5 rounded font-mono text-[11px]">
                          gmail.modify
                        </code>
                        ,{' '}
                        <code className="text-unload bg-sheet px-1 py-0.5 rounded font-mono text-[11px]">
                          gmail.send
                        </code>
                        .
                      </li>
                      <li>
                        <strong className="text-warn">Crucial Step:</strong> Under <strong>Test Users</strong>, click <strong>Add Users</strong> and enter your own personal Gmail address. This allows immediate login without needing Google verification!
                      </li>
                    </ul>
                  </div>
                </div>

                {/* 2.3 */}
                <div className="rounded-2xl border border-linen bg-sheet p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-paper">
                      3
                    </span>
                    <h3 className="text-xs font-bold text-ink">
                      Create OAuth 2.0 Client ID Credentials
                    </h3>
                  </div>
                  <div className="text-xs text-ink-soft pl-7 space-y-2">
                    <p>
                      Go to <strong>Credentials</strong> → <strong>Create Credentials</strong> → <strong>OAuth client ID</strong>:
                    </p>
                    <p>Application type: <strong>Web application</strong></p>
                    
                    <div className="space-y-2 pt-1">
                      <span className="text-xs font-semibold text-ink block">
                        Add to Authorized redirect URIs:
                      </span>
                      
                      {/* Local redirect URI */}
                      <div className="flex items-center justify-between gap-2 rounded-xl border border-ink bg-depot p-2.5">
                        <code className="font-mono text-xs text-paper">
                          http://localhost:3000/api/auth/callback/google
                        </code>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              'http://localhost:3000/api/auth/callback/google',
                              'local-uri'
                            )
                          }
                          className="shrink-0 flex items-center gap-1 rounded-lg border border-linen bg-sheet px-2 py-1 text-[11px] text-ink hover:text-ink transition"
                        >
                          {copiedSection === 'local-uri' ? (
                            <Check className="h-3 w-3 text-keep" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          <span>Copy</span>
                        </button>
                      </div>

                      {/* Production redirect URI */}
                      <div className="flex items-center justify-between gap-2 rounded-xl border border-ink bg-depot p-2.5">
                        <code className="font-mono text-xs text-paper">
                          https://&lt;your-domain-or-vercel-app&gt;/api/auth/callback/google
                        </code>
                        <span className="text-[10px] text-paper/50 uppercase tracking-wider font-semibold">
                          For Live Hosting
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-ink-soft pt-1">
                      Copy the generated <strong className="text-ink">Client ID</strong> and <strong className="text-ink">Client Secret</strong> into Step 4!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SUPABASE DATABASE */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-linen pb-4">
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-unload uppercase">
                    Step 3 of 4
                  </span>
                  <h2 className="text-lg font-bold text-ink">
                    Supabase PostgreSQL Database Setup
                  </h2>
                  <p className="text-xs text-ink-soft">
                    Stores your permanent blocked sender rules, accounts audit, and session tokens.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-xl border border-keep/40 bg-keep/20 hover:bg-keep/30 px-3 py-1.5 text-xs font-semibold text-keep transition"
                  >
                    <span>Open Supabase</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              {/* Note about optional nature */}
              <div className="rounded-2xl border border-unload bg-unload/10 p-3.5 flex items-start gap-3">
                <Zap className="h-4 w-4 text-unload shrink-0 mt-0.5" />
                <p className="text-xs text-ink">
                  <strong className="text-ink">Optional but Recommended:</strong> If you skip Supabase, MailYard continues to work with an in-memory session and cache store. Adding Supabase allows your rules and blocked senders to persist permanently.
                </p>
              </div>

              {/* Schema SQL Block */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-ink">
                      1. Run Schema in Supabase SQL Editor
                    </h3>
                    <p className="text-[11px] text-ink-soft">
                      Create a free project at supabase.com, open the <strong>SQL Editor</strong> tab, paste this schema, and click <strong>Run</strong>:
                    </p>
                  </div>

                  <button
                    onClick={() => copyToClipboard(sqlSchema, 'sql')}
                    className="flex items-center gap-1.5 rounded-xl border border-linen bg-sheet px-3 py-1.5 text-xs text-ink hover:text-ink transition"
                  >
                    {copiedSection === 'sql' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-keep" />
                        <span className="text-keep font-semibold">Copied SQL</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-ink-soft" />
                        <span>Copy Complete SQL</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="relative rounded-2xl border border-ink bg-depot p-4 font-mono text-xs overflow-x-auto shadow-inner max-h-56">
                  <pre className="text-paper/85 leading-relaxed">{sqlSchema}</pre>
                </div>
              </div>

              {/* Key retrieval instructions */}
              <div className="rounded-2xl border border-linen bg-sheet p-4 space-y-2">
                <h4 className="text-xs font-bold text-ink flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-paper">
                    2
                  </span>
                  <span>Retrieve API Credentials</span>
                </h4>
                <p className="text-xs text-ink-soft pl-7">
                  In your Supabase project, go to <strong>Project Settings</strong> → <strong>API</strong> and copy:
                </p>
                <div className="pl-7 grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs font-mono">
                  <div className="rounded-xl border border-linen bg-sheet p-2.5">
                    <span className="text-[10px] text-ink-soft block uppercase font-sans">Project URL</span>
                    <span className="text-unload text-[11px] truncate block">https://xyz.supabase.co</span>
                  </div>
                  <div className="rounded-xl border border-linen bg-sheet p-2.5">
                    <span className="text-[10px] text-ink-soft block uppercase font-sans">anon public key</span>
                    <span className="text-unload text-[11px] truncate block">eyJhbGciOiJIUz...</span>
                  </div>
                  <div className="rounded-xl border border-linen bg-sheet p-2.5">
                    <span className="text-[10px] text-ink-soft block uppercase font-sans">service_role secret</span>
                    <span className="text-keep text-[11px] truncate block">eyJhbGciOiJIUz...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: CONFIGURATION & LAUNCH */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-linen pb-4">
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-unload uppercase">
                    Step 4 of 4
                  </span>
                  <h2 className="text-lg font-bold text-ink">
                    Generate .env.local & Launch Application
                  </h2>
                  <p className="text-xs text-ink-soft">
                    Paste your credentials into the interactive generator below to copy your tailored configuration file.
                  </p>
                </div>
                <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-2xl bg-unload border border-unload text-paper">
                  <Rocket className="h-5 w-5" />
                </div>
              </div>

              {/* Interactive Helper Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[11px] font-semibold text-ink block mb-1">
                    Google Client ID
                  </label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
                    className="w-full rounded-xl border border-linen bg-sheet px-3 py-2 text-xs text-ink placeholder-ink-mute focus:border-unload focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-ink block mb-1">
                    Google Client Secret
                  </label>
                  <input
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="e.g. GOCSPX-xxxxxxxxx"
                    className="w-full rounded-xl border border-linen bg-sheet px-3 py-2 text-xs text-ink placeholder-ink-mute focus:border-unload focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-ink block mb-1">
                    Supabase Project URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    placeholder="https://xyz.supabase.co"
                    className="w-full rounded-xl border border-linen bg-sheet px-3 py-2 text-xs text-ink placeholder-ink-mute focus:border-unload focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-ink block mb-1">
                    Supabase Anon Key (Optional)
                  </label>
                  <input
                    type="password"
                    value={supabaseAnonKey}
                    onChange={(e) => setSupabaseAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUz..."
                    className="w-full rounded-xl border border-linen bg-sheet px-3 py-2 text-xs text-ink placeholder-ink-mute focus:border-unload focus:outline-none"
                  />
                </div>
              </div>

              {/* Generated .env.local box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                    <span>Generated .env.local</span>
                    <span className="text-[10px] text-ink-soft font-normal">
                      (Save in project root)
                    </span>
                  </span>
                  <button
                    onClick={() => copyToClipboard(generatedEnv, 'env')}
                    className="flex items-center gap-1.5 rounded-xl border border-linen bg-sheet px-3 py-1.5 text-xs text-ink hover:text-ink transition"
                  >
                    {copiedSection === 'env' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-keep" />
                        <span className="text-keep font-semibold">Copied .env.local</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-ink-soft" />
                        <span>Copy .env.local</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="relative rounded-2xl border border-ink bg-depot p-4 font-mono text-xs overflow-x-auto shadow-inner max-h-52">
                  <pre className="text-paper/85 leading-relaxed">{generatedEnv}</pre>
                </div>
              </div>

              {/* Launch & Test Run */}
              <div className="rounded-2xl border border-linen bg-sheet p-4 space-y-3">
                <h4 className="text-xs font-bold text-ink flex items-center gap-2">
                  <Rocket className="h-4 w-4 text-keep" />
                  <span>Start the Server & Clean Your Inbox</span>
                </h4>
                <div className="flex items-center justify-between gap-2 rounded-xl border border-ink bg-depot p-2.5 font-mono text-xs">
                  <code className="text-keep-bright">npm run dev</code>
                  <button
                    onClick={() => copyToClipboard('npm run dev', 'run')}
                    className="flex items-center gap-1 rounded-lg border border-linen bg-sheet px-2 py-1 text-[11px] text-ink hover:text-ink transition"
                  >
                    {copiedSection === 'run' ? (
                      <Check className="h-3 w-3 text-keep" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    <span>Copy</span>
                  </button>
                </div>
                <p className="text-xs text-ink-soft">
                  Visit <code className="text-unload font-mono">http://localhost:3000</code> and click <strong className="text-ink">Connect Gmail</strong> in the navbar to log in with your Google account!
                </p>
              </div>
            </div>
          )}

          {/* Stepper Footer Controls */}
          <div className="mt-8 flex items-center justify-between border-t border-linen pt-5">
            <button
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
              className={`flex items-center gap-1.5 rounded-xl border border-linen bg-sheet px-4 py-2 text-xs font-semibold text-ink transition ${
                currentStep === 1
                  ? 'opacity-40 cursor-not-allowed'
                  : 'hover:bg-linen/50 hover:text-ink'
              }`}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Previous Step</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-soft font-medium hidden sm:inline">
                Step {currentStep} of {steps.length}
              </span>

              {currentStep < 4 ? (
                <button
                  onClick={() => setCurrentStep((prev) => Math.min(4, prev + 1))}
                  className="flex items-center gap-1.5 rounded-xl bg-ink hover:bg-depot px-5 py-2 text-xs font-bold text-paper shadow-md transition"
                >
                  <span>Next Step</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  onClick={onEnableDemo}
                  className="flex items-center gap-1.5 rounded-xl bg-keep px-5 py-2 text-xs font-bold text-paper shadow-lg shadow-keep/20 transition"
                >
                  <Sparkles className="h-3.5 w-3.5 text-paper" />
                  <span>Preview Demo Mode</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Callout for Visitors */}
        <div className="rounded-2xl border border-linen bg-sheet p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-signal border border-ink text-ink shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-ink">Just browsing and want to test drive?</h4>
              <p className="text-[11px] text-ink-soft">
                You can explore the complete MailYard interface with realistic simulated emails right now without setting up API keys.
              </p>
            </div>
          </div>

          <button
            onClick={onEnableDemo}
            className="tnum rounded-xl border border-ink bg-ink hover:bg-paper-2 hover:text-ink text-paper px-4 py-2 text-xs font-bold transition"
          >
            Launch Interactive Demo Mode
          </button>
        </div>

      </div>
    </div>
  );
}
