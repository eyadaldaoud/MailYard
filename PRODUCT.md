# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 16 (App Router), React 19, Tailwind CSS 4, Supabase (Postgres), Google OAuth 2.0, Gmail REST API. (Delegated: existing codebase answers this.)

## Users

The author's primary audience is recruiters, clients, and other developers evaluating design and engineering skill. The tool must also genuinely work: real Gmail users (OAuth) or demo-mode visitors bulk-cleaning an inbox of up to 1,000 emails.

## Product Purpose

MailCleaner bulk-cleans Gmail inboxes: scan metadata (never content), filter by category (heavy files, ancient mail, mass notifications), trash in bulk, one-click unsubscribe, auto-delete rules, permanent sender blocklist, and a digital-footprint tab (breach inspection via HIBP, Chrome password CSV parsing, discovered-account deletion links).

## Positioning

Fast, private inbox surgery — metadata-only processing, no email content stored — versus heavyweight mail clients. In demo mode anyone can drive the full tool against realistic mock data without connecting a real account.

## Operating Context

Single-page dashboard. Setup wizard gates OAuth/Supabase/HIBP configuration; demo mode substituting for auth is a first-class flow. KPI bar drives cross-tab filters. Live SSE progress during inbox sync. Rules in localStorage; tokens server-side in Supabase.

## Capabilities and Constraints

- Tabs: setup, inbox cleaner, unsubscriber, digital footprint (OSINT), blocklist — structure may be freely reorganized; every feature must survive.
- Modal flows: setup guide, cleaning wizard, auto-delete rules; fetch progress drawer.
- Gmail API state edge case (API not enabled) surfaces an action-required banner.
- Privacy: no email content stored; only sender, size, date, flags.
- User approved: portfolio-oriented, entire visual identity open, layout may change as long as functionality is preserved.

## Evidence on Hand

Realistic demo mock data (`lib/gmail/mock-data.ts`) used for demonstration.

## Product Principles

1. Every feature survives the redesign — core functionality is good (user's words).
2. The look must not read as AI-generated: a distinctive, intentional design point of view is the point of the exercise.
3. Trust in destructive actions (bulk trash, unsubscribes, blocks) must be visually loud where it matters and quiet everywhere else.
4. The demo path must work and look complete without any real account connected.

## Accessibility & Inclusion

Keyboard-operable destructive-action confirmations; readable contrast; mobile support already present and must persist.
