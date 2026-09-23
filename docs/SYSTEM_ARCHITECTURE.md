# Prospectly System Architecture

This document provides a comprehensive overview of the Prospectly system architecture, including component diagrams, technology stack, and system interactions.

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [System Components](#2-system-components)
3. [Architecture Layers](#3-architecture-layers)
4. [Data Flow Architecture](#4-data-flow-architecture)
5. [External Services Integration](#5-external-services-integration)
6. [Queue System Architecture](#6-queue-system-architecture)
7. [Payment Processing Architecture](#7-payment-processing-architecture)

---

## 1. High-Level Architecture

Overall system architecture showing all major components and their relationships.

```mermaid
graph TB
    subgraph Client["Client Layer"]
        WebApp[React/TypeScript Web Application]
        MobileApp[Mobile App - Future]
    end
    
    subgraph API["API Gateway Layer"]
        NestJS[NestJS API Server]
        AuthGuard[JWT Authentication Guard]
        RateLimiter[Rate Limiting]
    end
    
    subgraph Business["Business Logic Layer"]
        AuthService[Auth Service]
        ContactsService[Contacts Service]
        IntroductionsService[Introductions Service]
        PaymentsService[Payments Service]
        ProfilesService[Profiles Service]
        CalendarService[Calendar Service]
        SubscriptionsService[Subscriptions Service]
        FinancesService[Finances Service]
    end
    
    subgraph Data["Data Layer"]
        PostgreSQL[(PostgreSQL Database)]
        DrizzleORM[Drizzle ORM]
        Redis[(Redis Cache)]
    end
    
    subgraph Queue["Queue System"]
        BullMQ[BullMQ Queue Manager]
        ContactWorkers[Contact Import Workers]
        PayoutWorkers[Payout Processing Workers]
    end
    
    subgraph External["External Services"]
        Stripe[Stripe API<br/>Payments + Connect]
        GoogleAPI[Google APIs<br/>OAuth + People + Calendar]
        MicrosoftAPI[Microsoft Graph API<br/>OAuth + Contacts + Calendar]
        GeminiAI[Google Gemini AI<br/>Bounty Calculation]
    end
    
    WebApp -->|HTTPS| NestJS
    MobileApp -.->|HTTPS| NestJS
    
    NestJS --> AuthGuard
    NestJS --> RateLimiter
    NestJS --> AuthService
    NestJS --> ContactsService
    NestJS --> IntroductionsService
    NestJS --> PaymentsService
    NestJS --> ProfilesService
    NestJS --> CalendarService
    NestJS --> SubscriptionsService
    NestJS --> FinancesService
    
    AuthService --> DrizzleORM
    ContactsService --> DrizzleORM
    IntroductionsService --> DrizzleORM
    PaymentsService --> DrizzleORM
    ProfilesService --> DrizzleORM
    CalendarService --> DrizzleORM
    SubscriptionsService --> DrizzleORM
    FinancesService --> DrizzleORM
    
    DrizzleORM --> PostgreSQL
    DrizzleORM --> Redis
    
    ContactsService --> BullMQ
    PaymentsService --> BullMQ
    
    BullMQ --> ContactWorkers
    BullMQ --> PayoutWorkers
    
    ContactWorkers --> GoogleAPI
    ContactWorkers --> MicrosoftAPI
    ContactWorkers --> GeminiAI
    
    PaymentsService --> Stripe
    CalendarService --> GoogleAPI
    CalendarService --> MicrosoftAPI
    
    style WebApp fill:#e3f2fd
    style NestJS fill:#fff3e0
    style PostgreSQL fill:#e8f5e9
    style Redis fill:#ffebee
    style BullMQ fill:#f3e5f5
    style Stripe fill:#fff9c4
    style GoogleAPI fill:#e0f2f1
    style MicrosoftAPI fill:#e0f2f1
    style GeminiAI fill:#fce4ec
```

---

## 2. System Components

Detailed breakdown of all system components and their responsibilities.

```mermaid
graph LR
    subgraph FrontendComponents["Frontend Components"]
        AuthUI[Authentication UI]
        ContactsUI[Contacts Management]
        IntroductionsUI[Introductions UI]
        PaymentsUI[Payments UI]
        CalendarUI[Calendar UI]
        FinancialHubUI[Financial Hub]
        MarketplaceUI[Global Marketplace]
    end
    
    subgraph BackendModules["Backend Modules"]
        AuthModule[Auth Module<br/>- OAuth Handlers<br/>- JWT Management<br/>- User Creation]
        ContactsModule[Contacts Module<br/>- Import Processing<br/>- Matching Engine<br/>- CRUD Operations]
        IntroductionsModule[Introductions Module<br/>- Request Management<br/>- Pipeline Tracking<br/>- Status Updates]
        PaymentsModule[Payments Module<br/>- Payment Processing<br/>- Payout Management<br/>- Transaction Tracking]
        ProfilesModule[Profiles Module<br/>- Profile Management<br/>- Trust Score<br/>- User Settings]
        CalendarModule[Calendar Module<br/>- OAuth Integration<br/>- Meeting Scheduling<br/>- Event Management]
        SubscriptionsModule[Subscriptions Module<br/>- Plan Management<br/>- Stripe Integration<br/>- Webhook Handlers]
        FinancesModule[Finances Module<br/>- Transaction History<br/>- Payout History<br/>- Financial Reports]
    end
    
    subgraph QueueProcessors["Queue Processors"]
        GoogleContactsProcessor[Google Contacts Processor]
        MicrosoftContactsProcessor[Microsoft Contacts Processor]
        AppleContactsProcessor[Apple Contacts Processor]
        LinkedInContactsProcessor[LinkedIn Contacts Processor]
        PayoutProcessor[Payout Processor]
    end
    
    subgraph Services["Core Services"]
        ContactMatchingService[Contact Matching Service]
        BountyCalculationService[Bounty Calculation Service]
        TrustScoreService[Trust Score Service]
        ConnectorFindingService[Connector Finding Service]
        EmailService[Email Service]
    end
    
    AuthUI --> AuthModule
    ContactsUI --> ContactsModule
    IntroductionsUI --> IntroductionsModule
    PaymentsUI --> PaymentsModule
    CalendarUI --> CalendarModule
    FinancialHubUI --> FinancesModule
    MarketplaceUI --> IntroductionsModule
    
    ContactsModule --> GoogleContactsProcessor
    ContactsModule --> MicrosoftContactsProcessor
    ContactsModule --> AppleContactsProcessor
    ContactsModule --> LinkedInContactsProcessor
    
    PaymentsModule --> PayoutProcessor
    
    ContactsModule --> ContactMatchingService
    ContactsModule --> BountyCalculationService
    IntroductionsModule --> ConnectorFindingService
    ProfilesModule --> TrustScoreService
    IntroductionsModule --> EmailService
    
    style FrontendComponents fill:#e3f2fd
    style BackendModules fill:#fff3e0
    style QueueProcessors fill:#f3e5f5
    style Services fill:#e8f5e9
```

---

## 3. Architecture Layers

Layered architecture showing separation of concerns.

```mermaid
graph TD
    subgraph Presentation["Presentation Layer"]
        ReactComponents[React Components]
        StateManagement[State Management<br/>React Query / Context]
        UIComponents[UI Component Library]
    end
    
    subgraph API["API Gateway Layer"]
        RESTControllers[REST Controllers]
        RequestValidation[Request Validation<br/>DTOs + Zod]
        ResponseFormatting[Response Formatting]
        ErrorHandling[Error Handling]
    end
    
    subgraph Business["Business Logic Layer"]
        DomainServices[Domain Services]
        BusinessRules[Business Rules]
        WorkflowOrchestration[Workflow Orchestration]
    end
    
    subgraph DataAccess["Data Access Layer"]
        ORM[Drizzle ORM]
        Repositories[Repository Pattern]
        QueryBuilders[Query Builders]
        Migrations[Database Migrations]
    end
    
    subgraph Infrastructure["Infrastructure Layer"]
        Database[(PostgreSQL)]
        Cache[(Redis)]
        QueueSystem[BullMQ]
        FileStorage[File Storage]
    end
    
    subgraph External["External Services Layer"]
        PaymentGateway[Stripe]
        OAuthProviders[OAuth Providers]
        AI Services[AI Services]
        EmailService[Email Service]
    end
    
    ReactComponents --> StateManagement
    StateManagement --> UIComponents
    UIComponents --> RESTControllers
    
    RESTControllers --> RequestValidation
    RequestValidation --> ResponseFormatting
    ResponseFormatting --> ErrorHandling
    ErrorHandling --> DomainServices
    
    DomainServices --> BusinessRules
    BusinessRules --> WorkflowOrchestration
    WorkflowOrchestration --> ORM
    
    ORM --> Repositories
    Repositories --> QueryBuilders
    QueryBuilders --> Migrations
    Migrations --> Database
    
    DomainServices --> Cache
    DomainServices --> QueueSystem
    DomainServices --> FileStorage
    
    DomainServices --> PaymentGateway
    DomainServices --> OAuthProviders
    DomainServices --> AI Services
    DomainServices --> EmailService
    
    style Presentation fill:#e3f2fd
    style API fill:#fff3e0
    style Business fill:#e8f5e9
    style DataAccess fill:#f3e5f5
    style Infrastructure fill:#ffebee
    style External fill:#fff9c4
```

---

## 4. Data Flow Architecture

How data flows through the system for key operations.

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Service
    participant Queue
    participant Worker
    participant Database
    participant External
    
    Note over User,External: Contact Import Flow
    
    User->>Frontend: Initiate Contact Import
    Frontend->>API: POST /contacts/import/google
    API->>Service: Queue Import Job
    Service->>Queue: Add Job to Queue
    Queue-->>API: Job Queued
    API-->>Frontend: Import Started
    Frontend-->>User: Show Progress
    
    Worker->>Queue: Process Job
    Queue-->>Worker: Job Data
    Worker->>External: Fetch Contacts (Google API)
    External-->>Worker: Contact Data
    Worker->>Service: Process Contacts
    Service->>Database: Match & Store Contacts
    Database-->>Service: Contacts Stored
    Service->>External: Calculate Bounties (Gemini)
    External-->>Service: Bounty Amounts
    Service->>Database: Update Bounties
    Worker->>Queue: Job Complete
    Queue-->>Frontend: Progress Update
    Frontend-->>User: Import Complete
    
    Note over User,External: Introduction Request Flow
    
    User->>Frontend: Create Introduction Request
    Frontend->>API: POST /introductions
    API->>Service: Create Request
    Service->>External: Create PaymentIntents (Stripe)
    External-->>Service: PaymentIntents Created
    Service->>Database: Store Request & Transaction
    Database-->>Service: Request Created
    Service->>Service: Find Connectors
    Service->>Database: Query Contact Relationships
    Database-->>Service: Potential Connectors
    Service->>Database: Create Potential Connector Entries
    Service-->>API: Request Created
    API-->>Frontend: Request Created
    Frontend-->>User: Request Submitted
```

---

## 5. External Services Integration

How the system integrates with external services.

```mermaid
graph TB
    subgraph Prospectly["Prospectly System"]
        API[NestJS API]
        Workers[Background Workers]
    end
    
    subgraph StripeServices["Stripe Services"]
        StripePayments[Stripe Payments API<br/>- PaymentIntents<br/>- Charges<br/>- Refunds]
        StripeConnect[Stripe Connect<br/>- Connected Accounts<br/>- Transfers<br/>- Payouts]
        StripeWebhooks[Stripe Webhooks<br/>- Subscription Events<br/>- Payment Events<br/>- Account Updates]
    end
    
    subgraph GoogleServices["Google Services"]
        GoogleOAuth[Google OAuth 2.0<br/>- Authentication<br/>- Token Management]
        GooglePeople[Google People API<br/>- Contact Fetching]
        GoogleCalendar[Google Calendar API<br/>- Event Creation<br/>- Meeting Links]
    end
    
    subgraph MicrosoftServices["Microsoft Services"]
        MicrosoftOAuth[Microsoft OAuth 2.0<br/>- Authentication<br/>- Token Management]
        MicrosoftGraph[Microsoft Graph API<br/>- Contact Fetching<br/>- Calendar Events]
    end
    
    subgraph AIServices["AI Services"]
        GeminiAPI[Google Gemini API<br/>- Bounty Calculation<br/>- Contact Analysis]
    end
    
    API -->|Create Payment| StripePayments
    API -->|Create Account| StripeConnect
    Workers -->|Process Payout| StripeConnect
    StripeWebhooks -->|Events| API
    
    API -->|OAuth Flow| GoogleOAuth
    Workers -->|Fetch Contacts| GooglePeople
    API -->|Create Events| GoogleCalendar
    
    API -->|OAuth Flow| MicrosoftOAuth
    Workers -->|Fetch Contacts| MicrosoftGraph
    API -->|Create Events| MicrosoftGraph
    
    Workers -->|Calculate Bounty| GeminiAPI
    
    style Prospectly fill:#e3f2fd
    style StripeServices fill:#fff9c4
    style GoogleServices fill:#e0f2f1
    style MicrosoftServices fill:#e0f2f1
    style AIServices fill:#fce4ec
```

---

## 6. Queue System Architecture

Background job processing architecture using BullMQ.

```mermaid
graph TB
    subgraph Application["Application Layer"]
        Services[Business Services]
    end
    
    subgraph QueueLayer["Queue Layer"]
        QueueManager[BullMQ Queue Manager]
        GoogleContactsQueue[Google Contacts Queue]
        MicrosoftContactsQueue[Microsoft Contacts Queue]
        AppleContactsQueue[Apple Contacts Queue]
        LinkedInContactsQueue[LinkedIn Contacts Queue]
        PayoutQueue[Payout Queue]
    end
    
    subgraph WorkerLayer["Worker Layer"]
        GoogleWorker[Google Contacts Worker]
        MicrosoftWorker[Microsoft Contacts Worker]
        AppleWorker[Apple Contacts Worker]
        LinkedInWorker[LinkedIn Contacts Worker]
        PayoutWorker[Payout Worker]
    end
    
    subgraph Storage["Storage Layer"]
        Redis[(Redis<br/>Job Storage)]
        Database[(PostgreSQL<br/>Result Storage)]
    end
    
    Services -->|Add Job| QueueManager
    QueueManager --> GoogleContactsQueue
    QueueManager --> MicrosoftContactsQueue
    QueueManager --> AppleContactsQueue
    QueueManager --> LinkedInContactsQueue
    QueueManager --> PayoutQueue
    
    GoogleContactsQueue -->|Store| Redis
    MicrosoftContactsQueue -->|Store| Redis
    AppleContactsQueue -->|Store| Redis
    LinkedInContactsQueue -->|Store| Redis
    PayoutQueue -->|Store| Redis
    
    GoogleWorker -->|Poll| GoogleContactsQueue
    MicrosoftWorker -->|Poll| MicrosoftContactsQueue
    AppleWorker -->|Poll| AppleContactsQueue
    LinkedInWorker -->|Poll| LinkedInContactsQueue
    PayoutWorker -->|Poll| PayoutQueue
    
    GoogleWorker -->|Update Progress| Redis
    MicrosoftWorker -->|Update Progress| Redis
    AppleWorker -->|Update Progress| Redis
    LinkedInWorker -->|Update Progress| Redis
    PayoutWorker -->|Update Progress| Redis
    
    GoogleWorker -->|Save Results| Database
    MicrosoftWorker -->|Save Results| Database
    AppleWorker -->|Save Results| Database
    LinkedInWorker -->|Save Results| Database
    PayoutWorker -->|Save Results| Database
    
    style Application fill:#e3f2fd
    style QueueLayer fill:#f3e5f5
    style WorkerLayer fill:#e8f5e9
    style Storage fill:#ffebee
```

---

## 7. Payment Processing Architecture

Payment and payout processing architecture.

```mermaid
graph TB
    subgraph Requester["Requester Flow"]
        CreateRequest[Create Introduction Request]
        AuthorizePayment[Authorize Payment]
    end
    
    subgraph PaymentProcessing["Payment Processing"]
        CreateIntents[Create Dual PaymentIntents<br/>5% + 95%]
        AuthorizeIntents[Authorize Both Intents]
        CaptureInitial[Capture 5% on Intro Sent]
        CaptureRemaining[Capture 95% on Meeting Booked]
    end
    
    subgraph PayoutProcessing["Payout Processing"]
        CheckTrustScore{Check Trust Score}
        ImmediatePayout[Immediate Payout<br/>Trust >= 90]
        DeferredPayout[Deferred Payout<br/>Trust < 90]
        CalculateSplit[Calculate Split<br/>80% Connector<br/>20% Platform]
    end
    
    subgraph StripeIntegration["Stripe Integration"]
        StripeTransfer[Create Transfer to<br/>Connector Account]
        StripePayout[Create Payout to<br/>Bank Account]
    end
    
    subgraph Database["Database"]
        TransactionTable[(introduction_transactions)]
        PayoutTable[(payout_history)]
    end
    
    CreateRequest --> CreateIntents
    AuthorizePayment --> AuthorizeIntents
    AuthorizeIntents --> CaptureInitial
    CaptureInitial --> CaptureRemaining
    
    CaptureRemaining --> CalculateSplit
    CalculateSplit --> CheckTrustScore
    
    CheckTrustScore -->|>= 90| ImmediatePayout
    CheckTrustScore -->|< 90| DeferredPayout
    
    ImmediatePayout --> StripeTransfer
    DeferredPayout --> StripeTransfer
    
    StripeTransfer --> StripePayout
    StripePayout --> TransactionTable
    StripePayout --> PayoutTable
    
    style Requester fill:#e3f2fd
    style PaymentProcessing fill:#fff9c4
    style PayoutProcessing fill:#f3e5f5
    style StripeIntegration fill:#fff9c4
    style Database fill:#e8f5e9
```

---

## Technology Stack

### Frontend
- **Framework**: React 18+ with TypeScript
- **State Management**: React Query, Context API
- **UI Library**: Custom components with Tailwind CSS
- **HTTP Client**: Axios with interceptors
- **Build Tool**: Vite

### Backend
- **Framework**: NestJS (Node.js)
- **Language**: TypeScript
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL
- **Cache/Queue**: Redis with BullMQ
- **Authentication**: JWT with Passport

### External Services
- **Payments**: Stripe (Payments + Connect)
- **OAuth**: Google OAuth 2.0, Microsoft OAuth 2.0
- **APIs**: Google People API, Google Calendar API, Microsoft Graph API
- **AI**: Google Gemini API
- **Email**: SMTP/Email service

### Infrastructure
- **Database**: PostgreSQL with connection pooling
- **Cache**: Redis for sessions and job queues
- **File Storage**: Local/Cloud storage for uploads
- **Background Jobs**: BullMQ workers

---

## Security Architecture

```mermaid
graph TB
    subgraph SecurityLayers["Security Layers"]
        HTTPS[HTTPS/TLS Encryption]
        JWT[JWT Token Authentication]
        OAuth[OAuth 2.0 Flow]
        RateLimit[Rate Limiting]
        InputValidation[Input Validation]
        SQLInjection[SQL Injection Prevention]
        XSS[XSS Prevention]
        CSRF[CSRF Protection]
        Encryption[Data Encryption at Rest]
    end
    
    HTTPS --> JWT
    JWT --> OAuth
    OAuth --> RateLimit
    RateLimit --> InputValidation
    InputValidation --> SQLInjection
    SQLInjection --> XSS
    XSS --> CSRF
    CSRF --> Encryption
    
    style SecurityLayers fill:#ffebee
```

---

*Last Updated: January 2025*
