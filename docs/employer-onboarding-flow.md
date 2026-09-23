# Employer Onboarding & First Job Post — Flow Diagrams

**Audience:** Client review
**Status:** Proposed flow (for approval)
**Last updated:** 2 Sep 2026

Every diagram below is plain Mermaid — paste any block into mermaid.live, Notion, Confluence or GitHub and it renders as-is.

---

## 1. Master journey — landing page to first hire

```mermaid
flowchart TD
    A["Prospectly landing page"] --> B["Employer clicks 'Post Job'"]
    B --> C["Employer landing page"]

    C --> D1["Sign in"]
    C --> D2["Post a job"]
    D1 --> E["Sign-in pop-up"]
    D2 --> E

    E --> F{"Work email accepted?"}
    F -->|"No - personal email"| G["Blocked with message:<br/>use your company email"]
    G --> E
    F -->|"Yes"| H["Signed in as employer"]

    H --> I{"Resume point?"}
    I -->|"Company profile missing"| S1["Step 1 - Company details"]
    I -->|"Company done, no job yet"| S2["Step 2 - Post the first job<br/>with its details"]
    I -->|"Both complete"| DASH["Employer dashboard unlocked"]

    S1 --> S2
    S2 --> PUB["First job is live"]

    PUB --> MATCH["Candidate recommendations start"]
    PUB --> DASH
    MATCH --> PIPE["Employer pipeline"]
    PIPE --> PAY["Payments and connector payouts"]

    classDef gate fill:#fef3c7,stroke:#d97706,color:#78350f
    classDef done fill:#d1fae5,stroke:#059669,color:#064e3b
    classDef block fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
    class F,I gate
    class PUB,DASH done
    class G block
```

---

## 2. The onboarding gate — where a returning employer lands

The employer cannot browse the platform until both steps are complete. Progress is saved at every step, so signing out and back in resumes exactly where they left off.

```mermaid
stateDiagram-v2
    [*] --> SignedIn

    SignedIn --> CompanyPending: no company profile
    SignedIn --> JobPending: profile done, no job published
    SignedIn --> Active: profile done and job published

    CompanyPending --> JobPending: company profile saved
    JobPending --> Active: first job published

    CompanyPending --> CompanyPending: sign out and sign in again
    JobPending --> JobPending: sign out and sign in again

    Active --> [*]

    note right of CompanyPending
        Platform locked.
        Only the company setup screen
        and Save and exit are reachable.
    end note

    note right of JobPending
        Platform still locked.
        The employer may save the job
        as a draft, but the dashboard
        stays closed until one job is live.
    end note

    note right of Active
        Dashboard, job posts, pipeline,
        transactions and the public
        company page all unlock.
    end note
```

---

## 3. Step 1 — Company profile

A single short form. It is asked once per company, and it is the first of the two gates that keep the platform locked.

```mermaid
flowchart TD
    A["Company details form"] --> B["Company name"]
    A --> C["Company website"]
    A --> D["Industry"]
    A --> E["Company size"]
    A --> F["Headquarters location"]

    B --> G{"All required fields<br/>filled in?"}
    C --> G
    D --> G
    E --> G
    F --> G

    G -->|"No"| H["Stay on the form<br/>with inline validation"]
    H --> A
    G -->|"Yes"| I["Save the company profile"]
    I --> J["Go to Step 2 - Post the first job"]

    A -.-> K["Save and exit"]
    K -.-> L["Whatever was entered is kept<br/>employer resumes here at next sign-in"]

    classDef gate fill:#fef3c7,stroke:#d97706,color:#78350f
    classDef done fill:#d1fae5,stroke:#059669,color:#064e3b
    class G gate
    class I,J done
```

> No website scanning and no careers-page import in this release. Every field is entered by the employer.

---

## 4. Auto-generated referral fee (replaces the forced manual entry)

Today the employer must type a flat referral fee before they can publish. In the new flow the fee is derived on the server from admin settings, the salary range and the job's region. The employer sees the number, never types it.

