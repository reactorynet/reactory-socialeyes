import { queryGraph, mutateGraph } from '@reactory/server-core/graph/ReactoryApolloClient';
import { ChatState, Macro, MacroComponentDefinition } from '@reactory/server-modules/reactory-reactor/ai/openai/types/chat';
import logger from '@reactory/server-core/logging';
import {
  ListAccountsProps,
  GetAccountProps,
  ConnectAccountProps,
  DisconnectAccountProps,
  LookupAccountProps,
  SocialAccountResult,
  SocialEyesMacroResult,
} from '../types';

// ─────────────────────────────────────────────
// Credential redaction
// ─────────────────────────────────────────────

/**
 * Placeholder substituted for any value that must not leave this macro layer.
 */
const REDACTED_VALUE = '[REDACTED]';

/**
 * Shortest secret value worth scanning for in free text.
 *
 * This is a deliberate trade-off. Value-scrubbing is a substring replace over
 * every string in a result, so a short or low-entropy needle mangles legitimate
 * data (`accessToken: 'read'` would redact the granted scopes list). Real OAuth
 * tokens are far longer than this, so a higher floor costs nothing in practice.
 *
 * Credential *fields* are still masked by key at any length — this floor only
 * governs the defence-in-depth scrub of values echoed into other strings.
 */
const MIN_SCRUB_SECRET_LENGTH = 12;

/**
 * Property names that carry credentials.
 *
 * `tokenExpiry` is matched deliberately: the expiry of a live OAuth token is
 * token metadata, not account data, and the caller has no legitimate use for it.
 *
 * `auth` and `scope` are special-cased exactly (not by pattern) because they are
 * the provider shapes that can carry a token blob, while `scopes` — the granted
 * scope list — must stay visible and useful.
 */
const SENSITIVE_KEY_PATTERN =
  /(token|secret|password|passphrase|credential|authorization|bearer|api[-_]?key|oauth|private[-_]?key)/i;

function isSensitiveKey(key: string): boolean {
  const normalisedKey = key.toLowerCase();
  return normalisedKey === 'auth' || normalisedKey === 'scope' || SENSITIVE_KEY_PATTERN.test(key);
}

const REGEXP_SPECIAL_CHARACTERS = '\\^$.*+?()[]{}|';

function escapeRegExp(value: string): string {
  let escaped = '';
  for (const character of value) {
    escaped += REGEXP_SPECIAL_CHARACTERS.includes(character) ? `\\${character}` : character;
  }
  return escaped;
}

/**
 * Deep-copies `value`, replacing anything credential-bearing with a placeholder.
 *
 * `ancestors` holds only the objects on the *current* path, so genuine cycles
 * (including self-referencing arrays) terminate, while shared acyclic references
 * are still copied in full rather than being mistaken for a cycle.
 */
