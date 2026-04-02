# reactory-socialeyes — Server Module Agent Context

## What Is This Module
Social media intelligence and integration for the Reactory server platform. Provides unified monitoring, messaging, and engagement across X (Twitter), Reddit, Facebook, and Instagram. Enables keyword/hashtag listening, direct messaging, event-driven workflows, and data normalization. Includes adapter pattern for platform-specific implementations, Mongoose models for persistence, GraphQL API, and workflow orchestration.

- **Module ID:** `reactory-socialeyes`
- **Namespace:** `socialeyes`
- **Version:** 1.0.0
- **License:** MIT
- **Dependencies:** `twitter-api-v2`, `snoowrap`, peer `@reactory/core`, `@reactory/server-core`

## Directory Structure
```
reactory-socialeyes/
  index.ts           # Module definition and exports
  adapters/
    base.ts          # Abstract adapter interface
    x/               # X (Twitter) adapter
    reddit/          # Reddit adapter
    facebook/        # Facebook adapter (stub)
    instagram/       # Instagram adapter (stub)
  services/
    SocialEyesService.ts    # Core orchestration
    ListeningService.ts     # Listener management
    MessagingService.ts     # Direct messaging
  models/
    Account.ts       # Social account credentials
    Listener.ts      # Monitoring configuration
    Post.ts          # Normalized social post data
    Message.ts       # Direct message data
  events/            # Event definitions
  workflows/         # YAML workflow definitions
  graphql/
    schema/SocialEyes.graphql    # Type definitions
    resolvers/                   # Query/mutation implementations
  cli/               # CLI commands
  docs/              # Implementation documentation
```

## Key Features
- **Multi-Platform Support:** X, Reddit with extensible adapter pattern for Facebook/Instagram
- **Social Listening:** Keyword/hashtag monitoring with polling-based execution
- **Unified Messaging:** Consolidated inbox and conversation threading
- **Event-Driven:** Publishes events to Reactory Queue for workflow triggers
- **Data Normalization:** Platform-specific data converted to unified schemas
- **GraphQL API:** Comprehensive queries/mutations for accounts, listeners, feed, messages
- **Workflows:** YAML-based orchestration for listening, sentiment analysis, messaging
- **Persistence:** Mongoose models for accounts, listeners, posts, messages

## Services Registered
| Service ID                        | Class               | Provider   |
|-----------------------------------|---------------------|------------|
| socialeyes.SocialEyesService@1.0.0 | SocialEyesService   | SocialEyes |
| socialeyes.ListeningService@1.0.0  | ListeningService    | SocialEyes |
| socialeyes.MessagingService@1.0.0  | MessagingService    | SocialEyes |

All use `serviceType: 'data'`.

## TypeScript Contracts
Key types:
- `ISocialAdapter` — Abstract adapter interface for platform implementations
- `SocialAccount` — Account credentials and metadata
- `SocialListener` — Monitoring configuration
- `SocialPost` — Normalized post data with author, content, media, metrics
- `SocialMessage` — Direct message with threading

## Utilities
- Adapter factory pattern for platform-specific implementations
- Event publishing to Reactory Queue
- Polling-based listener execution (15-60 minute intervals)
- OAuth connection management (framework in place)

## Telemetry Events
- SocialEyes.PostDetected: New matching post found
- SocialEyes.MessageReceived: New direct message received
- SocialEyes.AccountConnected: Account successfully connected
- SocialEyes.ListenerStarted/Stopped: Listener state changes

## Tests
No visible test files in the current implementation.

## Configuration
- Environment variables for platform API credentials (Twitter tokens, Reddit client secrets)
- OAuth flows for account connection
- Mongoose for data persistence
- GraphQL schema and resolvers implemented
- Workflow engine integration

## Conventions/Notes
- Adapter pattern for platform extensibility
- Async/await for all I/O operations
- @service decorator for Reactory registration
- Event-driven architecture with Queue integration
- Normalized data schemas across platforms
- Polling-based monitoring (webhooks not implemented)
- YAML workflows for orchestration

---
This file is factual context for universal agents. Do not add system prompts/persona instructions.