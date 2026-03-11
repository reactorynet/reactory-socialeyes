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

import { queryGraph } from '@reactory/server-core/graph/ReactoryApolloClient';
import { GetFeed, GetFeedRegistry } from '../../ai/macro/feed/macro';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockQueryGraph = queryGraph as jest.MockedFunction<typeof queryGraph>;
const mockState = { context: {} } as any;

const samplePost = {
  id: 'post-1',
  platform: 'x',
  sourceId: 'src-1',
  url: 'https://x.com/post/1',
  author: { id: 'u1', username: 'sandy', name: 'Sandy', avatar: null },
  content: 'Hello reactory! #reactory',
  hashtags: ['reactory'],
  mentions: [],
  media: [],
  metrics: { likes: 10, shares: 2, comments: 1, views: 500 },
  sentiment: 0.8,
  publishedAt: '2024-06-01T10:00:00Z',
  collectedAt: '2024-06-01T10:05:00Z',
};

const samplePaging = { total: 1, page: 1, pageSize: 25, hasNext: false };

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── GetFeed ──────────────────────────────────────────────────────────────────

describe('GetFeed', () => {
  it('returns feed posts on success', async () => {
    mockQueryGraph.mockResolvedValueOnce({
      socialEyesFeed: { paging: samplePaging, posts: [samplePost] },
    } as any);

    const result = await GetFeed({}, mockState);

    expect(result.success).toBe(true);
    expect(result.tool).toBe('socialEyesFeed');
    expect((result.data as any).posts).toHaveLength(1);
    expect((result.data as any).paging.total).toBe(1);
  });

  it('uses default page=1 and pageSize=25', async () => {
    mockQueryGraph.mockResolvedValueOnce({ socialEyesFeed: { paging: samplePaging, posts: [] } } as any);

    await GetFeed({}, mockState);

    const callArgs = mockQueryGraph.mock.calls[0];
    expect((callArgs[1] as any).paging).toEqual({ page: 1, pageSize: 25 });
  });

  it('respects explicit page and pageSize', async () => {
    mockQueryGraph.mockResolvedValueOnce({ socialEyesFeed: { paging: samplePaging, posts: [] } } as any);

    await GetFeed({ page: 3, pageSize: 10 }, mockState);

    const callArgs = mockQueryGraph.mock.calls[0];
    expect((callArgs[1] as any).paging).toEqual({ page: 3, pageSize: 10 });
  });

  it('passes platform filter', async () => {
    mockQueryGraph.mockResolvedValueOnce({ socialEyesFeed: { paging: samplePaging, posts: [] } } as any);

    await GetFeed({ platform: 'reddit' }, mockState);

    const callArgs = mockQueryGraph.mock.calls[0];
    expect((callArgs[1] as any).filter.platform).toBe('reddit');
  });

  it('passes search filter', async () => {
    mockQueryGraph.mockResolvedValueOnce({ socialEyesFeed: { paging: samplePaging, posts: [] } } as any);

    await GetFeed({ search: 'reactory' }, mockState);

    const callArgs = mockQueryGraph.mock.calls[0];
    expect((callArgs[1] as any).filter.search).toBe('reactory');
  });

  it('passes dateFrom and dateTo filters', async () => {
    mockQueryGraph.mockResolvedValueOnce({ socialEyesFeed: { paging: samplePaging, posts: [] } } as any);

    await GetFeed({ dateFrom: '2024-01-01', dateTo: '2024-12-31' }, mockState);

    const callArgs = mockQueryGraph.mock.calls[0];
    expect((callArgs[1] as any).filter.dateFrom).toBe('2024-01-01');
    expect((callArgs[1] as any).filter.dateTo).toBe('2024-12-31');
  });

  it('passes listenerId filter', async () => {
    mockQueryGraph.mockResolvedValueOnce({ socialEyesFeed: { paging: samplePaging, posts: [] } } as any);

    await GetFeed({ listenerId: 'lst-42' }, mockState);

    const callArgs = mockQueryGraph.mock.calls[0];
    expect((callArgs[1] as any).filter.listenerId).toBe('lst-42');
  });

  it('omits filter entirely when no filter props provided', async () => {
    mockQueryGraph.mockResolvedValueOnce({ socialEyesFeed: { paging: samplePaging, posts: [] } } as any);

    await GetFeed({}, mockState);

    const callArgs = mockQueryGraph.mock.calls[0];
    expect((callArgs[1] as any).filter).toBeUndefined();
  });

  it('falls back to empty paging when feed data is null', async () => {
    mockQueryGraph.mockResolvedValueOnce({ socialEyesFeed: null } as any);

    const result = await GetFeed({}, mockState);

    expect(result.success).toBe(true);
    expect((result.data as any).posts).toEqual([]);
    expect((result.data as any).paging.total).toBe(0);
  });

  it('includes sentiment summary in instructions', async () => {
    const posts = [
      { ...samplePost, id: 'p1', sentiment: 0.5 },    // positive
      { ...samplePost, id: 'p2', sentiment: -0.5 },   // negative
      { ...samplePost, id: 'p3', sentiment: 0.0 },    // neutral
    ];
    mockQueryGraph.mockResolvedValueOnce({
      socialEyesFeed: { paging: { ...samplePaging, total: 3 }, posts },
    } as any);

    const result = await GetFeed({}, mockState);

    expect(result.instructions).toContain('Positive: 1');
    expect(result.instructions).toContain('Negative: 1');
    expect(result.instructions).toContain('Neutral: 1');
  });

  it('includes platform breakdown in instructions', async () => {
    const posts = [
      { ...samplePost, id: 'p1', platform: 'x' },
      { ...samplePost, id: 'p2', platform: 'reddit' },
      { ...samplePost, id: 'p3', platform: 'x' },
    ];
    mockQueryGraph.mockResolvedValueOnce({
      socialEyesFeed: { paging: { ...samplePaging, total: 3 }, posts },
    } as any);

    const result = await GetFeed({}, mockState);

    expect(result.instructions).toContain('x: 2');
    expect(result.instructions).toContain('reddit: 1');
  });

  it('indicates when more pages are available', async () => {
    mockQueryGraph.mockResolvedValueOnce({
      socialEyesFeed: { paging: { total: 100, page: 1, pageSize: 25, hasNext: true }, posts: [] },
    } as any);

    const result = await GetFeed({}, mockState);

    expect(result.instructions).toContain('More pages available');
  });

  it('returns error result on queryGraph failure', async () => {
    mockQueryGraph.mockRejectedValueOnce(new Error('Feed unavailable') as never);

    const result = await GetFeed({}, mockState);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Feed unavailable');
  });
});

// ─── GetFeedRegistry ──────────────────────────────────────────────────────────

describe('GetFeedRegistry', () => {
  it('has correct shape', () => {
    expect(GetFeedRegistry.name).toBe('socialEyesFeed');
    expect(GetFeedRegistry.nameSpace).toBe('socialeyes-macros');
    expect(GetFeedRegistry.version).toBe('1.0.0');
    expect(GetFeedRegistry.component).toBe(GetFeed);
    expect(GetFeedRegistry.tools).toHaveLength(1);
  });

  it('has no required parameters', () => {
    expect(GetFeedRegistry.tools[0].function.parameters.required).toEqual([]);
  });

  it('exposes all filter properties', () => {
    const props = GetFeedRegistry.tools[0].function.parameters.properties;
    expect(props).toHaveProperty('platform');
    expect(props).toHaveProperty('dateFrom');
    expect(props).toHaveProperty('dateTo');
    expect(props).toHaveProperty('search');
    expect(props).toHaveProperty('listenerId');
    expect(props).toHaveProperty('page');
    expect(props).toHaveProperty('pageSize');
  });
});
