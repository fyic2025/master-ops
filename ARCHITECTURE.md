# Master-Ops Architecture Documentation

**Last Updated**: 2025-11-20

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagrams](#architecture-diagrams)
3. [Component Details](#component-details)
4. [Data Flow](#data-flow)
5. [Integration Patterns](#integration-patterns)
6. [Security Architecture](#security-architecture)
7. [Deployment Architecture](#deployment-architecture)

---

## System Overview

Master-Ops is a centralized operations platform managing 4 businesses with shared infrastructure, integrations, and automation workflows.

### Core Principles

- **Single Source of Truth**: Supabase as primary data store
- **Automation First**: n8n workflows for business processes
- **Type Safety**: TypeScript throughout
- **Observability**: Centralized logging and monitoring
- **Reusability**: Shared libraries and components

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Database** | Supabase (PostgreSQL) | Primary data store, auth, real-time |
| **Automation** | n8n | Workflow orchestration |
| **CRM** | HubSpot | Customer relationship management |
| **Inventory** | Unleashed | Inventory management |
| **Runtime** | Node.js + TypeScript | Application logic |
| **CLI** | Commander.js | Developer tooling |
| **Monitoring** | Custom (Supabase-based) | Logging and health checks |

---

## Architecture Diagrams

### High-Level System Architecture

```mermaid
graph TB
    subgraph "External Services"
        HS[HubSpot CRM]
        UL[Unleashed Inventory]
        EMAIL[Email Services]
    end

    subgraph "Master-Ops Platform"
        subgraph "Automation Layer"
            N8N[n8n Workflows]
        end

        subgraph "Application Layer"
            CLI[ops-cli]
            SCRIPTS[Scripts & Tools]
            LIBS[Shared Libraries]
        end

        subgraph "Integration Layer"
            INT_HS[HubSpot Connector]
            INT_UL[Unleashed Connector]
            INT_N8N[n8n Connector]
            INT_SB[Supabase Connector]
        end

        subgraph "Infrastructure Layer"
            SB[(Supabase Database)]
            LOGS[Integration Logs]
            METRICS[API Metrics]
        end
    end

    subgraph "Businesses"
        BIZ1[Teelixir]
        BIZ2[Elevate Wholesale]
        BIZ3[Buy Organics Online]
        BIZ4[Red Hill Fresh]
    end

    %% External connections
    N8N <--> HS
    N8N <--> UL
    N8N <--> EMAIL

    %% Internal connections
    CLI --> INT_HS
    CLI --> INT_SB
    SCRIPTS --> INT_HS
    SCRIPTS --> INT_UL
    SCRIPTS --> INT_N8N

    INT_HS --> HS
    INT_UL --> UL
    INT_N8N --> N8N
    INT_SB --> SB

    LIBS --> INT_HS
    LIBS --> INT_UL
    LIBS --> INT_N8N
    LIBS --> INT_SB

    %% Data storage
    INT_SB --> LOGS
    INT_SB --> METRICS
    N8N --> SB

    %% Business connections
    BIZ1 --> N8N
    BIZ2 --> N8N
    BIZ3 --> N8N
    BIZ4 --> N8N
```

### Data Flow Architecture

```mermaid
flowchart LR
    subgraph "Data Sources"
        WEB[Website Orders]
        INV[Inventory System]
        CRM[CRM Data]
    end

    subgraph "Ingestion"
        WH[Webhooks]
        API[API Polling]
        MAN[Manual Triggers]
    end

    subgraph "Processing"
        N8N[n8n Workflows]
        TRANS[Data Transformation]
        VAL[Validation]
    end

    subgraph "Storage"
        SB[(Supabase)]
        CACHE[Cache Layer]
    end

    subgraph "Outputs"
        HS[HubSpot Sync]
        RPT[Reports]
        ALERT[Alerts]
    end

    WEB --> WH
    INV --> API
    CRM --> API

    WH --> N8N
    API --> N8N
    MAN --> N8N

    N8N --> TRANS
    TRANS --> VAL
    VAL --> SB
    VAL --> CACHE

    SB --> HS
    SB --> RPT
    SB --> ALERT
```

### Integration Layer Architecture

```mermaid
graph TB
    subgraph "Application Code"
        APP[Application Logic]
    end

    subgraph "Integration Layer"
        BC[BaseConnector]

        subgraph "Core Infrastructure"
            LOGGER[Logger]
            RATE[Rate Limiter]
            RETRY[Retry Handler]
            ERROR[Error Handler]
        end

        subgraph "Service Connectors"
            HS_CONN[HubSpot Connector]
            UL_CONN[Unleashed Connector]
            N8N_CONN[n8n Connector]
            SB_CONN[Supabase Connector]
        end
    end

    subgraph "External APIs"
        HS_API[HubSpot API]
        UL_API[Unleashed API]
        N8N_API[n8n API]
    end

    subgraph "Observability"
        LOGS[(Integration Logs)]
        METRICS[(API Metrics)]
    end

    APP --> HS_CONN
    APP --> UL_CONN
    APP --> N8N_CONN

    HS_CONN -.extends.-> BC
    UL_CONN -.extends.-> BC
    N8N_CONN -.extends.-> BC

    BC --> LOGGER
    BC --> RATE
    BC --> RETRY
    BC --> ERROR

    HS_CONN --> HS_API
    UL_CONN --> UL_API
    N8N_CONN --> N8N_API

    LOGGER --> LOGS
    BC --> METRICS
```

### Workflow Orchestration

```mermaid
sequenceDiagram
    participant T as Trigger
    participant N as n8n Workflow
    participant API as Integration Layer
    participant SB as Supabase
    participant EXT as External Service

    T->>N: Event occurs
    activate N

    N->>API: Request operation
    activate API

    API->>API: Rate limiting check
    API->>API: Acquire token

    API->>EXT: API call
    activate EXT

    alt Success
        EXT-->>API: Response data
        API->>SB: Log success
        API-->>N: Return data
        N->>SB: Store results
        N-->>T: Success
    else Retryable Error
        EXT-->>API: Error response
        API->>API: Retry with backoff
        API->>EXT: Retry API call
        EXT-->>API: Response
        API->>SB: Log retry
        API-->>N: Return data
    else Non-retryable Error
        EXT-->>API: Error response
        API->>SB: Log error
        API-->>N: Throw error
        N->>SB: Log failure
        N->>N: Error workflow
        N-->>T: Error notification
    end

    deactivate EXT
    deactivate API
    deactivate N
```

---

## Component Details

### 1. Integration Layer (`shared/libs/integrations/`)

Provides reusable, type-safe connectors for all external services.

**Components:**
- **BaseConnector**: Abstract class with rate limiting, retry logic, error handling
- **Rate Limiter**: Token bucket algorithm for API rate limiting
- **Retry Handler**: Exponential backoff retry mechanism
- **Error Handler**: Standardized error formatting and categorization
- **Logger**: Centralized logging with Supabase persistence

**Service Connectors:**
- `hubspot/client.ts` - HubSpot CRM integration
- `unleashed/client.ts` - Unleashed inventory (planned)
- `n8n/client.ts` - n8n workflow management (planned)
- `supabase/client.ts` - Supabase wrapper (exists in `infra/`)

### 2. Automation Layer (n8n)

Located in `infra/n8n-workflows/`

**Workflow Types:**
- **Data Sync**: Business → HubSpot, Inventory → Supabase
- **Order Processing**: Order creation, fulfillment tracking
- **Monitoring**: Health checks, error notifications
- **Reporting**: Scheduled reports, data exports

### 3. Data Layer (Supabase)

**Tables:**
- `tasks` - AI task tracking
- `task_logs` - Task execution logs
- `integration_logs` - Integration activity logs
- `workflow_execution_logs` - Workflow metrics
- `api_metrics` - API performance tracking

**Views:**
- `integration_health_summary` - Service health aggregation
- `workflow_performance_summary` - Workflow statistics
- `recent_errors` - Recent error logs
- `recent_workflow_failures` - Failed workflow executions

### 4. CLI Tools (`tools/`)

**ops-cli** - Main CLI interface:
- Health checks
- Log querying
- Database operations
- Statistics and reporting
- Workflow monitoring

**Health Checks** - Standalone monitoring:
- Service connectivity tests
- Response time tracking
- Automated alerting

### 5. Scripts (`scripts/`)

Organized by function:
- `tests/` - Integration tests
- `fixes/` - Data correction scripts
- `workflows/` - Workflow management
- `analysis/` - Diagnostic tools
- `sync/` - Data synchronization
- `auth/` - Authentication utilities

---

## Data Flow

### Business Data Sync Flow

```mermaid
flowchart TD
    START([Business Event]) --> WEBHOOK{Event Type}

    WEBHOOK -->|New Order| N8N_ORDER[n8n Order Workflow]
    WEBHOOK -->|Inventory Update| N8N_INV[n8n Inventory Workflow]
    WEBHOOK -->|Customer Update| N8N_CUST[n8n Customer Workflow]

    N8N_ORDER --> VALIDATE[Validate Data]
    N8N_INV --> VALIDATE
    N8N_CUST --> VALIDATE

    VALIDATE -->|Valid| TRANSFORM[Transform Data]
    VALIDATE -->|Invalid| ERROR_LOG[Log Error]

    TRANSFORM --> SB_WRITE[Write to Supabase]

    SB_WRITE --> SYNC_HS{Sync to HubSpot?}

    SYNC_HS -->|Yes| HS_API[HubSpot API Call]
    SYNC_HS -->|No| COMPLETE

    HS_API -->|Success| LOG_SUCCESS[Log Success]
    HS_API -->|Error| RETRY{Retryable?}

    RETRY -->|Yes| BACKOFF[Exponential Backoff]
    BACKOFF --> HS_API
    RETRY -->|No| ERROR_LOG

    LOG_SUCCESS --> COMPLETE([Complete])
    ERROR_LOG --> NOTIFY[Send Alert]
    NOTIFY --> COMPLETE
```

### Health Check Flow

```mermaid
flowchart LR
    CRON[Cron Trigger] --> HC[Health Check Script]

    HC --> CHECK_SB[Check Supabase]
    HC --> CHECK_HS[Check HubSpot]
    HC --> CHECK_N8N[Check n8n]

    CHECK_SB --> SB_RESULT{Healthy?}
    CHECK_HS --> HS_RESULT{Healthy?}
    CHECK_N8N --> N8N_RESULT{Healthy?}

    SB_RESULT -->|Yes| LOG_SB_OK[Log Success]
    SB_RESULT -->|No| LOG_SB_ERR[Log Error]

    HS_RESULT -->|Yes| LOG_HS_OK[Log Success]
    HS_RESULT -->|No| LOG_HS_ERR[Log Error]

    N8N_RESULT -->|Yes| LOG_N8N_OK[Log Success]
    N8N_RESULT -->|No| LOG_N8N_ERR[Log Error]

    LOG_SB_OK --> PERSIST[Persist to Supabase]
    LOG_HS_OK --> PERSIST
    LOG_N8N_OK --> PERSIST

    LOG_SB_ERR --> PERSIST
    LOG_HS_ERR --> PERSIST
    LOG_N8N_ERR --> PERSIST

    PERSIST --> SUMMARY[Generate Summary]
    SUMMARY --> ALERT{Any Failures?}

    ALERT -->|Yes| NOTIFY[Send Alert]
    ALERT -->|No| COMPLETE([Complete])

    NOTIFY --> COMPLETE
```

---

## Integration Patterns

### 1. Rate Limiting Pattern

All connectors implement token bucket rate limiting:

```typescript
// Configured per service
const hubspotClient = new HubSpotConnector({
  rateLimiter: {
    maxRequests: 100,  // Max requests
    windowMs: 10000,   // Per 10 seconds
  }
})
```

### 2. Retry Pattern

Exponential backoff with configurable retries:

```typescript
// Automatic retry on transient errors
const retry = new RetryHandler({
  maxRetries: 3,
  initialDelay: 1000,
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504]
})
```

### 3. Circuit Breaker Pattern

(Planned) Prevent cascading failures:

```typescript
// Future implementation
if (errorRate > threshold) {
  circuitBreaker.open()
  // Fail fast for period
}
```

### 4. Batch Processing Pattern

Process large datasets with concurrency control:

```typescript
const results = await connector.batchExecute(
  items,
  'processItem',
  async (item) => await process(item),
  { concurrency: 5, continueOnError: true }
)
```

---

## Security Architecture

### Authentication & Authorization

```mermaid
graph LR
    subgraph "Access Control"
        USER[User/System]
        ENV[Environment Variables]
        SECRETS[Secrets Manager]
    end

    subgraph "Services"
        SB[Supabase]
        HS[HubSpot]
        N8N[n8n]
    end

    ENV --> SB_KEY[Service Role Key]
    ENV --> HS_KEY[Access Token]
    ENV --> N8N_KEY[API Key]

    SECRETS -.future.-> ENV

    USER --> ENV
    SB_KEY --> SB
    HS_KEY --> HS
    N8N_KEY --> N8N

    SB --> RLS[Row Level Security]
    SB --> AUDIT[Audit Logs]
```

### Security Layers

1. **Network Security**
   - HTTPS only for all API calls
   - API keys in environment variables
   - No credentials in code

2. **Data Security**
   - Row Level Security (RLS) in Supabase
   - Service role key for server-side only
   - Audit logging for all data changes

3. **Access Control**
   - API key rotation (manual, automation planned)
   - Least privilege principle
   - Service-specific credentials

4. **Secrets Management**
   - Environment variables (`.env` gitignored)
   - Future: Vault integration for production

---

## Deployment Architecture

### Current State

```mermaid
graph TB
    subgraph "Development"
        DEV_LOCAL[Local Development]
        DEV_ENV[.env file]
    end

    subgraph "Hosted Services"
        SB_CLOUD[Supabase Cloud]
        N8N_CLOUD[n8n Cloud]
        HS_CLOUD[HubSpot]
    end

    DEV_LOCAL --> DEV_ENV
    DEV_ENV --> SB_CLOUD
    DEV_ENV --> N8N_CLOUD
    DEV_ENV --> HS_CLOUD
```

### Planned State

```mermaid
graph TB
    subgraph "Development"
        DEV[Local Dev]
        DOCKER[Docker Compose]
    end

    subgraph "CI/CD"
        GH[GitHub Actions]
        TESTS[Automated Tests]
    end

    subgraph "Staging"
        STAGE_APP[Application]
        STAGE_SB[Supabase Staging]
    end

    subgraph "Production"
        PROD_APP[Application]
        PROD_SB[Supabase Production]
        PROD_N8N[n8n Production]
    end

    DEV --> DOCKER
    DEV --> GH
    GH --> TESTS
    TESTS --> STAGE_APP
    STAGE_APP --> STAGE_SB
    STAGE_APP -.promote.-> PROD_APP
    PROD_APP --> PROD_SB
    PROD_APP --> PROD_N8N
```

---

## Future Enhancements

### Phase 1 (Current)
- ✅ Integration layer with rate limiting
- ✅ Centralized logging
- ✅ Health monitoring
- ✅ CLI tooling

### Phase 2 (Next)
- [ ] Complete all service connectors
- [ ] Enhanced n8n workflow library
- [ ] Automated testing suite
- [ ] Docker Compose dev environment

### Phase 3 (Future)
- [ ] API gateway
- [ ] GraphQL layer
- [ ] Real-time dashboards
- [ ] Advanced analytics
- [ ] Secrets rotation automation

### Phase 4 (Long-term)
- [ ] Multi-region deployment
- [ ] Advanced caching
- [ ] Message queue (Bull/Redis)
- [ ] Event sourcing
- [ ] CQRS pattern

---

## Appendix

### File Structure

```
master-ops/
├── infra/                      # Infrastructure
│   ├── supabase/              # Database schemas
│   ├── n8n-workflows/         # Workflow definitions
│   └── config/                # Service configurations
├── shared/                     # Shared resources
│   ├── libs/                  # Shared libraries
│   │   ├── logger.ts          # Centralized logging
│   │   └── integrations/      # Integration layer
│   │       ├── base/          # Base connectors
│   │       ├── hubspot/       # HubSpot connector
│   │       ├── unleashed/     # Unleashed connector
│   │       └── n8n/           # n8n connector
│   ├── prompts/               # AI prompts
│   └── specs/                 # Specifications
├── scripts/                    # Operational scripts
│   ├── tests/                 # Test scripts
│   ├── fixes/                 # Fix scripts
│   ├── workflows/             # Workflow scripts
│   ├── sync/                  # Sync scripts
│   └── auth/                  # Auth scripts
├── tools/                      # CLI tools
│   ├── ops-cli/               # Main CLI
│   └── health-checks/         # Health monitoring
├── teelixir/                   # Business: Teelixir
├── elevate-wholesale/          # Business: Elevate
├── buy-organics-online/        # Business: BOO
└── red-hill-fresh/             # Business: RHF
```

### Key Technologies

- **Runtime**: Node.js 18+, TypeScript 5.3+
- **Database**: Supabase (PostgreSQL 15+)
- **Automation**: n8n
- **Testing**: Vitest
- **CLI**: Commander.js
- **HTTP Client**: Native fetch API

---

**Document Version**: 1.0
**Last Updated**: 2025-11-20
**Maintained by**: Claude Code
