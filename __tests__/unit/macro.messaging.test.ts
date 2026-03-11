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
  GetInbox,
  GetInboxRegistry,
  GetConversation,
  GetConversationRegistry,
  SendMessage,
  SendMessageRegistry,
  ReplyToMessage,
  ReplyToMessageRegistry,
  MarkMessageRead,
  MarkMessageReadRegistry,
  SyncInbox,
  SyncInboxRegistry,
} from '../../ai/macro/messaging/macro';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockQueryGraph = queryGraph as jest.MockedFunction<typeof queryGraph>;
const mockMutateGraph = mutateGraph as jest.MockedFunction<typeof mutateGraph>;
const mockState = { context: {} } as any;

const sampleMessage = {
  id: 'msg-1',
  platform: 'x',
  sourceId: 'src-1',
  conversationId: 'conv-1',
  from: { id: 'u1', username: 'alice', name: 'Alice' },
  to: [{ id: 'u2', username: 'sandy', name: 'Sandy' }],
  content: 'Hello Sandy!',
  isIncoming: true,
  readAt: null,
  sentAt: '2024-06-01T10:00:00Z',
};

const samplePaging = { total: 1, page: 1, pageSize: 25, hasNext: false };

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── GetInbox ─────────────────────────────────────────────────────────────────

describe('GetInbox', () => {
  it('returns inbox messages on success', async () => {
    mockQueryGraph.mockResolvedValueOnce({
      socialEyesInbox: { paging: samplePaging, messages: [sampleMessage] },
    } as any);

    const result = await GetInbox({}, mockState);

    expect(result.success).toBe(true);
    expect(result.tool).toBe('socialEyesInbox');
    expect((result.data as any).messages).toHaveLength(1);
    expect((result.data as any).paging.total).toBe(1);
  });

  it('uses default page=1 and pageSize=25', async () => {
    mockQueryGraph.mockResolvedValueOnce({
      socialEyesInbox: { paging: samplePaging, messages: [] },
    } as any);

    await GetInbox({}, mockState);

    const callArgs = mockQueryGraph.mock.calls[0];
    expect((callArgs[1] as any).paging).toEqual({ page: 1, pageSize: 25 });
  });

  it('respects explicit paging params', async () => {
    mockQueryGraph.mockResolvedValueOnce({
      socialEyesInbox: { paging: samplePaging, messages: [] },
    } as any);

    await GetInbox({ page: 2, pageSize: 10 }, mockState);

    const callArgs = mockQueryGraph.mock.calls[0];
    expect((callArgs[1] as any).paging).toEqual({ page: 2, pageSize: 10 });
  });

  it('counts unread messages in instructions', async () => {
    const unread = { ...sampleMessage, id: 'msg-2', readAt: null };
    const read = { ...sampleMessage, id: 'msg-3', readAt: '2024-06-01T11:00:00Z' };
    mockQueryGraph.mockResolvedValueOnce({
      socialEyesInbox: { paging: { ...samplePaging, total: 2 }, messages: [unread, read] },
    } as any);

    const result = await GetInbox({}, mockState);

    expect(result.instructions).toContain('Unread in this page: 1');
  });

  it('handles empty inbox gracefully', async () => {
    mockQueryGraph.mockResolvedValueOnce({
      socialEyesInbox: { paging: { total: 0, page: 1, pageSize: 25, hasNext: false }, messages: [] },
    } as any);

    const result = await GetInbox({}, mockState);

    expect(result.success).toBe(true);
    expect((result.data as any).messages).toEqual([]);
  });

  it('falls back to empty data when response is null', async () => {
    mockQueryGraph.mockResolvedValueOnce({ socialEyesInbox: null } as any);

    const result = await GetInbox({}, mockState);

    expect(result.success).toBe(true);
    expect((result.data as any).messages).toEqual([]);
    expect((result.data as any).paging.total).toBe(0);
  });

  it('returns error result on queryGraph failure', async () => {
    mockQueryGraph.mockRejectedValueOnce(new Error('Inbox unavailable') as never);

    const result = await GetInbox({}, mockState);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Inbox unavailable');
  });
});

describe('GetInboxRegistry', () => {
  it('has correct shape', () => {
    expect(GetInboxRegistry.name).toBe('socialEyesInbox');
    expect(GetInboxRegistry.nameSpace).toBe('socialeyes-macros');
    expect(GetInboxRegistry.component).toBe(GetInbox);
    expect(GetInboxRegistry.tools).toHaveLength(1);
  });

  it('has no required parameters', () => {
    expect(GetInboxRegistry.tools[0].function.parameters.required).toEqual([]);
  });
});

// ─── GetConversation ──────────────────────────────────────────────────────────

