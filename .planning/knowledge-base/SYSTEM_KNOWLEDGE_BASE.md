# Prospectly — System Knowledge Base

> **Purpose of this document**
> This is the authoritative, user-facing knowledge source for an internal AI support assistant.
> It explains *what Prospectly does*, *how users navigate it*, *what each module is for*, and *how to guide
> users to the right place*. It deliberately avoids low-level code, implementation details, and developer
> internals.
>
> **Terminology note:** This document uses **"Referral Payout"** for the cash reward attached to a request
> or job, matching what users see in the product UI. (Internal/engineering docs may call this a "bounty";
> never use that word in user-facing answers.)
>
> When answering a user, the assistant should: (1) identify the user's intent, (2) map it to the correct
> module/page below, (3) give the navigation path, and (4) explain the relevant rule or expectation.

---

## 1. System Overview

**Prospectly is a B2B warm-introduction and referral platform that monetizes professional networking.**

It lets people turn their professional network into value in two main ways:

1. **Prospecting / Introductions** — A *requester* who wants to reach a hard-to-access prospect posts a
   request with a **Referral Payout** (cash reward). A *connector* who already knows that prospect makes a
   warm introduction and earns the payout once a meeting happens.
2. **Recruiting** — An *employer* posts a job with an auto-calculated Referral Payout. *Connectors* refer
   candidates from their network, and candidates apply. Payouts are released when interviews/hires are
   confirmed.

Surrounding these two engines are supporting systems: contact management, a public marketplace, payments
and escrow, trust scoring, credits, subscriptions, referrals, calendar integration, disputes, account
management, and reporting.

**Core promise to users:** money only changes hands when a real, successful outcome (a booked meeting, a
confirmed interview) is delivered. Funds are held in escrow until then.

**Platform shape:** A web single-page app (with iOS/Android via Capacitor) backed by a service API.
Sign-in is **Google/Microsoft OAuth only — there is no password login.**

---

## 2. Key Terminology (Platform Glossary)

The assistant should use these exact terms when talking to users.

| Term | Meaning |
|------|---------|
| **Requester** | A user who wants an introduction to a prospect and posts a Referral Payout for it. |
| **Connector** | A user who knows the prospect (or candidate) and makes the introduction/referral to earn the payout. |
| **Prospect** | The target person a requester wants to meet. |
| **Referral Payout** | The cash reward attached to an introduction request or job. Held in escrow until the outcome is delivered. |
| **Escrow** | Funds held by the platform between payment and successful delivery. The payer is not charged in full until success milestones are met. |
| **Success Fee** *(recruiting only)* | An optional, additional per-job fee reserved 100% for the hired candidate as a joining/retention bonus. Separate from the Referral Payout. |
| **Introduction Request** | A posted ask to be introduced to a specific prospect, with a Referral Payout. |
| **Marketplace / Opportunities** | The public area where shared introduction requests and jobs are visible to all users who might fulfill them. |
| **Claim** | When a marketplace user asserts they can fulfill a shared request; goes through a verification step. |
| **sharerCode / shareCode** | A unique tracking code attached to a shared/public link so credit and payout attribution is correct. |
| **Trust Score** | A rules-based reputation score that affects introduction payout speed and marketplace visibility. A score of **90+** unlocks immediate introduction payouts. |
| **Credits** | Earned by enriching contacts; can be spent toward introduction requests. |
| **Payout** | Money released to a connector's connected bank/Stripe account after a successful outcome. |
| **Candidate** | A person applying to (or referred to) a job; identity stays anonymous until payment is captured. |
| **Pipeline / Kanban** | Stage-based board for tracking introductions or candidates through their lifecycle. |
| **Consent flow** | Step where a contact/candidate explicitly agrees (via a tokenized email link) before their info is shared further. |
| **Enrichment** | Augmenting imported contacts with company, role, and social data. |
| **Dispute** | A formal complaint raised on an introduction (e.g., no-show, service quality) that can request a refund. |

**Lifetime financial labels** (use the correct one per audience):

| Concept | Requester / Employer sees | Connector sees |
|---------|---------------------------|----------------|
| Money being held | "In Escrow" | "Pending Payout" |
| Lifetime total | "Total Invested" | "Total Earned" |

---

## 3. User Roles & Intents

A single account can act in multiple roles depending on the activity.

| Role | What they want to do | Primary areas |
|------|---------------------|---------------|
| **Requester / Deal Seeker** | Reach a specific prospect via a warm intro | Prospecting → Find Prospects, My Prospects |
| **Connector** | Earn Referral Payouts by introducing people they know | Prospecting → Incoming Requests, Opportunities |
| **Employer / Recruiter** | Fill a role using the network | Recruiting → Post a Job, My Job Posts |
| **Referrer (recruiting connector)** | Refer candidates and earn payouts | Recruiting → Refer Candidates, Job Marketplace |
| **Candidate / Job Seeker** | Apply to jobs and book interviews | Recruiting → My Applications, public links |
| **Marketplace participant** | Browse and claim shared opportunities | Opportunities, Job Marketplace |

---

## 4. Module Descriptions (User-Facing Purpose)

