# Smart Contact Matching Engine v2.0

## Overview

The Smart Contact Matching Engine is an intelligent duplicate detection system that prevents duplicate contacts from being created when importing contacts from multiple sources (Google, Microsoft, Apple, CSV uploads, manual entry).

The engine uses a two-phase matching approach:
1. **Primary Matching** - Exact match on unique identifiers (email, phone, LinkedIn)
2. **Weighted Scoring** - Fuzzy matching using similarity algorithms when no exact match found

---

## How It Works

### Phase 1: Primary Matching (Instant Duplicate Detection)

When a new contact comes in, the engine first checks for exact matches on unique identifiers. If any of these match, the contact is **immediately flagged as a duplicate** with 100% confidence.

#### Email Matching

The engine checks email addresses across multiple scenarios:

| Scenario | Incoming Contact | Existing Contact | Result |
|----------|-----------------|------------------|--------|
| Primary ↔ Primary | `john@gmail.com` | `john@gmail.com` | ✅ DUPLICATE |
| Primary ↔ Secondary | `john@work.com` | Primary: `john@gmail.com`, Secondary: `john@work.com` | ✅ DUPLICATE |
| Secondary ↔ Primary | Primary: `john@gmail.com`, Secondary: `john@work.com` | `john@work.com` | ✅ DUPLICATE |

**Email Normalization:**
- Converts to lowercase
- Trims whitespace
- `John.Smith@Gmail.COM` becomes `john.smith@gmail.com`

#### Phone Matching

Phone numbers are normalized to handle international formats:

| Incoming Phone | Existing Phone | Result |
|----------------|----------------|--------|
| `+1 (555) 123-4567` | `+15551234567` | ✅ DUPLICATE (exact match after normalization) |
| `555-123-4567` | `+1-555-123-4567` | ✅ DUPLICATE (core digits match) |
| `00 91 98765 43210` | `+919876543210` | ✅ DUPLICATE (00 prefix = international) |

**What is "Core Digits" matching?**
The engine extracts the last 10 digits of any phone number. This means:
- `+1-555-123-4567` → core: `5551234567`
- `555-123-4567` → core: `5551234567`
- These match because the core digits are identical!

#### LinkedIn Matching

LinkedIn URLs are normalized to extract just the profile username:

| Incoming LinkedIn | Existing LinkedIn | Result |
|-------------------|-------------------|--------|
| `https://www.linkedin.com/in/johnsmith` | `linkedin.com/in/johnsmith` | ✅ DUPLICATE |
| `https://linkedin.com/in/johnsmith/` | `johnsmith` | ✅ DUPLICATE |
| `https://uk.linkedin.com/in/johnsmith` | `linkedin.com/in/johnsmith` | ✅ DUPLICATE |

---

### Phase 2: Weighted Scoring (Fuzzy Matching)

If no primary match is found, the engine calculates a similarity score based on multiple fields.

#### Scoring Weights

| Field | Weight | Description |
|-------|--------|-------------|
| Email | 30% | Most reliable identifier |
| Name | 25% | First + Last name combined |
| Company | 18% | Normalized company name |
| Phone | 15% | Phone number similarity |
| Title | 7% | Job title similarity |
| Location | 5% | Bonus if city matches |

#### Decision Thresholds

| Score | Decision | Confidence |
|-------|----------|------------|
| ≥ 90% | DUPLICATE | High |
| ≥ 75% | DUPLICATE | Medium |
| < 75% | NEW CONTACT | - |

---

## Smart Matching Features

### 1. Nickname Detection

The engine recognizes common nicknames and considers them as matches:

| Incoming Name | Existing Name | Match? |
|---------------|---------------|--------|
| William Smith | Bill Smith | ✅ YES (William = Bill) |
| Robert Johnson | Bob Johnson | ✅ YES (Robert = Bob) |
| Michael Brown | Mike Brown | ✅ YES (Michael = Mike) |
| Jennifer Davis | Jenny Davis | ✅ YES (Jennifer = Jenny) |
| Pranav Patel | PJ Patel | ✅ YES (Pranav = PJ) |

**Supported Nicknames Include:**
- William ↔ Will, Bill, Billy, Liam
- Robert ↔ Rob, Bob, Bobby, Robbie
- Michael ↔ Mike, Mikey, Mick
- James ↔ Jim, Jimmy, Jamie
- Elizabeth ↔ Liz, Beth, Betty, Eliza
- And 40+ more common name variations

### 2. Company Name Normalization

Company suffixes are removed before comparison:

| Incoming Company | Existing Company | Match? |
|------------------|------------------|--------|
| Google Inc. | Google | ✅ YES |
| Microsoft Corporation | Microsoft Corp | ✅ YES |
| Apple LLC | Apple Inc | ✅ YES |
| Amazon.com, Inc. | Amazon | ✅ YES |

**Removed Suffixes:**
Inc, LLC, Ltd, Corp, Corporation, Limited, Co, Company, GmbH, AG, PLC, Pvt, Private, Group, Holdings, International

### 3. Email Typo Detection

Common email domain typos are recognized:

| Incoming Email | Existing Email | Match? |
|----------------|----------------|--------|
| john@gmial.com | john@gmail.com | ✅ YES (typo detected) |
| jane@hotmal.com | jane@hotmail.com | ✅ YES (typo detected) |
| bob@yaho.com | bob@yahoo.com | ✅ YES (typo detected) |
| alice@outlok.com | alice@outlook.com | ✅ YES (typo detected) |

**Recognized Typos:**
- Gmail: gmial, gmal, gmai, gamil, gnail
- Hotmail: hotmal, hotmai, hotmial, homail
- Yahoo: yaho, yahooo, yhoo, yahho
- Outlook: outloook, outlok, outloo
- iCloud: iclould, iclod, icoud

