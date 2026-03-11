/**
 * Shared prop and result types for all SocialEyes AI macros.
 */

// ─────────────────────────────────────────────
// Shared sub-shapes (mirrors GraphQL types)
// ─────────────────────────────────────────────

export interface SocialPostAuthorResult {
  id: string;
  username: string;
  name?: string;
  avatar?: string;
}

export interface SocialPostMetricsResult {
  likes: number;
  shares: number;
  comments: number;
  views?: number;
}

export interface SocialPostResult {
  id: string;
  platform: string;
  sourceId: string;
  url?: string;
  author: SocialPostAuthorResult;
  content: string;
  hashtags?: string[];
  mentions?: string[];
  media?: string[];
  metrics?: SocialPostMetricsResult;
  sentiment?: number;
  publishedAt: string;
  collectedAt: string;
}

export interface SocialMessageParticipantResult {
  id: string;
  username: string;
  name?: string;
}

export interface SocialMessageResult {
  id: string;
  platform: string;
  sourceId: string;
  conversationId: string;
  from: SocialMessageParticipantResult;
  to: SocialMessageParticipantResult[];
  content: string;
  isIncoming: boolean;
  readAt?: string;
  sentAt: string;
}

export interface SocialAccountResult {
  id: string;
  provider: string;
  providerAccountId: string;
  name: string;
  email?: string;
  avatar?: string;
  profileUrl?: string;
  isActive: boolean;
  scopes?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SocialListenerResult {
  id: string;
  name: string;
  platform: string;
  type: string;
  query: string;
  intervalMinutes: number;
  isActive: boolean;
  lastRun?: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
}

export interface PagingResult {
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
}

// ─────────────────────────────────────────────
// Generic macro result wrapper
// ─────────────────────────────────────────────

export interface SocialEyesMacroResult<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
  tool: string;
  params: unknown;
  instructions?: string;
}

// ─────────────────────────────────────────────
// Account props
// ─────────────────────────────────────────────

export interface ListAccountsProps {
  /** Optional platform filter: x | reddit | facebook | instagram */
  platform?: string;
  /** Optional active-status filter */
  isActive?: boolean;
  /** Optional name/email search */
  search?: string;
}

export interface GetAccountProps {
  /** MongoDB ID of the account */
  id: string;
}

export interface ConnectAccountProps {
  platform: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiry?: string;
  providerAccountId: string;
  name: string;
  email?: string;
  avatar?: string;
  scopes?: string[];
}

export interface DisconnectAccountProps {
  /** MongoDB ID of the account to disconnect */
  id: string;
}

export interface LookupAccountProps {
  /** Platform to search on */
  platform: string;
  /** Username / handle (without leading @ or u/) */
  username?: string;
  /** Platform-specific user ID */
  userId?: string;
  /** Optional bearer token for the lookup */
  accessToken?: string;
}

// ─────────────────────────────────────────────
// Listener props
// ─────────────────────────────────────────────

export interface ListListenersProps {
  platform?: string;
  type?: string;
  isActive?: boolean;
}

export interface GetListenerProps {
  id: string;
}

export interface CreateListenerProps {
  name: string;
  platform: string;
  type: string;
  query: string;
  intervalMinutes?: number;
  actions?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateListenerProps {
  id: string;
  name?: string;
  platform?: string;
  type?: string;
  query?: string;
  intervalMinutes?: number;
  actions?: string[];
  metadata?: Record<string, unknown>;
}

export interface DeleteListenerProps {
  id: string;
}

export interface ToggleListenerProps {
  id: string;
  isActive: boolean;
}

// ─────────────────────────────────────────────
// Feed props
// ─────────────────────────────────────────────

export interface GetFeedProps {
  platform?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  listenerId?: string;
  page?: number;
  pageSize?: number;
}

// ─────────────────────────────────────────────
// Messaging props
// ─────────────────────────────────────────────

export interface GetInboxProps {
  page?: number;
  pageSize?: number;
}

export interface GetConversationProps {
  conversationId: string;
  page?: number;
  pageSize?: number;
}

export interface SendMessageProps {
  accountId: string;
  to: string;
  content: string;
}

export interface ReplyToMessageProps {
  messageId: string;
  content: string;
}

export interface MarkMessageReadProps {
  id: string;
}

export interface SyncInboxProps {
  accountId: string;
}