Each module below maps to what the user experiences. Implementation lives elsewhere; this is the "why it
exists and what it's for" view.

### Onboarding ("Getting Started")
A guided 4-step setup after first sign-in: **Profile → Calendar → Contacts → Verification.** It connects
the user's calendar, imports their contacts, and provisions their account so they can start making or
requesting introductions. Users land here automatically when setup is incomplete.

### Dashboard
The home base after sign-in. It gives an at-a-glance summary of the user's activity and what to do next.
The assistant should treat the Dashboard as the default "where do I start" answer for logged-in users.

**The statistic cards (what each one means, in plain terms):**

| Card | What it tells the user | Notes |
|------|------------------------|-------|
| **Pending Intros** | How many incoming introduction requests are waiting for their response. | Tap to go to Incoming Requests and respond. "Need response" = action required. |
| **Meetings Booked** | How many meetings have been scheduled (a prospect/candidate picked a slot). | Shows a "vs last week" trend so the user can see momentum. |
| **Meetings Completed** | How many of those meetings have actually taken place. | Completion is what unlocks payouts; also shown "vs last week". |
| **Total Invested** | The total money the user has put in as a requester/employer. | Shown in dollars; the "in escrow" figure is the portion still held pending successful outcomes. |
| **Total Earned** | The total money the user has earned as a connector. | Shown in dollars; "in escrow" is the portion still pending release. Tap to view payouts. |
| **Peer Feedbacks** | How many peer feedback items are pending for the user. | Feedback affects Trust Score and can release payouts; tap to view recent feedback. |

**Other dashboard sections:**
- **Priority Actions** — A ranked list of what the user should do next (e.g., respond to a pending request,
  finish an enrichment batch, reply to a meeting invite), ordered by urgency and impact.
- **High-Value Opportunities** — Surfaces the introduction/meeting opportunities with the highest potential
  value, so the user knows where to focus.
- **Upcoming Meetings** — The user's near-term scheduled meetings, in chronological order.
- **Banners** — Prompts such as connecting a calendar or notifications that need attention.

> **How the numbers are produced (non-technical):** These figures are simply live counts and totals of the
> user's own activity (their contacts, requests, meetings, payments, and feedback). They update as the user
> acts in the platform — there's no manual entry. Trends like "vs last week" compare the current value to
> the same point a week earlier.

### Contacts (My Contacts / Import Contacts)
Where users build and manage their network. Contacts can be imported from **Google, Microsoft, Apple
iCloud, LinkedIn (ZIP export), or CSV**. Imports run in the background and show live progress. Imported
contacts are enriched with extra company/role data and de-duplicated automatically. A strong contact base
is the prerequisite for making introductions and earning payouts.

**Inviting contacts to Prospectly (from the My Contacts screen):**
Beyond managing contacts, users can invite people from their list to join the platform:
- **Select one or more contacts** in the list and send them an invitation by email.
- **Personalize the message** — an invite editor lets the user write their own invitation text before
  sending.
- **Choose an invitation plan** — invites can be sent on a chosen plan; paid invitation plans also require
  selecting an organization (relevant for organization leaders inviting members onto a plan).
- **Track invites in "Invited Users"** — a dedicated view on the contacts screen lists everyone invited and
  their onboarding status, with search (by name or email) and paging. After sending, users get clear
  feedback such as "Invitations Sent Successfully," "Invitations Partially Sent," or a failure notice.
- **Resend** — if an invitation wasn't accepted, the user can resend it with a fresh link.
- Recipients open the invite link, confirm eligibility by email, and complete sign-up via Google/Microsoft;
  accepting the invite can also set them up on the associated plan/organization.

This complements the **Referrals** feature (see below): inviting contacts grows the network, and qualifying
sign-ups can earn referral rewards.

**Contact data security (user-facing reassurance):** Contact data is protected with strong, industry-
standard **encryption (AES-256-GCM)**. Sensitive personal details (such as email, phone number, LinkedIn,
and physical address) are stored **encrypted in a separate, isolated store** from the main contact record,
which only holds **masked** display values — so even in the unlikely event of a breach, exposure is
minimized. All contact creation and import paths run through a single centralized encryption service, so no
contact data bypasses encryption. (For account security more broadly: sign-in uses Google/Microsoft OAuth,
sessions are protected with secure httpOnly cookies and CSRF protection, and a user can permanently delete
all their data via account deletion.)

### Prospecting / Introductions
The core engine for warm introductions:
- **Find Prospects** — *How a user finds someone to be introduced to.* The user searches for the person
  they want to reach by entering details like name plus company, email, or website — or a LinkedIn profile
  URL. The platform looks across the network and surfaces matching prospects. From a result, the user
  creates an **introduction request** and attaches a **Referral Payout**. (More detail = better matches;
  the screen prompts users to add email/company/website along with the name.)
- **My Prospects** — Track the introductions the user has requested through their lifecycle.
- **Incoming Requests** — *How a connector helps.* These are requests where the user knows the prospect.
  The connector reviews the request, **accepts** it, and sends a warm **introduction email** to the
  prospect. The prospect then books a meeting with the requester. When the meeting is completed, the
  connector earns the Referral Payout. In short, connectors turn relationships they already have into warm
  intros (and income) for requests they're well-placed to fulfill.