function redactValue(value: unknown, ancestors: WeakSet<object>): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return value.toISOString();
  if (ancestors.has(value as object)) return REDACTED_VALUE;

  ancestors.add(value as object);
  try {
    if (Array.isArray(value)) return value.map((entry) => redactValue(entry, ancestors));

    const redacted: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      // defineProperty rather than assignment so a literal `__proto__` key becomes
      // an own enumerable property instead of rewriting the result's prototype.
      Object.defineProperty(redacted, key, {
        value: isSensitiveKey(key) ? REDACTED_VALUE : redactValue(entry, ancestors),
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
    return redacted;
  } finally {
    ancestors.delete(value as object);
  }
}

/**
 * Returns a redacted deep copy of `value`, safe to place in a tool result.
 *
 * Use this for everything a macro hands back — the echoed `params`, the `data`
 * payload, and any nested object. OAuth material (accessToken, refreshToken,
 * tokenExpiry, provider auth/scope blobs, private keys) is masked; ordinary
 * fields such as platform, providerAccountId, name, email, avatar and scopes are
 * preserved so results stay debuggable.
 *
 * Every return path in this file — success, validation failure and thrown
 * error — must go through this instead of echoing `props` or `data` verbatim.
 */
export function redactSecrets<T>(value: T): T {
  return redactValue(value, new WeakSet<object>()) as T;
}

/**
 * Collects the credential values carried by an object so they can be scrubbed
 * out of free text (error messages, instruction strings, log lines).
 */
function secretValuesFrom(source: unknown, depth = 0): string[] {
  // Bounded so a pathological payload cannot make the needle scan expensive; a
  // credential nested this deep is not a shape these macros produce.
  if (depth > 4 || source === null || typeof source !== 'object') return [];

  const secrets: string[] = [];
  for (const [key, entry] of Object.entries(source as Record<string, unknown>)) {
    if (typeof entry === 'string') {
      // `tokenExpiry` is masked in results but is not a secret value: scrubbing an
      // ISO timestamp out of a message would mangle unrelated diagnostics.
      if (isSensitiveKey(key) && !/expir/i.test(key)) secrets.push(entry);
    } else {
      secrets.push(...secretValuesFrom(entry, depth + 1));
    }
  }
  return secrets;
}

/**
 * URL-encodes a secret so its encoded form can be scrubbed too. Returns null when
 * the value cannot be encoded — a lone surrogate, which a model-supplied or
 * corrupted token can legitimately contain — so the caller falls back to
 * scrubbing the raw form only instead of throwing out of an error handler.
 */
function encodeVariant(value: string): string | null {
  try {
    return encodeURIComponent(value);
  } catch {
    return null;
  }
}

/**
 * Strips secret values out of free text. Upstream GraphQL/adapter errors
 * sometimes echo the credential they rejected, and those messages travel to the
 * model, the persisted conversation and the log files.
 *
 * Matching is case-insensitive and covers both the raw value and its
 * URL-encoded form, because a token sent as a query parameter arrives encoded.
 */
export function scrubSecretValues(text: unknown, secrets: Array<string | undefined>): string {
  if (typeof text !== 'string') return '';

  let scrubbed = text;
  for (const secret of secrets) {
    if (typeof secret !== 'string' || secret.length < MIN_SCRUB_SECRET_LENGTH) continue;

    for (const variant of new Set([secret, encodeVariant(secret)])) {
      if (!variant) continue;
      scrubbed = scrubbed.replace(new RegExp(escapeRegExp(variant), 'gi'), REDACTED_VALUE);
    }
  }
  return scrubbed;
}

/**
 * Normalises anything that can be thrown into a message string, so an error
 * handler cannot itself fail on a non-Error rejection.
 */
function errorMessageOf(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error !== null && typeof error === 'object') {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return error === undefined || error === null ? 'Unknown error' : String(error);
}

/**
 * Builds a structured, scrubbed, log-safe rendering of an error.
 *
 * The message and stack are scrubbed, and the detail Apollo attaches
 * (`graphQLErrors`, `networkError`) is serialised and scrubbed rather than
 * dropped — that is where the actionable auth failure text lives.
 */
function scrubErrorForLog(
  error: unknown,
  secrets: Array<string | undefined>,
): Record<string, unknown> {
  const entry: Record<string, unknown> = {
    name: error instanceof Error ? error.name : typeof error,
    message: scrubSecretValues(errorMessageOf(error), secrets),
  };

  if (error instanceof Error && typeof error.stack === 'string') {
    entry.stack = scrubSecretValues(error.stack, secrets);
  }

  const detail = error as { graphQLErrors?: unknown; networkError?: unknown } | null;
  for (const key of ['graphQLErrors', 'networkError'] as const) {
    const value = detail?.[key];
    if (value === undefined) continue;
    let serialised: string;
    try {
      serialised = JSON.stringify(value) ?? String(value);
    } catch {
      serialised = String(value);
    }
    entry[key] = scrubSecretValues(serialised, secrets);
  }

  return entry;
}

/**
 * Final guard for any prose a macro returns.
 *
 * Instructions are built from the already-redacted payload, so credential *keys*
 * are gone; this additionally scrubs credential *values* from every source in
 * play (the caller's props and the server payload) in case one was echoed into a
 * display field.
 */
function safeInstructions(text: string, ...sources: unknown[]): string {
  return scrubSecretValues(
    text,
    sources.flatMap((source) => secretValuesFrom(source)),
  );
}

/**
 * Replaces secret values in every string inside `value`, recursively.
 *
 * Key-based redaction cannot catch a credential the server echoed back into an
 * ordinary display field, so payloads go through this as well.
 */
function scrubDeepValues(value: unknown, secrets: string[], ancestors: WeakSet<object>): unknown {
  if (typeof value === 'string') return scrubSecretValues(value, secrets);
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return value.toISOString();
  if (ancestors.has(value as object)) return REDACTED_VALUE;

  ancestors.add(value as object);
  try {
    if (Array.isArray(value)) {
      return value.map((entry) => scrubDeepValues(entry, secrets, ancestors));
    }

    const scrubbed: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      Object.defineProperty(scrubbed, key, {
        value: scrubDeepValues(entry, secrets, ancestors),
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
    return scrubbed;
  } finally {
    ancestors.delete(value as object);
  }
}

/**
 * Prepares a payload for the tool result: credential keys masked, then any
 * credential values from the given sources scrubbed out of every string field.
 */
function safePayload<T>(value: T, ...sources: unknown[]): T {
  const secrets = sources.flatMap((source) => secretValuesFrom(source));
  return scrubDeepValues(value, secrets, new WeakSet<object>()) as T;
}

// ─────────────────────────────────────────────
// Shared GQL fragments
// ─────────────────────────────────────────────

const ACCOUNT_FIELDS = `
  id
  provider
  providerAccountId
  name
  email
  avatar
  profileUrl
  isActive
  scopes
  createdAt
  updatedAt
`;

// ─────────────────────────────────────────────
// LIST ACCOUNTS
// ─────────────────────────────────────────────

const LIST_ACCOUNTS_QUERY = `
  query SocialEyesAccounts($filter: SocialEyesAccountFilter) {
    socialEyesAccounts(filter: $filter) {
      ${ACCOUNT_FIELDS}
    }
  }
`;

export const ListAccounts: Macro<SocialEyesMacroResult<SocialAccountResult[]>, ListAccountsProps> = async (
  props: ListAccountsProps,
  state: ChatState,
): Promise<SocialEyesMacroResult<SocialAccountResult[]>> => {
  const startTime = Date.now();
  const { platform, isActive, search } = props;

  try {
    const filter: Record<string, unknown> = {};
    if (platform) filter.platform = platform;
    if (isActive !== undefined) filter.isActive = isActive;
    if (search) filter.search = search;

    const result = await queryGraph(LIST_ACCOUNTS_QUERY, { filter: Object.keys(filter).length ? filter : undefined }, {}, state.context);
    const accounts: SocialAccountResult[] = result?.socialEyesAccounts ?? [];
    const ms = Date.now() - startTime;

    logger.info(`socialEyesListAccounts: returned ${accounts.length} accounts in ${ms}ms`);

    return {
      success: true,
      // Only `props` is a usable needle source here: a token echoed into a row's
      // display field is not derivable from any key, so passing `accounts` would
      // add a traversal without adding coverage.
      data: safePayload(redactSecrets(accounts), props),
      tool: 'socialEyesAccounts',
      params: redactSecrets(props),
      instructions: `
## Connected Social Accounts (${accounts.length})

Retrieved ${accounts.length} social media account(s) in ${ms}ms.
${accounts.length === 0 ? 'No accounts are currently connected. Use socialEyesConnectAccount to link a platform.' : ''}

For each account: id, provider, name, isActive, scopes, and createdAt are available.
Use id to reference accounts in listener creation, messaging, and sync operations.
`,
    };
  } catch (error) {
    const secrets = secretValuesFrom(props);
    logger.error('socialEyesListAccounts error', scrubErrorForLog(error, secrets));
    return {
      success: false,
      error: scrubSecretValues(errorMessageOf(error), secrets),
      tool: 'socialEyesAccounts',
      params: redactSecrets(props),
    };
  }
};

export const ListAccountsRegistry: MacroComponentDefinition<typeof ListAccounts> = {
  component: ListAccounts,
  name: 'socialEyesAccounts',
  nameSpace: 'socialeyes-macros',
  version: '1.0.0',
  description: 'List all connected social media accounts for the current user with optional filters.',
  roles: ['USER'],
  stem: 'socialEyesAccounts',
  tags: ['social', 'accounts', 'list'],
  tools: [{
    type: 'function',
    function: {
      name: 'socialEyesAccounts',
      description: 'List connected social media accounts. Optionally filter by platform, active status, or name/email search.',
      parameters: {
        type: 'object',
        properties: {
          platform: { type: 'string', description: 'Filter by platform: x, reddit, facebook, or instagram' },
          isActive: { type: 'boolean', description: 'Filter by active status' },
          search: { type: 'string', description: 'Search accounts by name or email' },
        },
        required: [],
      },
    },
  }],
};

// ─────────────────────────────────────────────
// GET ACCOUNT
// ─────────────────────────────────────────────

const GET_ACCOUNT_QUERY = `
  query SocialEyesAccount($id: ID!) {
    socialEyesAccount(id: $id) {
      ${ACCOUNT_FIELDS}
    }
  }
`;

export const GetAccount: Macro<SocialEyesMacroResult<SocialAccountResult | null>, GetAccountProps> = async (
  props: GetAccountProps,
  state: ChatState,
): Promise<SocialEyesMacroResult<SocialAccountResult | null>> => {
  const { id } = props;
  if (!id) return { success: false, error: 'id is required', tool: 'socialEyesAccount', params: redactSecrets(props) };

  try {
    const result = await queryGraph(GET_ACCOUNT_QUERY, { id }, {}, state.context);
    const account: SocialAccountResult | null = result?.socialEyesAccount ?? null;
    // Instructions are derived from the redacted copy: one source of truth for
    // what may leave this layer.
    const safeAccount = redactSecrets(account);
    return {
      success: true,
      data: safePayload(safeAccount, props, account),
      tool: 'socialEyesAccount',
      params: redactSecrets(props),
      instructions: safeInstructions(
        safeAccount
          ? `## Account: ${safeAccount.name} (${safeAccount.provider})\n- ID: ${safeAccount.id}\n- Active: ${safeAccount.isActive}\n- Scopes: ${safeAccount.scopes?.join(', ') ?? 'none'}`
          : `No account found with id: ${id}`,
        props,
        account,
      ),
    };
  } catch (error) {
    const secrets = secretValuesFrom(props);
    logger.error('socialEyesGetAccount error', scrubErrorForLog(error, secrets));
    return {
      success: false,
      error: scrubSecretValues(errorMessageOf(error), secrets),
      tool: 'socialEyesAccount',
      params: redactSecrets(props),
    };
  }
};

export const GetAccountRegistry: MacroComponentDefinition<typeof GetAccount> = {
  component: GetAccount,
  name: 'socialEyesAccount',
  nameSpace: 'socialeyes-macros',
  version: '1.0.0',
  description: 'Get a single connected social media account by its ID.',
  roles: ['USER'],
  stem: 'socialEyesAccount',
  tags: ['social', 'account', 'get'],
  tools: [{
    type: 'function',
    function: {
      name: 'socialEyesAccount',
      description: 'Get a specific connected social media account by its MongoDB ID.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The account ID to retrieve' },
        },
        required: ['id'],
      },
    },
  }],
};

