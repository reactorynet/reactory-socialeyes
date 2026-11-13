import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// ─── Mocks (must be declared before any imports from the module under test) ───

jest.mock('@reactory/server-core/graph/ReactoryApolloClient', () => ({
  queryGraph: jest.fn(),
  mutateGraph: jest.fn(),
}));

jest.mock('@reactory/server-core/logging', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@reactory/server-modules/reactory-reactor/ai/openai/types/chat', () => ({}));

// ─── Imports ─────────────────────────────────────────────────────────────────

import {
  queryGraph,
  mutateGraph,
} from '@reactory/server-core/graph/ReactoryApolloClient';

import {
  ListAccounts,
  ListAccountsRegistry,
  GetAccount,
  GetAccountRegistry,
  ConnectAccount,
  ConnectAccountRegistry,
  DisconnectAccount,
  DisconnectAccountRegistry,
  LookupAccount,
  LookupAccountRegistry,
  redactSecrets,
  scrubSecretValues,
} from '../../ai/macro/accounts/macro';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockQueryGraph = queryGraph as jest.MockedFunction<typeof queryGraph>;
const mockMutateGraph = mutateGraph as jest.MockedFunction<typeof mutateGraph>;

const mockState = { context: {} } as any;

const sampleAccount = {
  id: 'acc-1',
  provider: 'x',
  providerAccountId: 'x-user-123',
  name: 'Test User',
  email: 'test@example.com',
  avatar: 'https://example.com/avatar.jpg',
  profileUrl: 'https://x.com/testuser',
  isActive: true,
  scopes: ['read', 'write'],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── ListAccounts ─────────────────────────────────────────────────────────────

describe('ListAccounts', () => {
  it('returns accounts on success', async () => {
    mockQueryGraph.mockResolvedValueOnce({ socialEyesAccounts: [sampleAccount] } as any);

    const result = await ListAccounts({}, mockState);

    expect(result.success).toBe(true);
    expect(result.tool).toBe('socialEyesAccounts');
    expect(result.data).toHaveLength(1);
    expect((result.data as any[])[0].id).toBe('acc-1');
    expect(result.instructions).toContain('1');
  });

  it('returns empty array when no accounts exist', async () => {
    mockQueryGraph.mockResolvedValueOnce({ socialEyesAccounts: [] } as any);

    const result = await ListAccounts({}, mockState);

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
    expect(result.instructions).toContain('socialEyesConnectAccount');
  });

  it('passes platform filter to queryGraph', async () => {
    mockQueryGraph.mockResolvedValueOnce({ socialEyesAccounts: [] } as any);

    await ListAccounts({ platform: 'x' }, mockState);

    const callArgs = mockQueryGraph.mock.calls[0];
    expect((callArgs[1] as any).filter.platform).toBe('x');
  });

  it('passes isActive filter to queryGraph', async () => {
    mockQueryGraph.mockResolvedValueOnce({ socialEyesAccounts: [] } as any);

    await ListAccounts({ isActive: false }, mockState);

    const callArgs = mockQueryGraph.mock.calls[0];
    expect((callArgs[1] as any).filter.isActive).toBe(false);
  });

  it('omits filter when no props provided', async () => {
    mockQueryGraph.mockResolvedValueOnce({ socialEyesAccounts: [] } as any);

    await ListAccounts({}, mockState);

    const callArgs = mockQueryGraph.mock.calls[0];
    expect((callArgs[1] as any).filter).toBeUndefined();
  });

  it('returns error result when queryGraph throws', async () => {
    mockQueryGraph.mockRejectedValueOnce(new Error('Network error') as never);

    const result = await ListAccounts({}, mockState);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });
});

// ─── ListAccountsRegistry ─────────────────────────────────────────────────────

describe('ListAccountsRegistry', () => {
  it('has correct shape', () => {
    expect(ListAccountsRegistry.name).toBe('socialEyesAccounts');
    expect(ListAccountsRegistry.nameSpace).toBe('socialeyes-macros');
    expect(ListAccountsRegistry.version).toBe('1.0.0');
    expect(ListAccountsRegistry.component).toBe(ListAccounts);
    expect(ListAccountsRegistry.tools).toHaveLength(1);
    expect(ListAccountsRegistry.tools[0].function.name).toBe('socialEyesAccounts');
  });
});

// ─── GetAccount ───────────────────────────────────────────────────────────────

describe('GetAccount', () => {
  it('returns account when found', async () => {
    mockQueryGraph.mockResolvedValueOnce({ socialEyesAccount: sampleAccount } as any);

    const result = await GetAccount({ id: 'acc-1' }, mockState);

    expect(result.success).toBe(true);
    expect(result.tool).toBe('socialEyesAccount');
    expect((result.data as any).id).toBe('acc-1');
    expect(result.instructions).toContain('Test User');
  });

  it('returns success with null data when account not found', async () => {
    mockQueryGraph.mockResolvedValueOnce({ socialEyesAccount: null } as any);

    const result = await GetAccount({ id: 'missing' }, mockState);

    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
    expect(result.instructions).toContain('missing');
  });

  it('returns error when id is missing', async () => {
    const result = await GetAccount({ id: '' }, mockState);

    expect(result.success).toBe(false);
    expect(result.error).toContain('id is required');
    expect(mockQueryGraph).not.toHaveBeenCalled();
  });

  it('returns error result when queryGraph throws', async () => {
    mockQueryGraph.mockRejectedValueOnce(new Error('DB timeout') as never);

    const result = await GetAccount({ id: 'acc-1' }, mockState);

    expect(result.success).toBe(false);
    expect(result.error).toBe('DB timeout');
  });
});

describe('GetAccountRegistry', () => {
  it('has correct shape', () => {
    expect(GetAccountRegistry.name).toBe('socialEyesAccount');
    expect(GetAccountRegistry.nameSpace).toBe('socialeyes-macros');
    expect(GetAccountRegistry.tools[0].function.parameters.required).toContain('id');
  });
});

// ─── ConnectAccount ───────────────────────────────────────────────────────────

describe('ConnectAccount', () => {
  const validProps = {
    platform: 'x',
    accessToken: 'tok-abc',
    providerAccountId: 'x-123',
    name: 'Sandy',
  };

  it('connects account successfully', async () => {
    mockMutateGraph.mockResolvedValueOnce({ socialEyesConnectAccount: sampleAccount } as any);

    const result = await ConnectAccount(validProps, mockState);

    expect(result.success).toBe(true);
    expect(result.tool).toBe('socialEyesConnectAccount');
    expect(result.instructions).toContain('Connected');
  });

  it.each(['platform', 'accessToken', 'providerAccountId', 'name'])(
    'returns error when %s is missing',
    async (field) => {
      const props = { ...validProps, [field]: '' };
      const result = await ConnectAccount(props, mockState);

      expect(result.success).toBe(false);
      expect(result.error).toContain(field);
      expect(mockMutateGraph).not.toHaveBeenCalled();
    },
  );

  it('returns error result when mutateGraph throws', async () => {
    mockMutateGraph.mockRejectedValueOnce(new Error('Auth failed') as never);

    const result = await ConnectAccount(validProps, mockState);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Auth failed');
  });
});

describe('ConnectAccountRegistry', () => {
  it('has correct shape', () => {
    expect(ConnectAccountRegistry.name).toBe('socialEyesConnectAccount');
    expect(ConnectAccountRegistry.nameSpace).toBe('socialeyes-macros');
    expect(ConnectAccountRegistry.tools[0].function.parameters.required).toEqual(
      expect.arrayContaining(['platform', 'accessToken', 'providerAccountId', 'name']),
    );
  });
});

// ─── DisconnectAccount ────────────────────────────────────────────────────────

describe('DisconnectAccount', () => {
  it('disconnects account successfully', async () => {
    mockMutateGraph.mockResolvedValueOnce({
      socialEyesDisconnectAccount: { id: 'acc-1', provider: 'x', name: 'Sandy', isActive: false },
    } as any);

    const result = await DisconnectAccount({ id: 'acc-1' }, mockState);

    expect(result.success).toBe(true);
    expect(result.tool).toBe('socialEyesDisconnectAccount');
    expect(result.instructions).toContain('Disconnected');
  });

  it('returns error when id is missing', async () => {
    const result = await DisconnectAccount({ id: '' }, mockState);

    expect(result.success).toBe(false);
    expect(result.error).toContain('id is required');
    expect(mockMutateGraph).not.toHaveBeenCalled();
  });

  it('returns error result on mutation failure', async () => {
    mockMutateGraph.mockRejectedValueOnce(new Error('Permission denied') as never);

    const result = await DisconnectAccount({ id: 'acc-1' }, mockState);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Permission denied');
  });
});

describe('DisconnectAccountRegistry', () => {
  it('has correct shape', () => {
    expect(DisconnectAccountRegistry.name).toBe('socialEyesDisconnectAccount');
    expect(DisconnectAccountRegistry.tools[0].function.parameters.required).toContain('id');
  });
});

// ─── LookupAccount ────────────────────────────────────────────────────────────

describe('LookupAccount', () => {
  const mockProfile = {
    id: 'profile-1',
    username: 'janedoe',
    name: 'Jane Doe',
    avatar: null,
    bio: 'Developer',
    followerCount: 1500,
    followingCount: 300,
    postCount: 200,
    verified: true,
    url: 'https://x.com/janedoe',
  };

  it('returns profile when found', async () => {
    mockQueryGraph.mockResolvedValueOnce({ socialEyesLookupAccount: mockProfile } as any);

    const result = await LookupAccount({ platform: 'x', username: 'janedoe' }, mockState);

    expect(result.success).toBe(true);
    expect(result.tool).toBe('socialEyesLookupAccount');
    expect((result.data as any).username).toBe('janedoe');
    expect(result.instructions).toContain('@janedoe');
  });

  it('returns success with null data when profile not found', async () => {
    mockQueryGraph.mockResolvedValueOnce({ socialEyesLookupAccount: null } as any);

    const result = await LookupAccount({ platform: 'x', username: 'unknown' }, mockState);

    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
    expect(result.instructions).toContain('unknown');
  });

  it('returns error when platform is missing', async () => {
    const result = await LookupAccount({ platform: '', username: 'janedoe' }, mockState);

    expect(result.success).toBe(false);
    expect(result.error).toContain('platform is required');
  });

  it('returns error when neither username nor userId provided', async () => {
    const result = await LookupAccount({ platform: 'x' }, mockState);

    expect(result.success).toBe(false);
    expect(result.error).toContain('username or userId is required');
  });

  it('accepts userId in place of username', async () => {
    mockQueryGraph.mockResolvedValueOnce({ socialEyesLookupAccount: mockProfile } as any);

    const result = await LookupAccount({ platform: 'x', userId: 'id-999' }, mockState);

    expect(result.success).toBe(true);
    const callArgs = mockQueryGraph.mock.calls[0];
    expect((callArgs[1] as any).input.userId).toBe('id-999');
  });

  it('returns error result when queryGraph throws', async () => {
    mockQueryGraph.mockRejectedValueOnce(new Error('Rate limited') as never);

    const result = await LookupAccount({ platform: 'x', username: 'anyone' }, mockState);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Rate limited');
  });
});

describe('LookupAccountRegistry', () => {
  it('has correct shape', () => {
    expect(LookupAccountRegistry.name).toBe('socialEyesLookupAccount');
    expect(LookupAccountRegistry.nameSpace).toBe('socialeyes-macros');
    expect(LookupAccountRegistry.tools[0].function.parameters.required).toContain('platform');
  });
});

// ─── Credential redaction ─────────────────────────────────────────────────────
//
// Regression guard for REACTORY-302016408/20261113/638973579: the account macros
// used to return `params: props` verbatim, which echoed the OAuth access and
// refresh tokens into the tool result, the model context and the persisted chat.

describe('Account macro credential redaction', () => {
  const secrets = {
    accessToken: 'tok-access-ABC123',
    refreshToken: 'tok-refresh-XYZ789',
    tokenExpiry: '2030-01-01T00:00:00.000Z',
  };

  const connectProps = {
    platform: 'x',
    providerAccountId: 'x-123',
    name: 'Sandy',
    email: 'sandy@example.com',
    avatar: 'https://example.com/sandy.png',
    scopes: ['read', 'write'],
    ...secrets,
  };

  const expectNoSecrets = (result: unknown) => {
    const serialised = JSON.stringify(result);
    expect(serialised).not.toContain(secrets.accessToken);
    expect(serialised).not.toContain(secrets.refreshToken);
    expect(serialised).not.toContain(secrets.tokenExpiry);
  };

  it('does not echo tokens from socialEyesConnectAccount on success', async () => {
    mockMutateGraph.mockResolvedValueOnce({ socialEyesConnectAccount: sampleAccount } as any);

    const result = await ConnectAccount(connectProps, mockState);

    expect(result.success).toBe(true);
    expectNoSecrets(result);

    const params = result.params as Record<string, any>;
    expect(params.accessToken).toBe('[REDACTED]');
    expect(params.refreshToken).toBe('[REDACTED]');
    expect(params.tokenExpiry).toBe('[REDACTED]');
    // non-secret inputs stay available for debugging
    expect(params.platform).toBe('x');
    expect(params.providerAccountId).toBe('x-123');
    expect(params.name).toBe('Sandy');
    expect(params.email).toBe('sandy@example.com');
    expect(params.avatar).toBe('https://example.com/sandy.png');
    expect(params.scopes).toEqual(['read', 'write']);
    // and the connected account is still returned
    expect((result.data as any).id).toBe('acc-1');
  });

  it('does not echo tokens from socialEyesConnectAccount when the mutation throws', async () => {
    mockMutateGraph.mockRejectedValueOnce(
      new Error(`Auth failed for access token ${secrets.accessToken}`) as never,
    );

    const result = await ConnectAccount(connectProps, mockState);

    expect(result.success).toBe(false);
    expectNoSecrets(result);
    expect(result.error).not.toContain(secrets.accessToken);
    expect(result.error).toContain('[REDACTED]');
    expect((result.params as Record<string, any>).platform).toBe('x');
    expect((result.params as Record<string, any>).name).toBe('Sandy');
  });

  it('does not echo tokens from socialEyesConnectAccount when a required input is missing', async () => {
    const result = await ConnectAccount({ ...connectProps, name: '' }, mockState);

    expect(result.success).toBe(false);
    expect(result.error).toContain('name is required');
    expect(mockMutateGraph).not.toHaveBeenCalled();
    expectNoSecrets(result);
  });

  it('does not echo tokens from socialEyesAccount', async () => {
    mockQueryGraph.mockResolvedValueOnce({ socialEyesAccount: sampleAccount } as any);

    // Callers can attach credential material to the props object; it must not be echoed.
    const result = await GetAccount({ id: 'acc-1', ...secrets } as any, mockState);

    expect(result.success).toBe(true);
    expectNoSecrets(result);
    expect((result.params as Record<string, any>).id).toBe('acc-1');
    expect((result.data as any).name).toBe('Test User');
  });

  it('does not echo tokens from socialEyesDisconnectAccount', async () => {
    mockMutateGraph.mockResolvedValueOnce({
      socialEyesDisconnectAccount: { id: 'acc-1', provider: 'x', name: 'Sandy', isActive: false },
    } as any);

    const result = await DisconnectAccount({ id: 'acc-1', ...secrets } as any, mockState);

    expect(result.success).toBe(true);
    expectNoSecrets(result);
    expect((result.params as Record<string, any>).id).toBe('acc-1');
  });

  it('does not echo the lookup access token on success or failure', async () => {
    mockQueryGraph.mockResolvedValueOnce({ socialEyesLookupAccount: { id: 'p-1', username: 'jane' } } as any);

    const okResult = await LookupAccount(
      { platform: 'x', username: 'jane', accessToken: secrets.accessToken },
      mockState,
    );
    expect(okResult.success).toBe(true);
    expectNoSecrets(okResult);
    expect((okResult.params as Record<string, any>).username).toBe('jane');

    mockQueryGraph.mockRejectedValueOnce(
      new Error(`401 for token ${secrets.accessToken}`) as never,
    );
    const failResult = await LookupAccount(
      { platform: 'x', username: 'jane', accessToken: secrets.accessToken },
      mockState,
    );
    expect(failResult.success).toBe(false);
    expectNoSecrets(failResult);
  });

  it('redacts nested auth / scope blobs while keeping scopes', () => {
    const redacted = redactSecrets({
      platform: 'x',
      scopes: ['read'],
      auth: { bearer: secrets.accessToken },
      scope: 'read write',
      credentials: { accessToken: secrets.accessToken },
    });

    expect(JSON.stringify(redacted)).not.toContain(secrets.accessToken);
    expect(redacted.platform).toBe('x');
    expect(redacted.scopes).toEqual(['read']);
    expect(redacted.auth).toBe('[REDACTED]');
    expect(redacted.scope).toBe('[REDACTED]');
  });

  it('scrubs literal secrets out of free text', () => {
    expect(scrubSecretValues(`bad token ${secrets.accessToken}`, [secrets.accessToken])).toBe(
      'bad token [REDACTED]',
    );
  });

  // ── Defence in depth: the `data` payload ──────────────────────────────────

  it('redacts tokens that arrive on the data payload, not just params', async () => {
    // A GraphQL fragment change (SocialAccount has `metadata: Any`) could re-open
    // the leak through `data` instead of `params`. Guard that path explicitly.
    mockMutateGraph.mockResolvedValueOnce({
      socialEyesConnectAccount: {
        ...sampleAccount,
        accessToken: secrets.accessToken,
        metadata: { refreshToken: secrets.refreshToken },
      },
    } as any);

    const result = await ConnectAccount(connectProps, mockState);

    expect(result.success).toBe(true);
    expectNoSecrets(result);
    expect((result.data as any).id).toBe('acc-1');
    expect((result.data as any).accessToken).toBe('[REDACTED]');
    expect((result.data as any).metadata.refreshToken).toBe('[REDACTED]');
  });

  it('redacts tokens on the data payload of socialEyesAccounts', async () => {
    mockQueryGraph.mockResolvedValueOnce({
      socialEyesAccounts: [{ ...sampleAccount, refreshToken: secrets.refreshToken }],
    } as any);

    const result = await ListAccounts({}, mockState);

    expect(result.success).toBe(true);
    expectNoSecrets(result);
    expect((result.data as any[])[0].id).toBe('acc-1');
  });

  // ── Robustness of the redaction helpers ───────────────────────────────────

  it('does not mutate the object it redacts', () => {
    const input = { platform: 'x', accessToken: secrets.accessToken, nested: { refreshToken: secrets.refreshToken } };
    const snapshot = JSON.stringify(input);

    const output = redactSecrets(input);

    expect(JSON.stringify(input)).toBe(snapshot);
    expect(output).not.toBe(input);
    expect(output.accessToken).toBe('[REDACTED]');
  });

  it('terminates on a self-referencing array instead of overflowing the stack', () => {
    const cyclic: any[] = [{ platform: 'x' }];
    cyclic.push(cyclic);

    expect(() => redactSecrets(cyclic)).not.toThrow();
    expect(redactSecrets(cyclic)[0]).toEqual({ platform: 'x' });
  });

  it('copies shared acyclic references in full rather than treating them as cycles', () => {
    const shared = { id: 'acc-1', name: 'Sandy' };
    const redacted = redactSecrets({ a: shared, b: shared });

    expect(redacted.a).toEqual({ id: 'acc-1', name: 'Sandy' });
    expect(redacted.b).toEqual({ id: 'acc-1', name: 'Sandy' });
  });

  it('treats a literal __proto__ key as data instead of a prototype', () => {
    const payload = JSON.parse('{"__proto__":{"accessToken":"tok-access-ABC123"},"platform":"x"}');
    const redacted = redactSecrets(payload);

    expect(JSON.stringify(redacted)).not.toContain(secrets.accessToken);
    expect(Object.getPrototypeOf(redacted)).toBe(Object.prototype);
  });

  it('scrubs URL-encoded and differently-cased secret values', () => {
    const encoded = encodeURIComponent(secrets.accessToken);
    expect(scrubSecretValues(`url?token=${encoded}`, [secrets.accessToken])).toBe('url?token=[REDACTED]');
    expect(scrubSecretValues(`bad ${secrets.accessToken.toUpperCase()}`, [secrets.accessToken])).toBe(
      'bad [REDACTED]',
    );
  });

  it('returns an error result, not a throw, when the rejection is not an Error', async () => {
    mockMutateGraph.mockRejectedValueOnce('plain string failure' as never);

    const result = await ConnectAccount(connectProps, mockState);

    expect(result.success).toBe(false);
    expect(result.error).toBe('plain string failure');
    expectNoSecrets(result);
  });

  it('scrubs the error envelope of socialEyesAccount too', async () => {
    mockQueryGraph.mockRejectedValueOnce(
      new Error(`lookup failed for ${secrets.accessToken}`) as never,
    );

    const result = await GetAccount({ id: 'acc-1', ...secrets } as any, mockState);

    expect(result.success).toBe(false);
    expectNoSecrets(result);
    expect(result.error).toContain('[REDACTED]');
  });

  it('scrubs the error envelope of socialEyesDisconnectAccount too', async () => {
    mockMutateGraph.mockRejectedValueOnce(
      new Error(`disconnect failed for ${secrets.refreshToken}`) as never,
    );

    const result = await DisconnectAccount({ id: 'acc-1', ...secrets } as any, mockState);

    expect(result.success).toBe(false);
    expectNoSecrets(result);
    expect(result.error).toContain('[REDACTED]');
  });
});