- **Opportunities** — The public marketplace of shared requests anyone can try to fulfill (claim + verify).

The introduction lifecycle: *request created → connectors who know the prospect are notified → a connector
accepts → introduction email sent → prospect books a meeting → meeting completed → feedback → Referral
Payout released.*

### Global Marketplace (Opportunities & Public Requests)
The public marketplace where introduction requests are opened up to a wider pool of connectors. Sidebar
label: **Opportunities** (`/prospecting/opportunities`).

**When does a request go to the global marketplace?**
Only when the **requester explicitly shares it** — there is no automatic posting. The normal flow is:
a request is first offered to connectors who already know the prospect (Incoming Requests); if the
requester wants broader reach, they choose **Share to Marketplace** on that request. They can also
**remove it** from the marketplace at any time, which takes the listing down.

**What sharing does:**
- Generates a **public link with a unique short code** (sharerCode) so attribution and payout credit are
  tracked correctly.
- Makes the request visible to **all marketplace users** in Opportunities (the requester acknowledges this
  visibility when sharing).
- **Anyone with the public link can view** the request details without signing in; those visits are tracked
  for analytics.

**Who can fulfill it:**
- **Any authenticated user can claim** a listing, signalling they can make the introduction. External
  visitors must sign up first, then claim.
- A claim goes through **claim verification** — the claimant must demonstrate a legitimate connection to
  the prospect before the claim is confirmed. Conflicting claims are resolved by the system.
- On successful fulfillment, the payout is handled through the platform's payments flow (split appropriately for
  marketplace-sourced intros — see §8 rule #10 for the recruiting-side split).

**Tracking & protection:**
- Users can see what they've shared ("my shared") and what they've claimed ("my claims").
- **Bot detection** and **marketplace-specific rate limiting** protect browse/claim endpoints from scraping
  and automated claiming.

### Recruiting
A parallel engine for hiring:
- **Post a Job** — A guided wizard. The Referral Payout is auto-calculated from the salary range; a payment
  method is required before posting. AI can help extract job details from a URL or uploaded file. The job
  can optionally include a **Success Fee** (a candidate joining bonus), and the recruiter can email selected
  organizations about the job (once per job).
- **My Job Posts** — Manage posted jobs and work candidates through a Kanban pipeline.
- **Refer Candidates** — Where connectors see AI-matched job opportunities from their network and refer
  contacts (with the contact's consent). Connectors can also **upload a résumé** for someone not in their
  contacts; the résumé is AI-evaluated against the job.
- **Job Marketplace** — Public board of jobs connectors can share and candidates can apply to.
- **My Applications** — A candidate's view of jobs they've applied to.

**How a recruiter gets candidates (the three ways candidates reach a job):**
1. **Connector referrals (AI-matched).** Once a job is posted, the platform matches it against connectors'
   networks and surfaces it to relevant connectors in **Refer Candidates**. A connector approves a match,
   the contact is asked for **consent**, and on acceptance the candidate enters the recruiter's pipeline.
2. **Connector résumé uploads.** A connector can upload a résumé for someone not in their contacts; it's
   AI-evaluated against the job, then follows the same consent → pipeline flow.
3. **Direct applications.** Candidates discover a job via the **Job Marketplace** or a shared public job
   link and apply themselves.

In all cases candidates land in the recruiter's **Kanban pipeline** (in My Job Posts), where the recruiter
reviews, shortlists, invites to interview, and tracks completion. Candidate identity stays anonymous until
payment is captured (see §8).

**How a connector helps in recruiting:** connectors put forward people from their network (by approving an
AI match or uploading a résumé) and earn a Referral Payout when their candidate progresses to a successful
interview/hire. Sharing a job via their unique link also attributes any resulting candidate to them.

Key recruiting rules are detailed in §8.

### Calendar
Connects the user's **Google Calendar or Microsoft Outlook** calendar (via OAuth). It's requested during
onboarding (Step 2) and is **central to how Prospectly works** — not just a convenience.

**Why connecting a calendar matters / what it's used for:**
- **Real-time availability for booking.** The connected calendar lets a prospect (or candidate) pick a slot
  from the user's *actual* free times, eliminating back-and-forth scheduling emails.
- **Automatic meeting creation with a video link.** When a slot is booked, the platform creates the event
  on the connected calendar and attaches a **Google Meet or Microsoft Teams** link automatically.
- **Outcome verification = payouts.** This is the key reason: Prospectly only releases money on a *real,
  verified* meeting. The calendar connection is how the platform confirms a meeting was actually booked and
  took place, which is what triggers the Referral Payout. Without a connected calendar, the introduction
  loop can't complete and payouts can't be released.
- **At-a-glance status.** Connected calendars surface upcoming events and meeting badges on the dashboard.

**Other facts:** Users can connect/disconnect calendars and manage multiple integrations. OAuth tokens are
stored securely and refreshed automatically. Because connection is required during onboarding, users who
skip it will be prompted to complete it before they can fully use introductions/recruiting.

### Payments, Transactions & Finances
Handles Referral Payouts, escrow, captures, and payouts via Stripe. The **Transactions** page shows
financial activity, split by **Prospecting** and **Recruitment** sections. Funds are captured at milestones
and released on success; disputes trigger refund handling.

### Disputes
Lets a user involved in an introduction raise a formal complaint (e.g., no-show, cancelled meeting, service
quality, unprofessional conduct) and optionally request a refund. See §8 and §10.

### Trust Score
A reputation score that reflects how reliable and active a user is on the platform. It's rules-based and
fully transparent — the Trust Score page shows the current score, the user's **badge tier** (e.g., bronze
/ silver / gold), progress against each scoring rule, and a **history timeline** of every change.

