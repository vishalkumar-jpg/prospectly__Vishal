# Prospectly Database Schema

This document provides a comprehensive overview of the Prospectly database schema, including entity relationships, table structures, and data flow.

## Table of Contents

1. [High-Level Entity Relationship Diagram](#1-high-level-entity-relationship-diagram)
2. [Core Tables](#2-core-tables)
3. [User and Profile Tables](#3-user-and-profile-tables)
4. [Contact Management Tables](#4-contact-management-tables)
5. [Introduction Request Tables](#5-introduction-request-tables)
6. [Payment and Financial Tables](#6-payment-and-financial-tables)
7. [Subscription Tables](#7-subscription-tables)
8. [Supporting Tables](#8-supporting-tables)

---

## 1. High-Level Entity Relationship Diagram

Overall database schema showing all major entities and their relationships.

```mermaid
erDiagram
    profiles ||--o{ contact_relationships : "has"
    profiles ||--o{ introduction_requests : "creates"
    profiles ||--o{ introduction_requests : "accepts"
    profiles ||--o{ user_subscription : "has"
    profiles ||--o{ introduction_feedback : "gives"
    profiles ||--o{ introduction_feedback : "receives"
    profiles ||--o{ payout_history : "receives"
    profiles ||--o{ calendar_integrations : "has"
    
    contacts ||--o{ contact_relationships : "linked_to"
    contacts ||--o{ contact_sensitive_data : "has"
    contacts ||--o{ introduction_requests : "targets"
    contacts ||--o{ contact_import_snapshots : "imported_via"
    
    contact_relationships ||--o{ contact_import_snapshots : "has"
    
    introduction_requests ||--|| introduction_transactions : "has"
    introduction_requests ||--o{ introduction_potential_connectors : "has"
    introduction_requests ||--o{ scheduled_meetings : "has"
    introduction_requests ||--o{ introduction_feedback : "has"
    introduction_requests ||--o{ introduction_email_logs : "has"
    introduction_requests ||--|| payout_history : "generates"
    
    introduction_transactions ||--|| payout_history : "funds"
    
    subscription_plan ||--o{ subscription_plan_price : "has"
    subscription_plan ||--o{ user_subscription : "used_by"
    
    contacts_imports ||--o{ contact_import_snapshots : "tracks"
    
    profiles {
        uuid id PK
        varchar email UK
        varchar first_name
        varchar last_name
        varchar full_name
        text bio
        varchar company
        varchar job_title
        integer trust_score
        varchar stripe_customer_id
        varchar stripe_connect_account_id
        integer max_concurrent_requests
    }
    
    contacts {
        bigserial id PK
        varchar first_name
        varchar last_name
        varchar email
        varchar phone_number
        varchar company
        varchar title
        varchar linkedin
        uuid original_importer_id FK
        numeric bounty_amount
    }
    
    contact_sensitive_data {
        uuid id PK
        bigint contact_id FK
        text email
        text phone
        text linkedin
        text secondary_email
        text normalized_email
        text normalized_phone
        varchar encryption_key_id
    }
    
    contact_relationships {
        bigserial id PK
        bigint contact_id FK
        uuid user_id FK
        numeric bounty_amount
    }
    
    introduction_requests {
        uuid id PK
        uuid requester_id FK
        uuid accepted_by FK
        bigint contact_id FK
        varchar contact_name
        numeric bounty_amount
        numeric adjusted_bounty_amount
        varchar status
        text meeting_description
        uuid bounty_stages_id FK
        boolean requester_archived
        boolean connector_archived
    }
    
    introduction_transactions {
        uuid id PK
        uuid introduction_request_id FK UK
        numeric total_authorized_amount
        numeric total_captured_amount
        varchar overall_status
    }
    
    payout_history {
        uuid id PK
        uuid connector_id FK
        uuid introduction_request_id FK UK
        uuid introduction_transaction_id FK
        numeric gross_amount
        numeric platform_commission_amount
        numeric net_amount
        varchar status
        varchar payout_triggered_by
        integer trust_score_at_payout
        varchar stripe_transfer_id
        varchar stripe_payout_id
    }
    
    introduction_potential_connectors {
        uuid id PK
        uuid request_id FK
        uuid potential_connector_id FK
        varchar status
    }
    
    scheduled_meetings {
        uuid id PK
        uuid introduction_request_id FK
        uuid requester_id FK
        timestamp meeting_date
        varchar meeting_platform
        text meeting_link
    }
    
    introduction_feedback {
        uuid id PK
        uuid introduction_id FK
        uuid feedback_from_user_id FK
        uuid feedback_to_user_id FK
        numeric rating
        text feedback_text
        varchar feedback_type
    }
    
    user_subscription {
        uuid id PK
        uuid user_id FK
        uuid subscription_plan_id FK
        uuid price_id FK
        varchar stripe_subscription_id UK
        varchar status
    }
    
    subscription_plan {
        uuid id PK
        varchar name
        text description
        varchar stripe_plan_id
        jsonb feature
        integer max_concurrent_requests
    }
```

---

## 2. Core Tables

### 2.1 Profiles Table

User profiles with authentication, trust scores, and Stripe integration.

```mermaid
erDiagram
    profiles {
        uuid id PK "Primary Key"
        varchar email UK "Unique Email"
        varchar first_name "First Name"
        varchar last_name "Last Name"
        varchar full_name "Full Name"
        text bio "User Bio"
        varchar company "Company Name"
        varchar job_title "Job Title"
        varchar linkedin_url "LinkedIn Profile"
        text profile_photo_url "Profile Photo URL"
        varchar location "Location"
        varchar industry "Industry"
        varchar phone "Phone Number"
        varchar website_url "Website URL"
        text products "Products/Services"
        text unique_selling_proposition "USP"
        text target_market "Target Market"
        text company_size "Company Size"
        text revenue_range "Revenue Range"
        text key_credentials "Key Credentials"
        boolean is_verified "Verification Status"
        varchar stripe_customer_id "Stripe Customer ID"
        varchar stripe_primary_payment_method_id "Payment Method"
        varchar stripe_connect_account_id "Stripe Connect Account"
        boolean stripe_connect_onboarding_complete "Onboarding Status"
        integer trust_score "Trust Score 0-100"
        integer max_concurrent_requests "Max Active Requests"
        boolean has_seen_welcome_popup "Welcome Popup Status"
        timestamp created_at "Created At"
        timestamp updated_at "Updated At"
    }
```

### 2.2 Contacts Table

Global contact registry with masked PII.

```mermaid
erDiagram
    contacts {
        bigserial id PK "Primary Key"
        varchar first_name "First Name"
        varchar last_name "Last Name"
        varchar gender "Gender"
        varchar title "Job Title"
        varchar company "Company Name"
        varchar phone_number "Masked Phone"
        varchar email "Masked Email"
        varchar employees "Company Size"
        varchar industry "Industry"
        varchar linkedin "LinkedIn URL"
        varchar website "Website"
        varchar city "City"
        varchar state "State"
        varchar country "Country"
        text profile_photo_url "Photo URL"
        varchar source "Import Source"
        uuid original_importer_id FK "First Importer"
        numeric bounty_amount "Median Bounty"
        timestamp created_at "Created At"
        timestamp updated_at "Updated At"
        timestamp deleted_at "Soft Delete"
    }
```

---

## 3. User and Profile Tables

Relationship between users and their data.

```mermaid
erDiagram
    profiles ||--o{ contact_relationships : "owns"
    profiles ||--o{ user_subscription : "subscribes"
    profiles ||--o{ calendar_integrations : "connects"
    profiles ||--o{ contacts_provider_tokens : "authenticates"
    
    profiles {
        uuid id
        varchar email
        integer trust_score
    }
    
    contact_relationships {
        bigserial id
        bigint contact_id
        uuid user_id
        numeric bounty_amount
    }
    
    user_subscription {
        uuid id
        uuid user_id
        uuid subscription_plan_id
        varchar status
    }
    
    calendar_integrations {
        uuid id
        uuid user_id
        varchar provider
        text access_token
        text refresh_token
    }
    
    contacts_provider_tokens {
        uuid id
        uuid user_id
        varchar provider
        text access_token
        text refresh_token
    }
```

---

## 4. Contact Management Tables

Contact storage, relationships, and sensitive data handling.

```mermaid
erDiagram
    contacts ||--|| contact_sensitive_data : "has_encrypted"
    contacts ||--o{ contact_relationships : "linked_to_users"
    contact_relationships ||--o{ contact_import_snapshots : "imported_via"
    contacts_imports ||--o{ contact_import_snapshots : "tracks"
    
    contacts {
        bigserial id PK
        varchar first_name
        varchar last_name
        varchar company
        numeric bounty_amount
    }
    
    contact_sensitive_data {
        uuid id PK
        bigint contact_id FK
        text email "Encrypted"
        text phone "Encrypted"
        text linkedin
        text secondary_email "Encrypted"
        text normalized_email "For Matching"
        text normalized_phone "For Matching"
        varchar encryption_key_id
    }
    
    contact_relationships {
        bigserial id PK
        bigint contact_id FK
        uuid user_id FK
        numeric bounty_amount "User-specific Bounty"
    }
    
    contact_import_snapshots {
        uuid id PK
        bigint contact_relationship_id FK
        uuid contacts_import_id FK
        varchar source
    }
    
    contacts_imports {
        uuid id PK
        uuid user_id FK
        varchar source
        varchar status
        integer imported
        integer duplicates
        integer failed
    }
```

---

## 5. Introduction Request Tables

Introduction request lifecycle and related data.

```mermaid
erDiagram
    introduction_requests ||--|| introduction_transactions : "payment"
    introduction_requests ||--o{ introduction_potential_connectors : "potential"
    introduction_requests ||--o{ scheduled_meetings : "schedules"
    introduction_requests ||--o{ introduction_feedback : "feedback"
    introduction_requests ||--o{ introduction_email_logs : "emails"
    introduction_requests ||--|| payout_history : "payout"
    introduction_requests }o--|| contacts : "targets"
    introduction_requests }o--|| profiles : "requester"
    introduction_requests }o--|| profiles : "accepted_by"
    
    introduction_requests {
        uuid id PK
        uuid requester_id FK
        uuid accepted_by FK
        bigint contact_id FK
        varchar contact_name
        numeric bounty_amount
        numeric adjusted_bounty_amount
        varchar status
        text meeting_description
        boolean requester_archived
        boolean connector_archived
    }
    
    introduction_transactions {
        uuid id PK
        uuid introduction_request_id FK UK
        numeric total_authorized_amount
        numeric total_captured_amount
        varchar overall_status
    }
    
    introduction_potential_connectors {
        uuid id PK
        uuid request_id FK
        uuid potential_connector_id FK
        varchar status
    }
    
    scheduled_meetings {
        uuid id PK
        uuid introduction_request_id FK
        uuid requester_id FK
        timestamp meeting_date
        text meeting_link
    }
    
    introduction_feedback {
        uuid id PK
        uuid introduction_id FK
        uuid feedback_from_user_id FK
        uuid feedback_to_user_id FK
        numeric rating
        text feedback_text
        varchar feedback_type
    }
    
    introduction_email_logs {
        uuid id PK
        uuid introduction_request_id FK
        varchar subject
        text body
        timestamp sent_at
    }
```

---

## 6. Payment and Financial Tables

Payment processing and payout tracking.

```mermaid
erDiagram
    introduction_requests ||--|| introduction_transactions : "has"
    introduction_transactions ||--|| payout_history : "funds"
    introduction_requests ||--|| payout_history : "generates"
    profiles ||--o{ payout_history : "receives"
    
    introduction_transactions {
        uuid id PK
        uuid introduction_request_id FK UK
        varchar payment_method_id
        numeric total_authorized_amount
        numeric total_captured_amount
        varchar overall_status
        timestamp payment_authorized_at
        timestamp fully_paid_at
        text payment_error
    }
    
    payout_history {
        uuid id PK
        uuid connector_id FK
        uuid introduction_request_id FK UK
        uuid introduction_transaction_id FK
        numeric gross_amount
        numeric platform_commission_amount
        numeric net_amount
        varchar connector_stripe_account_id
        varchar stripe_transfer_id
        varchar stripe_payout_id
        varchar status
        varchar payout_mode
        boolean payout_eligible
        boolean payout_released
        timestamp payout_released_at
        varchar payout_triggered_by
        integer trust_score_at_payout
        varchar processing_status
        timestamp processing_started_at
        timestamp processing_completed_at
        integer retry_count
        varchar job_id
        text error_message
    }
```

---

## 7. Subscription Tables

Subscription plan and user subscription management.

```mermaid
erDiagram
    subscription_plan ||--o{ subscription_plan_price : "has_prices"
    subscription_plan ||--o{ user_subscription : "subscribed_to"
    subscription_plan_price ||--o{ user_subscription : "pricing"
    profiles ||--o{ user_subscription : "has"
    
    subscription_plan {
        uuid id PK
        varchar name
        text description
        varchar stripe_plan_id
        jsonb feature
        boolean is_active
        boolean default_plan
        integer max_concurrent_requests
    }
    
    subscription_plan_price {
        uuid id PK
        uuid subscription_plan_id FK
        varchar interval
        numeric price
        varchar stripe_price_id
        boolean is_active
    }
    
    user_subscription {
        uuid id PK
        uuid user_id FK
        uuid subscription_plan_id FK
        uuid price_id FK
        varchar stripe_subscription_id UK
        varchar status
        timestamp current_period_start
        timestamp current_period_end
        boolean cancel_at_period_end
        timestamp canceled_at
    }
```

---

## 8. Supporting Tables

Additional tables for system functionality.

```mermaid
erDiagram
    profiles ||--o{ calendar_integrations : "has"
    profiles ||--o{ contacts_provider_tokens : "has"
    profiles ||--o{ refresh_tokens : "has"
    introduction_requests }o--|| bounty_stages : "stage"
    
    calendar_integrations {
        uuid id PK
        uuid user_id FK
        varchar provider
        text access_token
        text refresh_token
        timestamp expires_at
    }
    
    contacts_provider_tokens {
        uuid id PK
        uuid user_id FK
        varchar provider
        text access_token
        text refresh_token
        timestamp expires_at
    }
    
    refresh_tokens {
        uuid id PK
        uuid user_id FK
        text token
        timestamp expires_at
    }
    
    bounty_stages {
        uuid id PK
        varchar stage_id
        integer stage_order
        varchar stage_name
        text description
    }
    
    linkedin_imports {
        uuid id PK
        uuid user_id FK
        uuid contacts_import_id FK
        text file_url
        jsonb processing_log
        varchar status
    }
```

---

## Data Flow Diagrams

### Contact Import Data Flow

```mermaid
flowchart LR
    A[External Source] -->|OAuth/Upload| B[contacts_imports]
    B -->|Queue Job| C[Background Worker]
    C -->|Fetch| D[External API]
    D -->|Contacts| E[Process & Match]
    E -->|New/Duplicate| F[contacts]
    E -->|Encrypted PII| G[contact_sensitive_data]
    E -->|User Mapping| H[contact_relationships]
    E -->|Import Tracking| I[contact_import_snapshots]
    
    style A fill:#e3f2fd
    style F fill:#c8e6c9
    style G fill:#fff9c4
    style H fill:#e8f5e9
```

### Introduction Request Data Flow

```mermaid
flowchart TD
    A[Requester Creates Request] --> B[introduction_requests]
    B --> C[Find Connectors]
    C --> D[contact_relationships]
    D --> E[introduction_potential_connectors]
    B --> F[Create Payment]
    F --> G[introduction_transactions]
    E --> H[Connector Accepts]
    H --> I[Update introduction_requests]
    I --> J[Send Email]
    J --> K[introduction_email_logs]
    I --> L[Schedule Meeting]
    L --> M[scheduled_meetings]
    I --> N[Capture Payment]
    N --> O[Update introduction_transactions]
    O --> P[Process Payout]
    P --> Q[payout_history]
    I --> R[Submit Feedback]
    R --> S[introduction_feedback]
    
    style B fill:#e3f2fd
    style G fill:#fff9c4
    style Q fill:#c8e6c9
    style S fill:#e8f5e9
```

### Trust Score Calculation Data Flow

```mermaid
flowchart TD
    A[Introduction Completed] --> B[introduction_requests]
    C[Feedback Submitted] --> D[introduction_feedback]
    B --> E[Calculate Introduction Score]
    D --> F[Calculate Feedback Score]
    E --> G[Get Badge Bonus]
    F --> G
    G --> H[Apply Weights]
    H --> I[Update profiles.trust_score]
    I --> J{Trust Score >= 90?}
    J -->|Yes| K[Check Pending Payouts]
    J -->|No| L[End]
    K --> M[payout_history]
    M --> N[Process Immediate Payout]
    
    style I fill:#fff9c4
    style N fill:#c8e6c9
```

---

## Index Strategy

### Primary Indexes

- All tables have primary key indexes
- Foreign key columns are indexed for join performance
- Unique constraints create unique indexes

### Performance Indexes

```sql
-- Contact matching performance
idx_contacts_email ON contacts(email)
idx_contacts_phone_number ON contacts(phone_number)
idx_contact_sensitive_data_normalized_email ON contact_sensitive_data(normalized_email)
idx_contact_sensitive_data_normalized_phone ON contact_sensitive_data(normalized_phone)

-- Introduction request queries
idx_introduction_requests_requester_id ON introduction_requests(requester_id)
idx_introduction_requests_accepted_by ON introduction_requests(accepted_by)
idx_introduction_requests_status ON introduction_requests(status)
idx_introduction_requests_contact_id ON introduction_requests(contact_id)

-- Connector finding
idx_contact_relationships_contact_user ON contact_relationships(contact_id, user_id)
idx_introduction_potential_connectors_request_id ON introduction_potential_connectors(request_id)
idx_introduction_potential_connectors_potential_connector_id ON introduction_potential_connectors(potential_connector_id)

-- Payment and payout tracking
idx_introduction_transactions_request ON introduction_transactions(introduction_request_id)
idx_payout_history_connector ON payout_history(connector_id)
idx_payout_history_status ON payout_history(status)
idx_payout_history_intro_request ON payout_history(introduction_request_id)

-- Subscription queries
idx_user_subscription_user_id ON user_subscription(user_id)
idx_user_subscription_status ON user_subscription(status)
```

---

## Data Encryption

### Encrypted Fields

The following fields are encrypted at rest in `contact_sensitive_data`:

- `email` - Primary email address
- `phone` - Phone number
- `secondary_email` - Secondary email address

### Normalized Fields

For efficient matching without decryption:

- `normalized_email` - Lowercase, trimmed email
- `normalized_phone` - Core digits only
- `normalized_secondary_email` - Normalized secondary email

These normalized fields enable fast duplicate detection during import without decrypting sensitive data.

---

## Soft Deletes

The following tables use soft deletes (deleted_at timestamp):

- `contacts` - Contacts can be soft deleted
- `introduction_requests` - Requests archived via boolean flags (requester_archived, connector_archived)

---

*Last Updated: January 2025*