// ─────────────────────────────────────────────
// CONNECT ACCOUNT
// ─────────────────────────────────────────────

const CONNECT_ACCOUNT_MUTATION = `
  mutation SocialEyesConnectAccount($input: SocialEyesConnectAccountInput!) {
    socialEyesConnectAccount(input: $input) {
      ${ACCOUNT_FIELDS}
    }
  }
`;

export const ConnectAccount: Macro<SocialEyesMacroResult<SocialAccountResult>, ConnectAccountProps> = async (
  props: ConnectAccountProps,
  state: ChatState,
): Promise<SocialEyesMacroResult<SocialAccountResult>> => {
  const required = ['platform', 'accessToken', 'providerAccountId', 'name'];
  for (const field of required) {
    if (!(props as any)[field]) {
      return { success: false, error: `${field} is required`, tool: 'socialEyesConnectAccount', params: redactSecrets(props) };
    }
  }

  try {
    const result = await mutateGraph(CONNECT_ACCOUNT_MUTATION, { input: props }, {}, state.context);
    const account: SocialAccountResult = result?.socialEyesConnectAccount;
    logger.info(`socialEyesConnectAccount: connected ${props.platform} account ${account?.id}`);
    const safeAccount = redactSecrets(account);
    return {
      success: true,
      data: safePayload(safeAccount, props, account),
      tool: 'socialEyesConnectAccount',
      params: redactSecrets(props),
      instructions: safeInstructions(
        `## Account Connected\nSuccessfully connected ${safeAccount.provider} account **${safeAccount.name}** (ID: ${safeAccount.id}).`,
        props,
        account,
      ),
    };
  } catch (error) {
    const secrets = secretValuesFrom(props);
    logger.error('socialEyesConnectAccount error', scrubErrorForLog(error, secrets));
    return {
      success: false,
      error: scrubSecretValues(errorMessageOf(error), secrets),
      tool: 'socialEyesConnectAccount',
      params: redactSecrets(props),
    };
  }
};