**What raises (and lowers) a Trust Score:**
- **Completing introductions successfully** — the biggest positive driver.
- **Receiving positive peer feedback** after introductions. (Negative feedback can *reduce* the score, so
  conduct matters on both sides.)
- **Maintaining an active, enriched contact base.**
- **Consistent platform usage / engagement** over time.

Points are awarded per activity and accumulate by category; the same set of events always produces the same
score (it's deterministic, not arbitrary), and every change is logged so users can see exactly why their
score moved.

**Why a higher Trust Score is worth it (what it unlocks):**
- **Faster payouts.** A score of **90+ enables immediate introduction payouts**; below that, payout waits
  until peer feedback is in.
- **Better earning rates.** Payout earning percentages are tiered by Trust Score — higher score, better rate.
- **More marketplace visibility** and **priority in connector matching**, so high-trust users get surfaced
  for more opportunities.
- **Badge tiers** that signal credibility to others at decision points.

**Feedback's role:** After an introduction, participants are asked to leave feedback; users can see their
**pending feedback requests** and submit feedback, which both helps release payouts and feeds everyone's
Trust Scores. Trust Score (including the recent-feedback view) is at the Trust Score page.

### Credits
An alternative to cash. Users earn credits by hitting contact-enrichment milestones and can spend them
toward introduction requests. Balance and full transaction history are tracked.

### Subscriptions
Tiered plans managed through Stripe and the Stripe billing portal, accessed via the profile menu. How it
works:
- **Plans are configurable, not fixed in the app.** Each plan has a name, description, a set of **features**,
  and **usage limits**, with **monthly and yearly** pricing options. The current catalog is always fetched
  live (the in-app Plans view) and synced with Stripe — so the *specific* tier names, prices, and what each
  includes can change over time and are not hardcoded.
- **Managing a subscription** (subscribe, upgrade, downgrade, cancel, change payment method) happens through
  the **Stripe billing portal**, opened from within the app.
- **Subscription status** can be one of: `active`, `trialing`, `past_due`, `unpaid`, `canceled`,
  `incomplete`, or `incomplete_expired`. Status is kept in sync with Stripe automatically; users can also
  trigger a manual re-sync if their state looks stale.
- **Transaction history** (payments, refunds, plan changes) is recorded and viewable.

> **Assistant guidance:** When a user asks "what do I get on plan X?" or "how much is it?", do **not** quote
> specific tiers/prices from memory — they're configuration-driven and may have changed. Point the user to
> the in-app Plans view (profile → Subscription) for the current, authoritative list.

### Referrals
Invite others to Prospectly via email or link. When an invitee signs up and reaches milestones, the
referrer earns rewards. Tracked on the Referrals page.

### Profile, Settings & Account Deletion
Manage personal/company info, subscription, and privacy settings. The profile dropdown is the entry point
for Subscription and Privacy settings. Account deletion is also requested here — it runs after a 24-hour
grace period and can be cancelled in that window (see §8 and §10).

### Reports
Consolidated analytics: business performance, campaign performance, introduction analytics, and revenue
reports (each is a tab on the Reports page).

### Help & Support
Static help center and support contact, available without signing in.

---

## 5. Navigation Guidance

The authenticated app uses a sidebar grouped into **Prospecting**, **Recruiting**, and **General**.

### Sidebar map (label → route)

**Prospecting**
- Find Prospects → `/prospecting/find-prospects`
- My Prospects → `/prospecting/my-prospects`
- Incoming Requests → `/prospecting/incoming-requests`
- Opportunities → `/prospecting/opportunities`
- Transactions → `/transactions?section=prospecting`

**Recruiting (Employer)**
- Post a Job → `/recruiting/post-a-job`
- My Job Posts → `/recruiting/my-job-posts`
- Refer Candidates → `/recruiting/refer-candidates`
- Job Marketplace → `/recruiting/job-marketplace`
- Transactions → `/transactions?section=recruitment`

**Recruiting (Job Seeker)**
- My Applications → `/recruiting/my-applications`

**General**
- My Contacts → `/my-contacts`
- Trust Score → `/trust-score`
- Subscription → `/profile?section=subscriptions`
- Privacy → `/profile?section=privacy`

### Other key routes
- Dashboard → `/dashboard`
- Import Contacts → `/import-contacts`
- Reports → `/reports` (tabs: `?tab=business`, `?tab=campaigns`, `?tab=introductions`, `?tab=financial`)
- Getting Started → `/getting-started` (steps 1–4)
- Profile / Settings → `/profile`
- Referrals → `/referrals`

### Public (no sign-in) routes
- Marketing: `/`, `/how-it-works`, `/our-story`, `/contact`, `/help` (`/support`)
- Legal/trust: `/terms`, `/privacy`, `/security`, `/confidentiality`, `/transparency`, `/community-pledge`
- Public request page: `/request/:requestId/:sharerCode`
- Book a meeting: `/book-meeting/:requestId/:bookingToken`
- Decline an introduction: `/decline-introduction/:requestId/:bookingToken`
- Public job page: `/jobs/:shareCode`
- Candidate consent: `/consent/:token`
- Interview booking: `/interview-booking/:candidateId/:token`
- Accept invite: `/accept-invite/:token`

> **Navigation note for the assistant:** Many old `/dashboard/*` links still work via automatic redirects,
> but always point users to the **current** paths above (Prospecting/Recruiting prefixes, prefix-free
> general pages).

---

## 6. User Journey Summaries

### Journey A — New user setup
Sign in with Google/Microsoft → guided through Getting Started (Profile → Calendar → Contacts →
Verification) → contacts import in the background → land on Dashboard ready to act.

### Journey B — Requesting an introduction (Requester)
Find Prospects → identify the prospect → create request with a Referral Payout → connectors are notified →
a connector accepts and emails the intro → prospect books a meeting → meeting completes → both give
feedback → payout released. Track progress in **My Prospects**.

### Journey C — Earning a payout (Connector)
See a relevant request in **Incoming Requests** (or **Opportunities** for public ones) → accept → send the
warm introduction → prospect books and meets the requester → payout released (immediately if Trust Score ≥
90, otherwise after peer feedback).

### Journey D — Marketplace fulfillment
Requester shares a request publicly → it appears in **Opportunities** with a sharerCode → another user
claims it → completes claim verification (confirms they know the prospect) → makes the intro → payout split.

### Journey E — Posting and filling a job (Employer)
Post a Job wizard (Referral Payout auto-calculated from salary, payment method required, optional Success
Fee) → AI matches the job to connectors' networks → connectors refer candidates / candidates apply →
manage them on the Kanban pipeline → shortlist (free) → send interview invite → candidate
books a slot via public link (calendar event created) → interview completed → move to Hired (payment
captured in full).

### Journey F — Referring a candidate (Recruiting connector)
See AI-matched jobs in **Refer Candidates** → approve a match (or upload a résumé) → consent email sent to
the contact → contact accepts and applies → connector attributed via sharerCode → payout on successful
outcome.

### Journey G — Candidate applying
Open a public job link or consent email → apply (identity stays anonymous) → if shortlisted, receive an
interview invite → book a slot on the public interview-booking page → attend interview.

---

## 7. Module Interaction Map

How the pieces connect (read "→" as "feeds / depends on"):

- **Contacts** → everything. A rich, enriched contact base powers introduction matching and recruiting AI
  matches, and earns **Credits**.
- **Onboarding** → connects **Calendar** and triggers **Contacts** import.
- **Prospecting/Introductions** ↔ **Calendar** (meeting booking + completion verification) ↔ **Payments**
  (escrow, captures, payouts) ↔ **Trust Score** (payout speed) ↔ **Credits** (alternative funding) ↔
  **Disputes** (complaints/refunds).
- **Marketplace/Opportunities** extends **Prospecting** to a public audience; attribution via **sharerCode**;
  payouts split through **Payments**.
- **Recruiting** ↔ **Contacts** (AI matching + referrals) ↔ **Calendar** (interview booking) ↔ **Payments**
  (two-step capture, employer pays fees, optional Success Fee, marketplace split).
- **Trust Score** ← signals from **Introductions**, peer **feedback**, and **enrichment**; → influences
  introduction **Payments** (immediate vs deferred) and **Marketplace** visibility.
- **Subscriptions** & **Referrals** are account-level and run alongside all activity.
- **Account Deletion** → cascades through **Payments** (cancels Stripe subscriptions), **Contacts**, and
  search indexes.
- **Reports** aggregates outcomes from Prospecting, Recruiting, and Payments.

---

## 8. Important Business Logic (User-Facing Rules)

State these plainly; don't expose internal mechanics.

### Introductions (Prospecting)
1. **You're not charged in full upfront.** The Referral Payout sits in escrow. It's captured in stages — a
   small portion when the introduction email is delivered, and the remainder when the prospect books the
   meeting.
2. **Payout speed depends on Trust Score.** Connectors with a Trust Score of **90 or higher** get paid
   immediately on success; below that, payout waits until peer feedback is submitted.
3. **Meetings are calendar-verified.** A meeting must actually be booked/occur (tracked via the connected
   calendar) for the outcome to count and funds to release.

### Recruiting
4. **The employer sets one flat Referral Payout per job**, and a payment method is required before a job
   can be posted.
5. **You only pay when you hire.** Posting a job and shortlisting candidates are free — no charge and no
   hold. The full Referral Payout is charged when the employer moves a candidate to Hired. **The employer
   pays all associated fees** (the payout plus payment processing fees).
6. **Referral Payout split:** of the Referral Payout, the connector receives the majority and the platform
   keeps a service share.
7. **Success Fee (optional, per job).** A separate additional fee reserved entirely for the hired candidate
   as a joining bonus. It's released by the recruiter after any probation period. Connector payouts are
   created at hire and released by the recruiter.
8. **Connector payout timing on Success-Fee jobs** is chosen by the recruiter at job creation — either
   immediately on success or after the candidate's probation period.
9. **Candidate identity is anonymous until payment is captured** (i.e., once the interview slot is booked).
   Before that, recruiters see an anonymous candidate label.
10. **Recruiting marketplace split.** If a brand-new connector signs up via a shared job link and the
    candidate they bring is hired on that same job, the payout is split between the original sharer and the
    new connector. Applying directly (or placing the candidate on a different job) means a single connector
    payout with no split.

### Marketplace, Credits & Account
11. **Marketplace requests are public.** Sharing a request makes it visible to all marketplace users — users
    acknowledge this before sharing.
12. **Credits are an alternative to cash**, earned through contact-enrichment milestones and spent toward
    introduction requests.
13. **Disputes** can be raised on an introduction the user is part of, while it's active (from acceptance
    through to a completed meeting). Only one active dispute is allowed per introduction, a refund request
    cannot exceed the disputed amount, and the team reviews each case (pending → under review →
    resolved/rejected).