describe('GetConversation', () => {
  it('returns conversation messages on success', async () => {
    mockQueryGraph.mockResolvedValueOnce({
      socialEyesConversation: { paging: samplePaging, messages: [sampleMessage] },
    } as any);

    const result = await GetConversation({ conversationId: 'conv-1' }, mockState);

    expect(result.success).toBe(true);
    expect(result.tool).toBe('socialEyesConversation');
    expect((result.data as any).messages).toHaveLength(1);
    expect(result.instructions).toContain('conv-1');
  });

  it('uses default paging', async () => {
    mockQueryGraph.mockResolvedValueOnce({
      socialEyesConversation: { paging: samplePaging, messages: [] },
    } as any);

    await GetConversation({ conversationId: 'conv-1' }, mockState);

    const callArgs = mockQueryGraph.mock.calls[0];
    expect((callArgs[1] as any).paging).toEqual({ page: 1, pageSize: 50 });
  });

  it('passes conversationId as a variable', async () => {
    mockQueryGraph.mockResolvedValueOnce({
      socialEyesConversation: { paging: samplePaging, messages: [] },
    } as any);

    await GetConversation({ conversationId: 'conv-abc' }, mockState);

    const callArgs = mockQueryGraph.mock.calls[0];
    expect((callArgs[1] as any).conversationId).toBe('conv-abc');
  });

  it('falls back gracefully when response is null', async () => {
    mockQueryGraph.mockResolvedValueOnce({ socialEyesConversation: null } as any);

    const result = await GetConversation({ conversationId: 'conv-1' }, mockState);

    expect(result.success).toBe(true);
    expect((result.data as any).messages).toEqual([]);
  });

  it('returns error result on queryGraph failure', async () => {
    mockQueryGraph.mockRejectedValueOnce(new Error('Conversation not found') as never);

    const result = await GetConversation({ conversationId: 'conv-1' }, mockState);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Conversation not found');
  });
});

describe('GetConversationRegistry', () => {
  it('has correct shape', () => {
    expect(GetConversationRegistry.name).toBe('socialEyesConversation');
    expect(GetConversationRegistry.tools[0].function.parameters.required).toContain('conversationId');
  });
});

// ─── SendMessage ──────────────────────────────────────────────────────────────

describe('SendMessage', () => {
  const validProps = {
    accountId: 'acc-1',
    to: 'alice',
    content: 'Hello Alice!',
  };

  it('sends a message successfully', async () => {
    mockMutateGraph.mockResolvedValueOnce({
      socialEyesSendMessage: {
        ...sampleMessage,
        isIncoming: false,
        conversationId: 'conv-99',
      },
    } as any);

    const result = await SendMessage(validProps, mockState);

    expect(result.success).toBe(true);
    expect(result.tool).toBe('socialEyesSendMessage');
    expect(result.instructions).toContain('Message Sent');
  });

  it('passes correct input to mutation', async () => {
    mockMutateGraph.mockResolvedValueOnce({
      socialEyesSendMessage: { ...sampleMessage, id: 'msg-new' },
    } as any);

    await SendMessage(validProps, mockState);

    const callArgs = mockMutateGraph.mock.calls[0];
    expect((callArgs[1] as any).input).toEqual(validProps);
  });

  it('includes conversationId in instructions', async () => {
    mockMutateGraph.mockResolvedValueOnce({
      socialEyesSendMessage: { ...sampleMessage, conversationId: 'conv-distinct' },
    } as any);

    const result = await SendMessage(validProps, mockState);

    expect(result.instructions).toContain('conv-distinct');
  });

  it('returns error result on mutation failure', async () => {
    mockMutateGraph.mockRejectedValueOnce(new Error('Rate limit exceeded') as never);

    const result = await SendMessage(validProps, mockState);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Rate limit exceeded');
  });
});

describe('SendMessageRegistry', () => {
  it('has correct shape', () => {
    expect(SendMessageRegistry.name).toBe('socialEyesSendMessage');
    expect(SendMessageRegistry.nameSpace).toBe('socialeyes-macros');
    expect(SendMessageRegistry.tools[0].function.parameters.required).toEqual(
      expect.arrayContaining(['accountId', 'to', 'content']),
    );
  });
});

// ─── ReplyToMessage ───────────────────────────────────────────────────────────

describe('ReplyToMessage', () => {
  it('replies successfully', async () => {
    mockMutateGraph.mockResolvedValueOnce({
      socialEyesReplyToMessage: { ...sampleMessage, id: 'msg-reply', conversationId: 'conv-1' },
    } as any);

    const result = await ReplyToMessage({ messageId: 'msg-1', content: 'Thanks!' }, mockState);

    expect(result.success).toBe(true);
    expect(result.tool).toBe('socialEyesReplyToMessage');
    expect(result.instructions).toContain('Reply Sent');
    expect(result.instructions).toContain('conv-1');
  });

  it('passes correct variables to mutation', async () => {
    mockMutateGraph.mockResolvedValueOnce({
      socialEyesReplyToMessage: sampleMessage,
    } as any);

    await ReplyToMessage({ messageId: 'msg-42', content: 'Got it!' }, mockState);

    const callArgs = mockMutateGraph.mock.calls[0];
    expect((callArgs[1] as any).messageId).toBe('msg-42');
    expect((callArgs[1] as any).content).toBe('Got it!');
  });

  it('returns error result on mutation failure', async () => {
    mockMutateGraph.mockRejectedValueOnce(new Error('Message not found') as never);

    const result = await ReplyToMessage({ messageId: 'msg-1', content: 'Hi' }, mockState);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Message not found');
  });
});