export const ConnectAccountRegistry: MacroComponentDefinition<typeof ConnectAccount> = {
  component: ConnectAccount,
  name: 'socialEyesConnectAccount',
  nameSpace: 'socialeyes-macros',
  version: '1.0.0',
  description: 'Connect and persist a new social media account using OAuth tokens. The access and refresh tokens are consumed server-side to establish the connection and are never returned in the result.',
  roles: ['USER'],
  stem: 'socialEyesConnectAccount',
  tags: ['social', 'account', 'connect', 'oauth'],
  tools: [{
    type: 'function',
    function: {
      name: 'socialEyesConnectAccount',
      description: 'Connect a new social media account using OAuth tokens. Tokens are write-only: they are consumed to establish and store the connection and are never echoed back in the tool result (only redacted metadata is returned).',
      parameters: {
        type: 'object',
        properties: {
          platform: { type: 'string', description: 'Platform: x or reddit' },
          accessToken: { type: 'string', description: 'OAuth access token. Write-only: consumed to establish the connection, never returned.' },
          refreshToken: { type: 'string', description: 'OAuth refresh token (optional). Write-only: consumed to establish the connection, never returned.' },
          tokenExpiry: { type: 'string', description: 'ISO token expiry date (optional). Never returned.' },
          providerAccountId: { type: 'string', description: 'Platform-specific account ID' },
          name: { type: 'string', description: 'Display name or handle' },
          email: { type: 'string', description: 'Email address (optional)' },
          avatar: { type: 'string', description: 'Avatar URL (optional)' },
          scopes: { type: 'array', items: { type: 'string' }, description: 'OAuth scopes (optional)' },
        },
        required: ['platform', 'accessToken', 'providerAccountId', 'name'],
      },
    },
  }],
};