14. **Account deletion has a 24-hour grace period.** After requesting deletion, the account is scheduled
    for removal 24 hours later and can be cancelled during that window. After it runs, data is permanently
    purged and active Stripe subscriptions are cancelled.
15. **Sign-in is OAuth-only.** Users authenticate with Google or Microsoft — there is no password to reset.

---

## 9. Common User Actions → Guidance Paths

Use this as the assistant's primary intent-routing table.

| User says / wants | Send them to | Notes |
|-------------------|--------------|-------|
| "How do I get started?" | `/getting-started` | Complete all 4 steps. |
| "What do my dashboard stats mean?" | Dashboard (`/dashboard`) | Explain the cards: Pending Intros, Meetings Booked/Completed, Total Invested/Earned, Peer Feedbacks. See §4. |
| "Import my contacts" | `/import-contacts` | Google, Microsoft, Apple, LinkedIn ZIP, or CSV. |
| "Is my contact data / are my contacts secure?" | Reassure: AES-256-GCM encryption | Sensitive fields encrypted in a separate store; main record masked. See Contacts §4 + FAQ. |
| "I want to meet/reach someone" | Find Prospects (`/prospecting/find-prospects`) | Create a request + set a Referral Payout. |
| "Track my requests" | My Prospects (`/prospecting/my-prospects`) | |
| "Where can I earn payouts?" | Incoming Requests + Opportunities | Incoming = you know the prospect; Opportunities = public marketplace. |
| "How do I share my request publicly / to the marketplace?" | Share to Marketplace on the request | Explicit action only; creates a public link; removable anytime. |
| "Track what I've shared/claimed" | Opportunities → my shared / my claims | |
| "How do I make the introduction?" | Incoming Requests → accept → send intro | Prospect then books via calendar. |
| "When do I get paid?" | Trust Score (`/trust-score`) + see rules #2, #7 | Intros: 90+ = immediate, else after feedback. Recruiting: depends on Success Fee/probation. |
| "Post a job / hire" | Post a Job (`/recruiting/post-a-job`) | Payout auto-calculated; payment method required. |
| "Manage my job candidates" | My Job Posts (`/recruiting/my-job-posts`) | Kanban pipeline. |
| "Refer someone to a job" | Refer Candidates (`/recruiting/refer-candidates`) | AI matches from your contacts; or upload a résumé. |
| "Apply / see my applications" | My Applications (`/recruiting/my-applications`) | |
| "See my money / payouts" | Transactions (`/transactions`) | `?section=prospecting` or `?section=recruitment`. |
| "Raise a dispute / I had a no-show" | Disputes (raise from the relevant introduction) | One active dispute per intro; can request a refund. |
| "Upgrade / billing" | Profile → Subscription (`/profile?section=subscriptions`) | Stripe-managed. |
| "Privacy settings" | Profile → Privacy (`/profile?section=privacy`) | |
| "Delete my account" | Profile / Settings | 24-hour grace period; cancellable in that window. |
| "Invite my contacts to Prospectly" | My Contacts (`/my-contacts`) | Select contacts → personalize message → choose plan → send; track in "Invited Users". |
| "See who I've invited / resend an invite" | My Contacts → Invited Users | Lists invitees + onboarding status; supports resend. |
| "Invite friends / referrals (rewards)" | Referrals (`/referrals`) | Referral rewards tracking. |
| "Connect my calendar" / "Why connect a calendar?" | Getting Started Step 2 or Profile | Google or Microsoft; enables booking, auto-creates meetings, verifies outcomes for payouts. |
| "View analytics/reports" | Reports (`/reports`) | Tabs: business, campaigns, introductions, financial. |
| "Boost my reputation / raise my Trust Score" | Trust Score (`/trust-score`) | Complete intros, earn positive feedback, keep contacts active, stay engaged; page shows per-rule progress. |
| "What does my Trust Score unlock?" | Trust Score (`/trust-score`) | Faster payouts (90+ = immediate), better earning rates, more visibility, priority matching, badge tier. |
| "Get help" | `/help` | |