describe('ReplyToMessageRegistry', () => {
  it('has correct shape', () => {
    expect(ReplyToMessageRegistry.name).toBe('socialEyesReplyToMessage');
    expect(ReplyToMessageRegistry.tools[0].function.parameters.required).toEqual(
      expect.arrayContaining(['messageId', 'content']),
    );
  });
});

// ─── MarkMessageRead ──────────────────────────────────────────────────────────

describe('MarkMessageRead', () => {
  it('marks a message as read', async () => {
    mockMutateGraph.mockResolvedValueOnce({
      socialEyesMarkMessageRead: {
        ...sampleMessage,
        readAt: '2024-06-01T12:00:00Z',
      },
    } as any);

    const result = await MarkMessageRead({ id: 'msg-1' }, mockState);

    expect(result.success).toBe(true);
    expect(result.tool).toBe('socialEyesMarkMessageRead');
    expect((result.data as any).readAt).toBeTruthy();
    expect(result.instructions).toContain('msg-1');
  });

  it('passes id to mutation', async () => {
    mockMutateGraph.mockResolvedValueOnce({
      socialEyesMarkMessageRead: { ...sampleMessage, readAt: 'now' },
    } as any);

    await MarkMessageRead({ id: 'msg-77' }, mockState);

    const callArgs = mockMutateGraph.mock.calls[0];
    expect((callArgs[1] as any).id).toBe('msg-77');
  });

  it('returns error result on mutation failure', async () => {
    mockMutateGraph.mockRejectedValueOnce(new Error('Already read') as never);

    const result = await MarkMessageRead({ id: 'msg-1' }, mockState);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Already read');
  });
});

describe('MarkMessageReadRegistry', () => {
  it('has correct shape', () => {
    expect(MarkMessageReadRegistry.name).toBe('socialEyesMarkMessageRead');
    expect(MarkMessageReadRegistry.tools[0].function.parameters.required).toContain('id');
  });
});

// ─── SyncInbox ────────────────────────────────────────────────────────────────

describe('SyncInbox', () => {
  it('returns newMessages count on success', async () => {
    mockMutateGraph.mockResolvedValueOnce({
      socialEyesSyncInbox: { newMessages: 5 },
    } as any);

    const result = await SyncInbox({ accountId: 'acc-1' }, mockState);

    expect(result.success).toBe(true);
    expect(result.tool).toBe('socialEyesSyncInbox');
    expect((result.data as any).newMessages).toBe(5);
    expect(result.instructions).toContain('5');
    expect(result.instructions).toContain('socialEyesInbox');
  });

  it('shows "no new messages" message when count is 0', async () => {
    mockMutateGraph.mockResolvedValueOnce({
      socialEyesSyncInbox: { newMessages: 0 },
    } as any);

    const result = await SyncInbox({ accountId: 'acc-1' }, mockState);

    expect(result.success).toBe(true);
    expect((result.data as any).newMessages).toBe(0);
    expect(result.instructions).toContain('No new messages');
  });

  it('passes accountId to mutation', async () => {
    mockMutateGraph.mockResolvedValueOnce({ socialEyesSyncInbox: { newMessages: 0 } } as any);

    await SyncInbox({ accountId: 'acc-99' }, mockState);

    const callArgs = mockMutateGraph.mock.calls[0];
    expect((callArgs[1] as any).accountId).toBe('acc-99');
  });

  it('falls back to 0 when response has no newMessages', async () => {
    mockMutateGraph.mockResolvedValueOnce({ socialEyesSyncInbox: {} } as any);

    const result = await SyncInbox({ accountId: 'acc-1' }, mockState);

    expect(result.success).toBe(true);
    expect((result.data as any).newMessages).toBe(0);
  });

  it('returns error result on mutation failure', async () => {
    mockMutateGraph.mockRejectedValueOnce(new Error('Sync failed') as never);

    const result = await SyncInbox({ accountId: 'acc-1' }, mockState);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Sync failed');
  });
});

describe('SyncInboxRegistry', () => {
  it('has correct shape', () => {
    expect(SyncInboxRegistry.name).toBe('socialEyesSyncInbox');
    expect(SyncInboxRegistry.nameSpace).toBe('socialeyes-macros');
    expect(SyncInboxRegistry.component).toBe(SyncInbox);
    expect(SyncInboxRegistry.tools[0].function.parameters.required).toContain('accountId');
  });
});