```mermaid
flowchart TD
    A["Employer publishes a job"] --> B["System reads the job:<br/>salary range, currency, region, seniority"]

    B --> C["Admin fee settings"]
    C --> C1["Fee grid: region x salary band<br/>percentage or fixed amount"]
    C --> C2["Floor and ceiling per region"]
    C --> C3["Deposit percentage - platform wide"]

    C1 --> D["Pick the matching row for<br/>this region and salary band"]
    D --> E["Referral fee = rule applied to the salary midpoint"]
    E --> F{"Inside floor and ceiling?"}
    F -->|"Below floor"| G1["Raise to floor"]
    F -->|"Above ceiling"| G2["Lower to ceiling"]
    F -->|"Yes"| G3["Keep as calculated"]

    G1 --> H["Referral fee locked for the job"]
    G2 --> H
    G3 --> H

    H --> I["Add Stripe processing and platform fee"]
    I --> J["Total employer cost"]
    J --> K["Deposit = deposit percent of total"]
    K --> L["Shown read-only on the review screen"]
    L --> M["Published"]

    N["No matching grid row"] -.-> O["Fall back to the regional default fee<br/>and flag the job for admin review"]
    D -.-> N
    O -.-> H

    classDef admin fill:#e0e7ff,stroke:#4f46e5,color:#312e81
    classDef gate fill:#fef3c7,stroke:#d97706,color:#78350f
    classDef done fill:#d1fae5,stroke:#059669,color:#064e3b
    class C,C1,C2,C3 admin
    class F gate
    class M,L done
```

### Example A — Senior Backend Engineer, North America

| Input | Value |
|---|---|
| Salary range on the job | 120,000 – 160,000 USD per year |
| Salary midpoint | 140,000 USD |
| Admin grid row | North America · 120k–180k band · **6% of midpoint** |
| Regional ceiling | 10,000 USD |

| Derived | Value |
|---|---|
| Referral fee | 6% of 140,000 = **8,400.00 USD** (inside the ceiling) |
| Stripe processing (2.9% + 0.30, grossed up) | 251.19 USD |
| Platform fee | 0.25 USD |
| **Total employer cost** | **8,651.44 USD** |
| Deposit at first shortlist (5%) | **432.57 USD** |
| Balance at hire | **8,218.87 USD** |
| Connector referral payout (80% of the fee) | 6,720.00 USD |
| Platform share (20%) | 1,680.00 USD |

### Example B — Support Specialist, smaller band

| Input | Value |
|---|---|
| Salary midpoint | 40,000 USD |
| Admin grid row | 5% of midpoint |
| Regional floor | 1,200 USD |

| Derived | Value |
|---|---|
| Referral fee | 5% of 40,000 = **2,000.00 USD** |
| Stripe processing | 60.05 USD |
| Platform fee | 0.25 USD |
| **Total employer cost** | **2,060.30 USD** |
| Deposit at first shortlist (5%) | **103.02 USD** |
| Balance at hire | **1,957.28 USD** |
| Connector referral payout (80%) | 1,600.00 USD |

> The employer never edits these numbers during the first post. Admins can override the fee on an individual job, and the fee remains editable after publish on open jobs.

---

## 5. Candidate recommendations after the first job goes live

Publishing the first job starts matching against the candidate pool. Everyone in that pool has already consented when they were added, so there is **no consent request and no connector approval step** — eligible matches go straight into the employer's pipeline, and the connector who owns the relationship is simply informed in their own pipeline.