---

## 10. FAQ

**Q: How does Prospectly make introductions happen?**
A requester posts a request with a Referral Payout; someone in the network who knows the prospect (a
connector) makes a warm introduction and earns the payout once a meeting is booked and completed.

**Q: How do I find a prospect to be introduced to?**
Go to Find Prospects and search for the person — enter their name plus company, email, or website, or paste
a LinkedIn profile URL. The platform surfaces matching prospects from the network; pick one and create an
introduction request with a Referral Payout. Adding more detail (email/company/website) yields better matches.

**Q: How does a connector help / earn?**
A connector helps with people they already know. In Incoming Requests they accept a request for a prospect
they're connected to and send a warm introduction; once the prospect meets the requester, the connector
earns the Referral Payout. (In recruiting, a connector instead refers a candidate or uploads a résumé.)

**Q: How does a recruiter get candidates?**
Three ways: (1) connectors refer people from their networks via AI-matched suggestions, (2) connectors
upload résumés for people not in their contacts, and (3) candidates apply directly from the Job Marketplace
or a shared job link. All candidates flow into the recruiter's Kanban pipeline to be reviewed and advanced.

**Q: Do I pay before getting results?**
No. The Referral Payout is held in escrow. You're charged toward it at success milestones, not fully upfront.

**Q: When does a connector get paid for an introduction?**
On a successful, calendar-verified meeting. Immediately if their Trust Score is 90+, otherwise once peer
feedback is in.

