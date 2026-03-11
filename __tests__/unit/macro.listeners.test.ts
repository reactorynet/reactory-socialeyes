import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// ─── Mocks ────────────────────────────────────────────────────────────────────

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

// ─── Imports ──────────────────────────────────────────────────────────────────

import {
  queryGraph,
  mutateGraph,
} from '@reactory/server-core/graph/ReactoryApolloClient';

import {
  ListListeners,
  ListListenersRegistry,
  GetListener,
  GetListenerRegistry,
  CreateListener,
  CreateListenerRegistry,
  UpdateListener,
  UpdateListenerRegistry,
  DeleteListener,
  DeleteListenerRegistry,
  ToggleListener,
  ToggleListenerRegistry,
} from '../../ai/macro/listeners/macro';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockQueryGraph = queryGraph as jest.MockedFunction<typeof queryGraph>;
const mockMutateGraph = mutateGraph as jest.MockedFunction<typeof mutateGraph>;
const mockState = { context: {} } as any;

const sampleListener = {
  id: 'lst-1',
  name: 'Keyword: reactory',
  platform: 'x',
  type: 'keyword',
  query: 'reactory',
  intervalMinutes: 15,
  isActive: true,
  lastRun: '2024-06-01T12:00:00Z',
  owner: 'user-1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── ListListeners ────────────────────────────────────────────────────────────

describe('ListListeners', () => {
  it('returns listeners on success', async () => {
    mockQueryGraph.mockResolvedValueOnce({ socialEyesListeners: [sampleListener] } as any);

    const result = await ListListeners({}, mockState);

    expect(result.success).toBe(true);
    expect(result.tool).toBe('socialEyesListeners');
    expect(result.data).toHaveLength(1);
    expect((result.data as any[])[0].id).toBe('lst-1');
  });

  it('shows active count in instructions', async () => {
    const inactive = { ...sampleListener, id: 'lst-2', isActive: false };
    mockQueryGraph.mockResolvedValueOnce({ socialEyesListeners: [sampleListener, inactive] } as any);

    const result = await ListListeners({}, mockState);

    expect(result.instructions).toContain('2 total');
    expect(result.instructions).toContain('1 active');
  });

  it('mentions create tip when no listeners exist', async () => {
    mockQueryGraph.mockResolvedValueOnce({ socialEyesListeners: [] } as any);

    const result = await ListListeners({}, mockState);

    expect(result.instructions).toContain('socialEyesCreateListener');
  });

  it('passes platform filter', async () => {
    mockQueryGraph.mockResolvedValueOnce({ socialEyesListeners: [] } as any);

    await ListListeners({ platform: 'reddit' }, mockState);

    const callArgs = mockQueryGraph.mock.calls[0];
    expect((callArgs[1] as any).filter.platform).toBe('reddit');
  });

  it('passes isActive filter', async () => {
    mockQueryGraph.mockResolvedValueOnce({ socialEyesListeners: [] } as any);

    await ListListeners({ isActive: true }, mockState);

    const callArgs = mockQueryGraph.mock.calls[0];
    expect((callArgs[1] as any).filter.isActive).toBe(true);
  });

  it('omits filter when no props', async () => {
    mockQueryGraph.mockResolvedValueOnce({ socialEyesListeners: [] } as any);

    await ListListeners({}, mockState);

    const callArgs = mockQueryGraph.mock.calls[0];
    expect((callArgs[1] as any).filter).toBeUndefined();
  });

  it('returns error result on queryGraph failure', async () => {
    mockQueryGraph.mockRejectedValueOnce(new Error('Timeout') as never);

    const result = await ListListeners({}, mockState);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Timeout');
  });
});

describe('ListListenersRegistry', () => {
  it('has correct shape', () => {
    expect(ListListenersRegistry.name).toBe('socialEyesListeners');
    expect(ListListenersRegistry.nameSpace).toBe('socialeyes-macros');
    expect(ListListenersRegistry.component).toBe(ListListeners);
    expect(ListListenersRegistry.tools).toHaveLength(1);
  });
});

// ─── GetListener ──────────────────────────────────────────────────────────────

describe('GetListener', () => {
  it('returns listener details on success', async () => {
    mockQueryGraph.mockResolvedValueOnce({ socialEyesListener: sampleListener } as any);

    const result = await GetListener({ id: 'lst-1' }, mockState);

    expect(result.success).toBe(true);
    expect(result.tool).toBe('socialEyesListener');
    expect((result.data as any).query).toBe('reactory');
    expect(result.instructions).toContain('reactory');
  });

  it('returns success with null when listener not found', async () => {
    mockQueryGraph.mockResolvedValueOnce({ socialEyesListener: null } as any);

    const result = await GetListener({ id: 'missing' }, mockState);

    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
    expect(result.instructions).toContain('missing');
  });

  it('returns error when id is empty', async () => {
    const result = await GetListener({ id: '' }, mockState);

    expect(result.success).toBe(false);
    expect(result.error).toContain('id is required');
    expect(mockQueryGraph).not.toHaveBeenCalled();
  });

  it('shows webhook label when intervalMinutes is 0', async () => {
    mockQueryGraph.mockResolvedValueOnce({
      socialEyesListener: { ...sampleListener, intervalMinutes: 0 },
    } as any);

    const result = await GetListener({ id: 'lst-1' }, mockState);

    expect(result.instructions).toContain('webhook');
  });

  it('returns error result on queryGraph failure', async () => {
    mockQueryGraph.mockRejectedValueOnce(new Error('Service unavailable') as never);

    const result = await GetListener({ id: 'lst-1' }, mockState);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Service unavailable');
  });
});

describe('GetListenerRegistry', () => {
  it('has correct shape', () => {
    expect(GetListenerRegistry.name).toBe('socialEyesListener');
    expect(GetListenerRegistry.tools[0].function.parameters.required).toContain('id');
  });
});

// ─── CreateListener ───────────────────────────────────────────────────────────

describe('CreateListener', () => {
  const validProps = {
    name: 'My Keyword Listener',
    platform: 'x',
    type: 'keyword',
    query: '#reactory',
  };

  it('creates a listener successfully', async () => {
    mockMutateGraph.mockResolvedValueOnce({ socialEyesCreateListener: sampleListener } as any);

    const result = await CreateListener(validProps, mockState);

    expect(result.success).toBe(true);
    expect(result.tool).toBe('socialEyesCreateListener');
    expect(result.instructions).toContain('Created');
  });

  it.each(['name', 'platform', 'type', 'query'])(
    'returns error when %s is missing',
    async (field) => {
      const props = { ...validProps, [field]: '' };
      const result = await CreateListener(props, mockState);

      expect(result.success).toBe(false);
      expect(result.error).toContain(field);
      expect(mockMutateGraph).not.toHaveBeenCalled();
    },
  );

  it('passes optional intervalMinutes to mutation', async () => {
    mockMutateGraph.mockResolvedValueOnce({ socialEyesCreateListener: sampleListener } as any);

    await CreateListener({ ...validProps, intervalMinutes: 30 }, mockState);

    const callArgs = mockMutateGraph.mock.calls[0];
    expect((callArgs[1] as any).input.intervalMinutes).toBe(30);
  });

  it('returns error result on mutation failure', async () => {
    mockMutateGraph.mockRejectedValueOnce(new Error('Duplicate listener') as never);

    const result = await CreateListener(validProps, mockState);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Duplicate listener');
  });
});

describe('CreateListenerRegistry', () => {
  it('has correct shape', () => {
    expect(CreateListenerRegistry.name).toBe('socialEyesCreateListener');
    expect(CreateListenerRegistry.nameSpace).toBe('socialeyes-macros');
    expect(CreateListenerRegistry.tools[0].function.parameters.required).toEqual(
      expect.arrayContaining(['name', 'platform', 'type', 'query']),
    );
  });
});

// ─── UpdateListener ───────────────────────────────────────────────────────────

describe('UpdateListener', () => {
  it('updates a listener successfully', async () => {
    const updated = { ...sampleListener, name: 'Updated Name' };
    mockMutateGraph.mockResolvedValueOnce({ socialEyesUpdateListener: updated } as any);

    const result = await UpdateListener({ id: 'lst-1', name: 'Updated Name' }, mockState);

    expect(result.success).toBe(true);
    expect(result.tool).toBe('socialEyesUpdateListener');
    expect(result.instructions).toContain('Updated');
  });

  it('returns error when id is missing', async () => {
    const result = await UpdateListener({ id: '' }, mockState);

    expect(result.success).toBe(false);
    expect(result.error).toContain('id is required');
    expect(mockMutateGraph).not.toHaveBeenCalled();
  });

  it('sends only the input fields (not id) inside the input arg', async () => {
    mockMutateGraph.mockResolvedValueOnce({ socialEyesUpdateListener: sampleListener } as any);

    await UpdateListener({ id: 'lst-1', query: 'new-query', intervalMinutes: 60 }, mockState);

    const callArgs = mockMutateGraph.mock.calls[0];
    expect((callArgs[1] as any).id).toBe('lst-1');
    expect((callArgs[1] as any).input.query).toBe('new-query');
    expect((callArgs[1] as any).input.id).toBeUndefined();
  });

  it('returns error result on mutation failure', async () => {
    mockMutateGraph.mockRejectedValueOnce(new Error('Not found') as never);

    const result = await UpdateListener({ id: 'lst-1' }, mockState);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Not found');
  });
});

describe('UpdateListenerRegistry', () => {
  it('has correct shape and only requires id', () => {
    expect(UpdateListenerRegistry.name).toBe('socialEyesUpdateListener');
    expect(UpdateListenerRegistry.tools[0].function.parameters.required).toEqual(['id']);
  });
});

// ─── DeleteListener ───────────────────────────────────────────────────────────

describe('DeleteListener', () => {
  it('deletes a listener successfully', async () => {
    mockMutateGraph.mockResolvedValueOnce({
      socialEyesDeleteListener: { id: 'lst-1', name: 'My Listener' },
    } as any);

    const result = await DeleteListener({ id: 'lst-1' }, mockState);

    expect(result.success).toBe(true);
    expect(result.tool).toBe('socialEyesDeleteListener');
    expect(result.instructions).toContain('Deleted');
  });

  it('returns error when id is missing', async () => {
    const result = await DeleteListener({ id: '' }, mockState);

    expect(result.success).toBe(false);
    expect(result.error).toContain('id is required');
    expect(mockMutateGraph).not.toHaveBeenCalled();
  });

  it('returns error result on mutation failure', async () => {
    mockMutateGraph.mockRejectedValueOnce(new Error('Already deleted') as never);

    const result = await DeleteListener({ id: 'lst-1' }, mockState);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Already deleted');
  });
});

describe('DeleteListenerRegistry', () => {
  it('has correct shape', () => {
    expect(DeleteListenerRegistry.name).toBe('socialEyesDeleteListener');
    expect(DeleteListenerRegistry.tools[0].function.parameters.required).toContain('id');
  });
});

// ─── ToggleListener ───────────────────────────────────────────────────────────

describe('ToggleListener', () => {
  it('activates a listener', async () => {
    mockMutateGraph.mockResolvedValueOnce({
      socialEyesToggleListener: { id: 'lst-1', name: 'My Listener', isActive: true },
    } as any);

    const result = await ToggleListener({ id: 'lst-1', isActive: true }, mockState);

    expect(result.success).toBe(true);
    expect(result.tool).toBe('socialEyesToggleListener');
    expect((result.data as any).isActive).toBe(true);
  });

  it('deactivates a listener', async () => {
    mockMutateGraph.mockResolvedValueOnce({
      socialEyesToggleListener: { id: 'lst-1', name: 'My Listener', isActive: false },
    } as any);

    const result = await ToggleListener({ id: 'lst-1', isActive: false }, mockState);

    expect(result.success).toBe(true);
    expect((result.data as any).isActive).toBe(false);
  });

  it('returns error when id is missing', async () => {
    const result = await ToggleListener({ id: '', isActive: true }, mockState);

    expect(result.success).toBe(false);
    expect(result.error).toContain('id is required');
  });

  it('returns error when isActive is undefined', async () => {
    const result = await ToggleListener({ id: 'lst-1', isActive: undefined as any }, mockState);

    expect(result.success).toBe(false);
    expect(result.error).toContain('isActive is required');
  });

  it('passes correct variables to mutation', async () => {
    mockMutateGraph.mockResolvedValueOnce({
      socialEyesToggleListener: { id: 'lst-1', name: 'x', isActive: false },
    } as any);

    await ToggleListener({ id: 'lst-1', isActive: false }, mockState);

    const callArgs = mockMutateGraph.mock.calls[0];
    expect((callArgs[1] as any).id).toBe('lst-1');
    expect((callArgs[1] as any).isActive).toBe(false);
  });

  it('returns error result on mutation failure', async () => {
    mockMutateGraph.mockRejectedValueOnce(new Error('Permission denied') as never);

    const result = await ToggleListener({ id: 'lst-1', isActive: true }, mockState);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Permission denied');
  });
});

describe('ToggleListenerRegistry', () => {
  it('has correct shape', () => {
    expect(ToggleListenerRegistry.name).toBe('socialEyesToggleListener');
    expect(ToggleListenerRegistry.nameSpace).toBe('socialeyes-macros');
    expect(ToggleListenerRegistry.tools[0].function.parameters.required).toEqual(
      expect.arrayContaining(['id', 'isActive']),
    );
  });
});