```mermaid
flowchart TD
    A["First job published"] --> B["Job profile built from<br/>title, skills, description, seniority, location"]
    B --> C["Search the candidate pool<br/>for similar profiles"]
    C --> D["Rank by fit and keep the strongest matches"]
    D --> E["Detailed AI scoring of the top matches"]

    E --> F1{"Already a candidate<br/>on this job?"}
    F1 -->|"Yes"| X1["Skip"]
    F1 -->|"No"| F2{"Active in another job's<br/>pipeline right now?"}
    F2 -->|"Yes - in review, shortlisted,<br/>interviewing or hired"| X2["Skip - not available"]
    F2 -->|"No"| F3{"Previously rejected<br/>or closed elsewhere?"}
    F3 -->|"Yes"| Y1["Eligible - available again"]
    F3 -->|"No - never in a pipeline"| Y2["Eligible"]

    Y1 --> G["Candidate enters the employer pipeline<br/>as In review"]
    Y2 --> G

    G --> H["Employer reviews and shortlists"]
    G --> I["Connector is informed in their pipeline"]
    I --> J["Informational only -<br/>no approve or decline action"]

    classDef gate fill:#fef3c7,stroke:#d97706,color:#78350f
    classDef block fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
    classDef done fill:#d1fae5,stroke:#059669,color:#064e3b
    classDef note fill:#e0e7ff,stroke:#4f46e5,color:#312e81
    class F1,F2,F3 gate
    class X1,X2 block
    class Y1,Y2,G,H done
    class I,J note
```

**Availability rule in words:** a candidate is only recommended when they are **not currently moving through another employer's pipeline**. Candidates who were rejected or whose earlier process closed return to the available pool immediately.

**Connector's role here:** visibility, not gatekeeping. The match appears in the connector's pipeline so they can follow progress and see the referral payout attached to it, but nothing waits on them.

---

## 6. Payment capture — unchanged from today

The money model is exactly what is live today. Only the *source* of the fee changes (auto-derived instead of typed).

```mermaid
flowchart TD
    A["Job published"] --> B["No charge at publish"]
    B --> C["Employer shortlists a candidate"]
    C --> D{"Is this the first shortlist<br/>on this job?"}

    D -->|"Yes"| E["Charge the deposit - 5% of the total"]
    E --> F{"Payment succeeds?"}
    F -->|"No"| G["Shortlist blocked"]
    F -->|"Yes"| H["Candidate moves to Shortlisted"]
    D -->|"No"| H

    H --> I["Interview booked - no charge"]
    I --> J["Interview completed"]
    J --> K["Employer clicks Move to Hired"]

    K --> L{"First hire on this job?"}
    L -->|"Yes"| M["Charge the balance:<br/>total minus deposit already paid"]
    L -->|"No"| N["Charge the full total"]

    M --> O{"Payment succeeds?"}
    N --> O
    O -->|"No"| P["Hire blocked - candidate stays<br/>at Interview completed"]
    O -->|"Yes"| Q["Candidate marked Hired"]
    Q --> R["Connector referral payout created<br/>80% connector / 20% platform"]
    R --> S["Payout released after the waiting period"]

    classDef gate fill:#fef3c7,stroke:#d97706,color:#78350f
    classDef block fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
    classDef done fill:#d1fae5,stroke:#059669,color:#064e3b
    class D,F,L,O gate
    class G,P block
    class Q,R,S done
```

**Rejections cost nothing extra.** If the first shortlisted candidate is rejected, the deposit already paid is credited against whoever is hired first on that job. Every hire after the first is charged the full amount in one go.

---

## 7. One-page summary for the client

| Stage | Employer sees | System does |
|---|---|---|
| Landing | "Post Job" button | Routes to the employer landing page |
| Sign in | Google, Microsoft or work email | Rejects personal email domains; joins or creates the company workspace |
| Step 1 | A short company details form | Saves the company profile and unlocks Step 2 |
| Step 2 | Job details, skills, description with live preview | Builds the searchable job profile |
| Step 3 | Salary range with a recommended band | Salary is informational and drives the fee derivation |
| Step 4 | Engagement model — EOR, managed or direct | Optional and skippable; asked again at hire |
| Step 5 | Review and publish | Derives the referral fee, shows it read-only, publishes |
| After publish | Matched candidates, unlocked dashboard | Recommends available candidates only; starts the payment lifecycle |