**Q: What's the difference between the Referral Payout and the Success Fee in recruiting?**
The **Referral Payout** is what the connector earns for the referral. The **Success Fee** is an optional
extra the employer can add that goes entirely to the *hired candidate* as a joining bonus, released after
any probation period.

**Q: When does a recruiting connector get paid?**
For jobs without a Success Fee, automatically a short time after the interview is marked completed. For
Success-Fee jobs, either immediately on success or after the candidate's probation — whichever the recruiter
chose when posting.

**Q: What is the Trust Score and how does it work?**
It's a transparent, rules-based reputation score. You earn points for completing introductions, getting
positive peer feedback, keeping an active/enriched contact base, and using the platform consistently;
negative feedback can lower it. Every change is logged on the Trust Score page, which also shows your badge
tier and progress against each rule.

**Q: How do I raise my Trust Score?**
Complete more introductions successfully, earn positive peer feedback (and leave feedback when asked), keep
your contacts active and enriched, and stay engaged. The Trust Score page lists each scoring rule and your
progress, so you can see exactly what to do next.

**Q: Why does my Trust Score matter / what does a higher score unlock?**
A higher score gets you paid faster (90+ = immediate introduction payouts), better payout earning rates,
more marketplace visibility, and priority in connector matching — plus a higher badge tier that signals
credibility to others.

**Q: Why can't I see the candidate's name?**
Candidate identity stays anonymous until payment is captured (when the interview slot is booked). After
that, the recruiter sees their real name and contact details.

**Q: What do the numbers on my dashboard mean?**
They're live counts and totals of your own activity: **Pending Intros** (requests awaiting your response),
**Meetings Booked** and **Meetings Completed** (with a week-over-week trend), **Total Invested** and
**Total Earned** (dollar totals, with the "in escrow" portion still held pending outcomes), and **Peer
Feedbacks** (feedback items pending). They update automatically as you use the platform — see §4 Dashboard
for each card.

**Q: I can't log in — how do I reset my password?**
There's no password. Prospectly uses Google/Microsoft sign-in only. Re-authorize with your provider.

**Q: Where do my contacts come from?**
You import them from Google, Microsoft, Apple iCloud, a LinkedIn ZIP export, or a CSV. They're then
enriched and de-duplicated automatically.

**Q: How do I invite my contacts to join Prospectly?**
On the My Contacts screen, select the contacts you want, personalize the invitation message, choose an
invitation plan (paid plans also need an organization), and send. You can watch their progress in the
"Invited Users" view and resend an invite if it wasn't accepted. Qualifying sign-ups can also earn you
referral rewards.

**Q: How do I see who I've invited / resend an invitation?**
Open the "Invited Users" view on the My Contacts screen — it lists everyone you've invited with their
onboarding status and lets you search and resend.

**Q: Are my contacts / is my data secure?**
Yes. Contact data is protected with strong, industry-standard encryption (AES-256-GCM). Sensitive fields
(email, phone, LinkedIn, address) are kept encrypted in a separate store, while the main record shows only
masked values — limiting exposure even in a worst-case breach. Sign-in is via Google/Microsoft (no stored
passwords), sessions use secure httpOnly cookies with CSRF protection, and you can permanently delete all
your data through account deletion.

**Q: What are Credits?**
A non-cash way to fund introduction requests, earned by enriching your contacts.

**Q: What is the Marketplace / Opportunities?**
A public pool of shared introduction requests (and jobs) that any eligible user can try to fulfill.