// ─────────────────────────────────────────────
// DISCONNECT ACCOUNT
// ─────────────────────────────────────────────

const DISCONNECT_ACCOUNT_MUTATION = `
  mutation SocialEyesDisconnectAccount($id: ID!) {
    socialEyesDisconnectAccount(id: $id) {
      id
      provider
      name
      isActive
    }
  }
`;

export const DisconnectAccount: Macro<SocialEyesMacroResult<{ id: string; provider: string; name: string; isActive: boolean }>, DisconnectAccountProps> = async (
  props: DisconnectAccountProps,
  state: ChatState,
) => {
  const { id } = props;
  if (!id) return { success: false, error: 'id is required', tool: 'socialEyesDisconnectAccount', params: redactSecrets(props) };

  try {
    const result = await mutateGraph(DISCONNECT_ACCOUNT_MUTATION, { id }, {}, state.context);
    const account = result?.socialEyesDisconnectAccount;
    logger.info(`socialEyesDisconnectAccount: deactivated ${id}`);
    const safeAccount = redactSecrets(account);
    return {
      success: true,
      data: safePayload(safeAccount, props, account),
      tool: 'socialEyesDisconnectAccount',
      params: redactSecrets(props),
      instructions: safeInstructions(
        `## Account Disconnected\nAccount **${safeAccount?.name}** (${safeAccount?.provider}) has been deactivated.`,
        props,
        account,
      ),
    };
  } catch (error) {
    const secrets = secretValuesFrom(props);
    logger.error('socialEyesDisconnectAccount error', scrubErrorForLog(error, secrets));
    return {
      success: false,
      error: scrubSecretValues(errorMessageOf(error), secrets),
      tool: 'socialEyesDisconnectAccount',
      params: redactSecrets(props),
    };
  }
};

