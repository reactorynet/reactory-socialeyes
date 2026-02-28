# Reactory SocialEyes Module

Social Media Intelligence and Integration Module for the Reactory Platform.

## Overview

The SocialEyes module enables Reactory applications to connect with, monitor, and interact with various social media platforms including X (Twitter), Reddit, Facebook, and Instagram. It provides a unified interface for social listening, direct messaging, and event-driven workflow automation.

## Features

- **Multi-Platform Support**: X, Reddit, Facebook, Instagram adapters
- **Social Listening**: Keyword monitoring, hashtag tracking, user mentions
- **Direct Messaging**: Unified inbox across platforms
- **Event-Driven**: Publishes events to Reactory Queue for workflow automation
- **Normalized Data**: Platform-agnostic data models
- **Scalable**: Polling-based and webhook-based listeners

## Installation

This module is part of the Reactory monorepo. It's automatically loaded when included in the server configuration.

## Quick Start

### 1. Connect a Social Account

```typescript
const account = await SocialAccount.create({
    provider: 'x',
    providerAccountId: 'user123',
    name: '@myhandle',
    accessToken: 'token',
    owner: userId,
    isActive: true
});
```

### 2. Create a Listener

```typescript
const listener = await SocialListener.create({
    name: 'Brand Mentions',
    platform: 'x',
    type: 'keyword',
    query: '#mybrand OR @mybrand',
    intervalMinutes: 15,
    owner: userId,
    actions: ['emit-event'],
    isActive: true
});
```

### 3. Start Monitoring

```bash
bin/cli.sh socialeyes:monitor
```

## Module Structure

```
reactory-socialeyes/
├── adapters/           # Platform-specific implementations
│   ├── base.ts        # Abstract adapter interface
│   ├── x/             # X (Twitter) adapter
│   └── reddit/        # Reddit adapter
├── services/          # Business logic
│   ├── SocialEyesService.ts
│   ├── ListeningService.ts
│   └── MessagingService.ts
├── models/            # Data models
│   ├── Account.ts
│   ├── Listener.ts
│   ├── Post.ts
│   └── Message.ts
├── events/            # Event definitions
├── cli/               # CLI commands
└── docs/              # Documentation
```

## Models

### SocialAccount
Stores connection credentials and metadata for social media accounts.

### SocialListener
Configuration for monitoring specific keywords, hashtags, or users.

### SocialPost
Normalized representation of social media posts from any platform.

### SocialMessage
Direct messages across platforms.

## Services

### SocialEyesService
Main orchestration service.

### ListeningService
Manages listener execution and event publishing.

### MessagingService
Handles direct messaging and inbox management.

## Events

The module publishes the following events to Reactory Queue:

- `SocialEyes.PostDetected` - When a listener finds a matching post
- `SocialEyes.MessageReceived` - When a DM is received
- `SocialEyes.AccountConnected` - When an account is connected

## CLI Commands

### socialeyes:monitor
Start all active listeners.

```bash
bin/cli.sh socialeyes:monitor
```

## Development Status

**Current Phase**: Phase 3-4 (Listening & Messaging)

- ✅ Phase 1: Foundation & Core Architecture
- ✅ Phase 2: Platform Integration (Skeleton)
- ✅ Phase 3: Listening & Events
- 🚧 Phase 4: Messaging & Support
- ⏳ Phase 5: Polish & Testing

See [docs/implementation_plan.md](docs/implementation_plan.md) for details.

## API Integration

Currently, the adapters contain skeleton implementations. To enable full functionality:

### X (Twitter)
1. Install `twitter-api-v2`: `yarn add twitter-api-v2`
2. Set environment variables:
   ```
   X_API_KEY=your_key
   X_API_SECRET=your_secret
   ```
3. Implement OAuth flow in XAdapter

### Reddit
1. Install `snoowrap`: `yarn add snoowrap`
2. Set environment variables:
   ```
   REDDIT_CLIENT_ID=your_id
   REDDIT_CLIENT_SECRET=your_secret
   ```
3. Implement authentication in RedditAdapter

## Next Steps

1. Implement full API integrations with actual libraries
2. Add GraphQL resolvers for client queries
3. Write unit and integration tests
4. Create UI components for configuration
5. Add more platform adapters (Instagram, Facebook, LinkedIn)

## License

Same as Reactory platform.
