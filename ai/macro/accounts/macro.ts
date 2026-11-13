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
 * Property names that carry credentials. `tokenExpiry` is included deliberately:
 * the expiry of a live OAuth token is token metadata, not account data, and the
 * caller has no legitimate use for it.
 */
const SENSITIVE_KEY_PATTERN = /(token|secret|password|passphrase|credential|authorization|bearer|api[-_]?key)/i;

function redactValue(value: unknown, seen: Set<object>): unknown {
  if (Array.isArray(value)) return value.map((entry) => redactValue(entry, seen));
  if (value instanceof Date) return value.toISOString();
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value as object)) return REDACTED_VALUE;

  seen.add(value as object);
  const redacted: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const normalisedKey = key.toLowerCase();
    // `auth` and `scope` are the provider shapes that can carry a token blob;
    // `scopes` (the granted-scope list) stays visible and useful.
    const isSensitive =
      normalisedKey === 'auth' || normalisedKey === 'scope' || SENSITIVE_KEY_PATTERN.test(key);
    redacted[key] = isSensitive ? REDACTED_VALUE : redactValue(entry, seen);
  }
  return redacted;
}

/**
 * Returns a copy of macro inputs that is safe to place in a tool result.
 *
 * OAuth material (accessToken, refreshToken, tokenExpiry, provider auth/scope
 * blobs) is masked; non-secret fields such as platform, providerAccountId,
 * name, email, avatar and scopes are preserved so results stay debuggable.
 * Every return path in this file — success, validation failure and thrown
 * error — must use this instead of echoing `props` verbatim.
 */
export function redactAccountParams<T extends object>(params: T): Record<string, unknown> {
  return redactValue(params, new Set<object>()) as Record<string, unknown>;
}

/**
 * Strips literal secret values out of free text. Upstream GraphQL/adapter errors
 * sometimes echo the credential they rejected; those messages must be scrubbed
 * before they reach the model or the persisted conversation.
 */
export function scrubSecretValues(text: string, secrets: Array<string | undefined>): string {
  let scrubbed = text;
  for (const secret of secrets) {
    if (typeof secret !== 'string' || secret.length < 4) continue;
    scrubbed = scrubbed.split(secret).join(REDACTED_VALUE);
  }
  return scrubbed;
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
      data: accounts,
      tool: 'socialEyesAccounts',
      params: redactAccountParams(props),
      instructions: `
## Connected Social Accounts (${accounts.length})

Retrieved ${accounts.length} social media account(s) in ${ms}ms.
${accounts.length === 0 ? 'No accounts are currently connected. Use socialEyesConnectAccount to link a platform.' : ''}

For each account: id, provider, name, isActive, scopes, and createdAt are available.
Use id to reference accounts in listener creation, messaging, and sync operations.
`,
    };
  } catch (error) {
    logger.error('socialEyesListAccounts error:', error);
    return { success: false, error: (error as Error).message, tool: 'socialEyesAccounts', params: redactAccountParams(props) };
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
  if (!id) return { success: false, error: 'id is required', tool: 'socialEyesAccount', params: redactAccountParams(props) };

  try {
    const result = await queryGraph(GET_ACCOUNT_QUERY, { id }, {}, state.context);
    const account: SocialAccountResult | null = result?.socialEyesAccount ?? null;
    return {
      success: true,
      data: account,
      tool: 'socialEyesAccount',
      params: redactAccountParams(props),
      instructions: account
        ? `## Account: ${account.name} (${account.provider})\n- ID: ${account.id}\n- Active: ${account.isActive}\n- Scopes: ${account.scopes?.join(', ') ?? 'none'}`
        : `No account found with id: ${id}`,
    };
  } catch (error) {
    logger.error('socialEyesGetAccount error:', error);
    return { success: false, error: (error as Error).message, tool: 'socialEyesAccount', params: redactAccountParams(props) };
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
      return { success: false, error: `${field} is required`, tool: 'socialEyesConnectAccount', params: redactAccountParams(props) };
    }
  }

  try {
    const result = await mutateGraph(CONNECT_ACCOUNT_MUTATION, { input: props }, {}, state.context);
    const account: SocialAccountResult = result?.socialEyesConnectAccount;
    logger.info(`socialEyesConnectAccount: connected ${props.platform} account ${account?.id}`);
    return {
      success: true,
      data: account,
      tool: 'socialEyesConnectAccount',
      params: redactAccountParams(props),
      instructions: scrubSecretValues(
        `## Account Connected\nSuccessfully connected ${account.provider} account **${account.name}** (ID: ${account.id}).`,
        [props.accessToken, props.refreshToken],
      ),
    };
  } catch (error) {
    logger.error('socialEyesConnectAccount error:', error);
    return {
      success: false,
      error: scrubSecretValues((error as Error).message, [props.accessToken, props.refreshToken]),
      tool: 'socialEyesConnectAccount',
      params: redactAccountParams(props),
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
  if (!id) return { success: false, error: 'id is required', tool: 'socialEyesDisconnectAccount', params: redactAccountParams(props) };

  try {
    const result = await mutateGraph(DISCONNECT_ACCOUNT_MUTATION, { id }, {}, state.context);
    const account = result?.socialEyesDisconnectAccount;
    logger.info(`socialEyesDisconnectAccount: deactivated ${id}`);
    return {
      success: true,
      data: account,
      tool: 'socialEyesDisconnectAccount',
      params: redactAccountParams(props),
      instructions: `## Account Disconnected\nAccount **${account?.name}** (${account?.provider}) has been deactivated.`,
    };
  } catch (error) {
    logger.error('socialEyesDisconnectAccount error:', error);
    return { success: false, error: (error as Error).message, tool: 'socialEyesDisconnectAccount', params: redactAccountParams(props) };
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
  if (!platform) return { success: false, error: 'platform is required', tool: 'socialEyesLookupAccount', params: redactAccountParams(props) };
  if (!username && !userId) return { success: false, error: 'username or userId is required', tool: 'socialEyesLookupAccount', params: redactAccountParams(props) };

  try {
    const input: Record<string, unknown> = { platform };
    if (username) input.username = username;
    if (userId) input.userId = userId;
    if (accessToken) input.accessToken = accessToken;

    const result = await queryGraph(LOOKUP_ACCOUNT_QUERY, { input }, {}, state.context);
    const profile = result?.socialEyesLookupAccount ?? null;

    return {
      success: true,
      data: profile,
      tool: 'socialEyesLookupAccount',
      params: redactAccountParams(props),
      instructions: scrubSecretValues(
        profile
          ? `## Profile Found: @${profile.username}\n- Name: ${profile.name ?? 'N/A'}\n- Followers: ${profile.followerCount ?? 'N/A'}\n- Verified: ${profile.verified ?? false}\n- URL: ${profile.url ?? 'N/A'}\n- Bio: ${profile.bio ?? 'N/A'}`
          : `No profile found for ${username ?? userId} on ${platform}.`,
        [accessToken],
      ),
    };
  } catch (error) {
    logger.error('socialEyesLookupAccount error:', error);
    return {
      success: false,
      error: scrubSecretValues((error as Error).message, [accessToken]),
      tool: 'socialEyesLookupAccount',
      params: redactAccountParams(props),
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