### 4. First Initial Matching

When first names differ but last names are very similar:

| Incoming Name | Existing Name | Match? |
|---------------|---------------|--------|
| J. Smith | John Smith | ✅ YES (initial + last name) |
| R. Johnson | Robert Johnson | ✅ YES (initial + last name) |
| M. Williams | Mary Williams | ✅ YES (initial + last name) |

---

## Real-World Examples

### Example 1: Same Person, Different Sources

**Scenario:** User imports contacts from both Google and Apple

| Field | Google Import | Apple Import | Result |
|-------|---------------|--------------|--------|
| First Name | John | Johnny | - |
| Last Name | Smith | Smith | - |
| Email | john.smith@gmail.com | john.smith@gmail.com | - |
| Phone | +1-555-123-4567 | (555) 123-4567 | - |
| Company | Google Inc. | Google | - |

**Engine Decision:** ✅ DUPLICATE
- Primary email match detected
- Score: 100%
- Action: Skip import, optionally update missing fields

---

### Example 2: Same Person, Slight Variations

**Scenario:** CSV upload with slightly different data

| Field | Existing Contact | CSV Import | Analysis |
|-------|------------------|------------|----------|
| First Name | William | Bill | Nickname match (100%) |
| Last Name | Johnson | Johnson | Exact match (100%) |
| Email | william.j@company.com | bill.johnson@company.com | Same domain (35%) |
| Phone | - | +1-555-987-6543 | No existing phone |
| Company | Acme Corporation | Acme Corp | Normalized match (100%) |
| Title | Software Engineer | Sr. Software Engineer | Partial match (60%) |

**Score Calculation:**
- Email: 0.35 × 30% = 10.5%
- Name: 1.00 × 25% = 25%
- Company: 1.00 × 18% = 18%
- Phone: 0 × 15% = 0%
- Title: 0.60 × 7% = 4.2%
- **Total: 57.7%**

**Engine Decision:** ❌ NEW CONTACT (below 75% threshold)

*However, if they had same email:*
- Email: 1.00 × 30% = 30%
- Total would be: 77.2% → ✅ DUPLICATE

---

### Example 3: Completely Different People

| Field | Existing Contact | New Contact |
|-------|------------------|-------------|
| First Name | John | Sarah |
| Last Name | Smith | Williams |
| Email | john.smith@gmail.com | sarah.w@yahoo.com |
| Phone | +1-555-123-4567 | +1-555-999-8888 |
| Company | Google | Amazon |

**Engine Decision:** ❌ NEW CONTACT
- No primary matches
- Very low weighted score (~5%)
- Action: Import as new contact

---

### Example 4: Phone Number Variations (Same Person)

| Field | Existing Contact | New Import |
|-------|------------------|------------|
| Name | Raj Patel | Raj Patel |
| Email | raj@techcorp.com | - (no email) |
| Phone | +91-98765-43210 | 9876543210 |

**Engine Decision:** ✅ DUPLICATE
- Core phone digits match: `9876543210`
- Name is identical
- Score: 100% (primary phone match)

---

### Example 5: Secondary Email Match

| Field | Existing Contact | New Import |
|-------|------------------|------------|
| Name | Lisa Chen | Lisa Chen |
| Primary Email | lisa@personal.com | lisa@work.com |
| Secondary Email | lisa@work.com | - |
| Company | Tech Corp | Tech Corp |

**Engine Decision:** ✅ DUPLICATE
- Incoming email (`lisa@work.com`) matches existing secondary email
- Name and company also match
- Score: 100% (secondary email match)

---

## What Gets Updated on Duplicates?

When a duplicate is detected, the engine can **enrich** the existing contact with missing information:

| Existing Contact | Incoming Data | After Update |
|------------------|---------------|--------------|
| Phone: (empty) | Phone: +1-555-123-4567 | Phone: +1-555-123-4567 ✅ |
| Company: (empty) | Company: Google | Company: Google ✅ |
| LinkedIn: (empty) | LinkedIn: /in/johnsmith | LinkedIn: /in/johnsmith ✅ |
| Email: john@gmail.com | Email: john@work.com | Email: john@gmail.com (unchanged) |

**Rule:** Only empty fields are updated. Existing data is never overwritten.

---

## Cross-User (Global) Deduplication

The engine can also check if a contact exists **anywhere in the system** across all users.

**Use Cases:**
- Prevent truly duplicate records in the database
- Identify contacts already known to other users
- Suggest existing contacts during manual entry

**Example:**

User A has: `john.smith@gmail.com`
User B imports: `john.smith@gmail.com`

**Global Check Result:**
- Duplicate exists: YES
- Owner: User A
- Users with this contact: 1

---

## Summary

| Feature | Benefit |
|---------|---------|
| Primary Matching | Instant detection of exact duplicates |
| Weighted Scoring | Catches near-duplicates with variations |
| Nickname Detection | Handles Bill/William, Mike/Michael, etc. |
| Company Normalization | Ignores Inc, LLC, Ltd differences |
| Email Typo Detection | Catches gmail vs gmial typos |
| Phone Core Matching | Handles country code differences |
| Secondary Email Matching | Cross-checks primary and secondary emails |
| Missing Field Enrichment | Improves data quality on duplicates |
| Global Deduplication | Optional cross-user duplicate detection |

---

## Confidence Levels

| Level | Score Range | Meaning |
|-------|-------------|---------|
| **High** | ≥ 90% | Almost certainly the same person |
| **Medium** | 75% - 89% | Likely the same person |
| **Low** | < 75% | Probably different people (new contact) |

---

*Last Updated: December 2024*
*Version: 2.0*