**Q: When does my introduction request appear in the global marketplace?**
Only when you choose to **Share to Marketplace** on that request — it's never posted automatically. Sharing
creates a public link and makes the request visible to all marketplace users. You can remove it from the
marketplace at any time.

**Q: Who can see or fulfill a request I shared to the marketplace?**
Anyone with the public link can view the details (no sign-in needed). Any signed-in user can claim it; the
claim must pass verification (proving they actually know the prospect) before it's confirmed.

**Q: Something went wrong with my introduction — can I get a refund?**
Yes. Raise a dispute on that introduction (e.g., no-show, cancelled meeting, service quality). The team
reviews it and handles any refund. Only one active dispute per introduction is allowed.

**Q: What do I get on each subscription plan / how much does it cost?**
Plans and pricing are configurable and synced with Stripe, so they can change. Check the in-app Plans view
(Profile → Subscription) for the current list — each plan shows its features, limits, and monthly/yearly
price. (The assistant should not quote fixed tiers or prices from memory.)

**Q: How do I cancel or change my plan?**
Profile → Subscription, which uses the Stripe billing portal — there you can upgrade, downgrade, cancel, or
update your payment method.

**Q: My subscription says past_due / unpaid — what does that mean?**
A payment didn't go through. Update your payment method in the billing portal (Profile → Subscription). If
the status still looks wrong after paying, trigger a manual re-sync or wait for Stripe to sync.

**Q: How do I delete my account, and is it reversible?**
Request it from Profile/Settings. There's a 24-hour grace period during which you can cancel; after that,
your data is permanently removed and active subscriptions are cancelled.

**Q: Why do I need to connect my calendar?**
It's how prospects and candidates book meetings into your real availability, how the platform auto-creates
the meeting with a Google Meet/Teams link, and — most importantly — how it verifies a meeting actually
happened. Since payouts are only released for verified meetings, the calendar connection is essential for
introductions and recruiting to complete. You can connect Google or Microsoft, and disconnect anytime.

**Q: Can I disconnect or change my calendar?**
Yes. You can disconnect a calendar integration or connect a different provider (Google or Microsoft) at any
time from your settings.

**Q: Will my shared request be public?**
Yes. Sharing to the marketplace makes it visible to all marketplace users; you confirm this when sharing.

---

## 11. Troubleshooting Guidance

| Symptom | Likely cause | Guidance |
|---------|-------------|----------|
| Can't sign in | OAuth not authorized / wrong account | Re-authorize Google/Microsoft. There is no password reset. |
| Contacts didn't import | Import runs in background; provider not authorized; bad file | Check import progress; re-connect the source; verify CSV/LinkedIn ZIP format. |
| Duplicate contacts | Auto de-dup merges close matches | Existing contacts are updated with missing fields rather than duplicated; expected behavior. |
| "I made the intro but wasn't paid" | Meeting not yet booked/completed, or Trust Score < 90 awaiting feedback | Confirm the prospect booked & the meeting occurred (calendar-verified); below 90, payout waits for peer feedback. |
| "Recruiting payout hasn't arrived" | Success-Fee/probation timing, or interview not marked completed | Non-Success-Fee jobs pay shortly after the interview is completed; Success-Fee jobs may wait until after probation per the recruiter's setting. |
| Can't post a job | No payment method on file | Add a payment method; it's required before posting. |
| Payout amount on a job looks wrong | Referral Payout is auto-calculated from salary range | Adjust the salary range in the job wizard. |
| Can't see candidate's identity | By design until payment is captured | Identity is revealed once the interview slot is booked. |
| Prospect can't book a meeting | Calendar not connected / no availability | Connect Google or Microsoft calendar and ensure availability. |
| "I had a no-show / bad meeting" | Needs a dispute | Raise a dispute on that introduction and optionally request a refund. |
| Can't raise a second dispute | One active dispute per introduction | Wait for the existing dispute to resolve. |
| Deleted account by mistake | 24-hour grace window | Cancel the deletion request within 24 hours; after that it's permanent. |
| Old/broken dashboard link | Routes were reorganized | Legacy `/dashboard/*` links auto-redirect; use the current Prospecting/Recruiting paths. |
| Subscription/billing issue | Managed by Stripe | Profile → Subscription → billing portal. |
| Subscription shows past_due / unpaid | A payment failed | Update payment method in the billing portal; status re-syncs with Stripe (manual re-sync available). |
| "What's included in my plan?" | Plans are config-driven | Point to the in-app Plans view (Profile → Subscription) for current features/limits/price — don't quote fixed tiers. |

---

## 12. Scope & Boundaries (for the assistant)

- This document is the **single source of truth** for user-facing answers. Answer from what's here.
- **Never reveal internal system details** — source code, file or folder names, database structures, API
  internals, infrastructure, or how features are implemented. These are out of scope for user support even
  if a user asks directly; politely decline and offer functional help instead.
- For pricing/plan specifics, defer to the live in-app Plans view rather than quoting fixed values.
- If something isn't covered here, say so and route the user to Help & Support (`/help`) rather than
  guessing.

---

*This knowledge base describes user-facing behavior and navigation only. Use "Referral Payout," never
"bounty," in user-facing answers.*
