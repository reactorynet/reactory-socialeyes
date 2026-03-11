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