export const DisconnectAccountRegistry: MacroComponentDefinition<typeof DisconnectAccount> = {
  component: DisconnectAccount,
  name: 'socialEyesDisconnectAccount',
  nameSpace: 'socialeyes-macros',
  version: '1.0.0',
  description: 'Disconnect (deactivate) a connected social media account.',
  roles: ['USER'],
  stem: 'socialEyesDisconnectAccount',
  tags: ['social', 'account', 'disconnect'],
  tools: [{
    type: 'function',
    function: {
      name: 'socialEyesDisconnectAccount',
      description: 'Deactivate a connected social media account by ID.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The account ID to disconnect' },
        },
        required: ['id'],
      },
    },
  }],
};

// ─────────────────────────────────────────────
// LOOKUP ACCOUNT
// ─────────────────────────────────────────────

const LOOKUP_ACCOUNT_QUERY = `
  query SocialEyesLookupAccount($input: SocialEyesAccountLookupInput!) {
    socialEyesLookupAccount(input: $input) {
      id
      username
      name
      avatar
      bio
      followerCount
      followingCount
      postCount
      verified
      url
    }
  }
`;

export const LookupAccount: Macro<SocialEyesMacroResult, LookupAccountProps> = async (
  props: LookupAccountProps,
  state: ChatState,
): Promise<SocialEyesMacroResult> => {
  const { platform, username, userId, accessToken } = props;
  if (!platform) return { success: false, error: 'platform is required', tool: 'socialEyesLookupAccount', params: redactSecrets(props) };
  if (!username && !userId) return { success: false, error: 'username or userId is required', tool: 'socialEyesLookupAccount', params: redactSecrets(props) };

  try {
    const input: Record<string, unknown> = { platform };
    if (username) input.username = username;
    if (userId) input.userId = userId;
    if (accessToken) input.accessToken = accessToken;

    const result = await queryGraph(LOOKUP_ACCOUNT_QUERY, { input }, {}, state.context);
    const profile = result?.socialEyesLookupAccount ?? null;
    const safeProfile = redactSecrets(profile);

    return {
      success: true,
      data: safePayload(safeProfile, props, profile),
      tool: 'socialEyesLookupAccount',
      params: redactSecrets(props),
      instructions: safeInstructions(
        safeProfile
          ? `## Profile Found: @${safeProfile.username}\n- Name: ${safeProfile.name ?? 'N/A'}\n- Followers: ${safeProfile.followerCount ?? 'N/A'}\n- Verified: ${safeProfile.verified ?? false}\n- URL: ${safeProfile.url ?? 'N/A'}\n- Bio: ${safeProfile.bio ?? 'N/A'}`
          : `No profile found for ${username ?? userId} on ${platform}.`,
        props,
        profile,
      ),
    };
  } catch (error) {
    const secrets = secretValuesFrom(props);
    logger.error('socialEyesLookupAccount error', scrubErrorForLog(error, secrets));
    return {
      success: false,
      error: scrubSecretValues(errorMessageOf(error), secrets),
      tool: 'socialEyesLookupAccount',
      params: redactSecrets(props),
    };
  }
};

export const LookupAccountRegistry: MacroComponentDefinition<typeof LookupAccount> = {
  component: LookupAccount,
  name: 'socialEyesLookupAccount',
  nameSpace: 'socialeyes-macros',
  version: '1.0.0',
  description: 'Look up a social media user by username or platform ID. Returns public profile data.',
  roles: ['USER'],
  stem: 'socialEyesLookupAccount',
  tags: ['social', 'account', 'lookup', 'search', 'profile'],  
  runat: "server",
  tools: [{
    type: 'function',
    runat: "server",
    function: {
      name: 'socialEyesLookupAccount',
      description: 'Look up a social media user profile by username or platform ID on X, Reddit, Facebook, or Instagram.',
      parameters: {
        type: 'object',
        properties: {
          platform: { type: 'string', description: 'Platform to search: x, reddit, facebook, or instagram' },
          username: { type: 'string', description: 'Handle or username to look up (without @ or u/)' },
          userId: { type: 'string', description: 'Platform-specific user ID (alternative to username)' },
          accessToken: { type: 'string', description: 'Optional access token for authenticated lookup. Write-only: never returned.' },
        },
        required: ['platform'],
      },
    },
  }],
};
