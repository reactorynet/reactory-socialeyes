import { queryGraph, mutateGraph } from '@reactory/server-core/graph/ReactoryApolloClient';
import { ChatState, Macro, MacroComponentDefinition } from '@reactory/server-modules/reactory-reactor/ai/openai/types/chat';
import logger from '@reactory/server-core/logging';
import {
  GetInboxProps,
  GetConversationProps,
  SendMessageProps,
  ReplyToMessageProps,
  MarkMessageReadProps,
  SyncInboxProps,
  SocialMessageResult,
  PagingResult,
  SocialEyesMacroResult,
} from '../types';

// ─── GraphQL documents ────────────────────────────────────────────────────────

const GET_INBOX_QUERY = `
  query SocialEyesInbox($paging: PagingRequest) {
    socialEyesInbox(paging: $paging) {
      paging {
        total
        page
        pageSize
        hasNext
      }
      messages {
        id
        platform
        sourceId
        conversationId
        from {
          id
          username
          name
          avatar
        }
        to {
          id
          username
          name
          avatar
        }
        content
        isIncoming
        readAt
        sentAt
      }
    }
  }
`;

const GET_CONVERSATION_QUERY = `
  query SocialEyesConversation($conversationId: String!, $paging: PagingRequest) {
    socialEyesConversation(conversationId: $conversationId, paging: $paging) {
      paging {
        total
        page
        pageSize
        hasNext
      }
      messages {
        id
        platform
        sourceId
        conversationId
        from {
          id
          username
          name
          avatar
        }
        to {
          id
          username
          name
          avatar
        }
        content
        isIncoming
        readAt
        sentAt
      }
    }
  }
`;

const SEND_MESSAGE_MUTATION = `
  mutation SocialEyesSendMessage($input: SocialEyesSendMessageInput!) {
    socialEyesSendMessage(input: $input) {
      id
      platform
      conversationId
      from {
        id
        username
        name
      }
      to {
        id
        username
        name
      }
      content
      isIncoming
      sentAt
    }
  }
`;

const REPLY_TO_MESSAGE_MUTATION = `
  mutation SocialEyesReplyToMessage($messageId: ID!, $content: String!) {
    socialEyesReplyToMessage(messageId: $messageId, content: $content) {
      id
      platform
      conversationId
      from {
        id
        username
        name
      }
      content
      isIncoming
      sentAt
    }
  }
`;

const MARK_MESSAGE_READ_MUTATION = `
  mutation SocialEyesMarkMessageRead($id: ID!) {
    socialEyesMarkMessageRead(id: $id) {
      id
      platform
      content
      readAt
      sentAt
    }
  }
`;

const SYNC_INBOX_MUTATION = `
  mutation SocialEyesSyncInbox($accountId: ID!) {
    socialEyesSyncInbox(accountId: $accountId) {
      newMessages
    }
  }
`;

// ─── Shared paged message data type ─────────────────────────────────────────

export interface PagedMessagesData {
  paging: PagingResult;
  messages: SocialMessageResult[];
}

// ─── GetInbox ─────────────────────────────────────────────────────────────────

export const GetInbox: Macro<SocialEyesMacroResult<PagedMessagesData>, GetInboxProps> = async (
  props: GetInboxProps,
  state: ChatState,
): Promise<SocialEyesMacroResult<PagedMessagesData>> => {
  const { page = 1, pageSize = 25 } = props;

  try {
    const result = await queryGraph(
      GET_INBOX_QUERY,
      { paging: { page, pageSize } },
      {},
      state.context,
    );

    const data = result?.socialEyesInbox;
    const messages: SocialMessageResult[] = data?.messages ?? [];
    const paging: PagingResult = data?.paging ?? { total: 0, page, pageSize, hasNext: false };
    const unreadCount = messages.filter((m) => !m.readAt).length;

    logger.info(`socialEyesGetInbox: returned ${messages.length} messages`);

    return {
      success: true,
      data: { paging, messages },
      tool: 'socialEyesInbox',
      params: props,
      instructions: `
## Unified Inbox — ${messages.length} messages (page ${paging.page})

Total: ${paging.total}. Unread in this page: ${unreadCount}. ${paging.hasNext ? 'More pages available.' : 'No further pages.'}

Each message has: id, platform, conversationId, from/to (id/username/name/avatar), content,
isIncoming (true = received by you), readAt (null if unread), sentAt.

To read a full thread, call socialEyesConversation with a conversationId.
To mark messages read, call socialEyesMarkMessageRead with each id.
To reply, call socialEyesReplyToMessage with the message id and your content.
`,
    };
  } catch (error) {
    logger.error('socialEyesGetInbox error:', error);
    return { success: false, error: (error as Error).message, tool: 'socialEyesInbox', params: props,
      instructions: `## Get Inbox — Error\n\nFailed to retrieve inbox: ${(error as Error).message}\n\n### Recovery Options:\n- Retry the request\n- Try a smaller pageSize\n- Verify server connectivity`
    };
  }
};

export const GetInboxRegistry: MacroComponentDefinition<typeof GetInbox> = {
  component: GetInbox,
  name: 'socialEyesInbox',
  nameSpace: 'socialeyes-macros',
  version: '1.0.0',
  description: 'Retrieve the unified social inbox. Returns paginated messages across all connected platforms, ordered by most recent. Unread messages are flagged.',
  roles: ['USER'],
  stem: 'socialEyesInbox',
  tags: ['social', 'inbox', 'messaging', 'dm'],
  tools: [{
    type: 'function',
    function: {
      name: 'socialEyesInbox',
      description: 'Get the unified social inbox — direct messages and mentions across all connected platforms. Returns paginated messages with sender, content, and read status.',
      parameters: {
        type: 'object',
        properties: {
          page: { type: 'number', description: 'Page number (default: 1)' },
          pageSize: { type: 'number', description: 'Messages per page (default: 25)' },
        },
        required: [],
      },
    },
  }],
};

// ─── GetConversation ──────────────────────────────────────────────────────────

export const GetConversation: Macro<SocialEyesMacroResult<PagedMessagesData>, GetConversationProps> = async (
  props: GetConversationProps,
  state: ChatState,
): Promise<SocialEyesMacroResult<PagedMessagesData>> => {
  const { conversationId, page = 1, pageSize = 50 } = props;

  try {
    const result = await queryGraph(
      GET_CONVERSATION_QUERY,
      { conversationId, paging: { page, pageSize } },
      {},
      state.context,
    );

    const data = result?.socialEyesConversation;
    const messages: SocialMessageResult[] = data?.messages ?? [];
    const paging: PagingResult = data?.paging ?? { total: 0, page, pageSize, hasNext: false };

    logger.info(`socialEyesGetConversation: ${conversationId} — ${messages.length} messages`);

    return {
      success: true,
      data: { paging, messages },
      tool: 'socialEyesConversation',
      params: props,
      instructions: `
## Conversation thread — ${conversationId}

${messages.length} messages loaded (page ${paging.page}). Total: ${paging.total}. ${paging.hasNext ? 'More pages available.' : 'This is the full thread.'}

Messages are listed in chronological order. isIncoming=true means received; false means sent.
To reply, call socialEyesReplyToMessage with the most recent message id.
`,
    };
  } catch (error) {
    logger.error('socialEyesGetConversation error:', error);
    return {
      success: false,
      error: (error as Error).message,
      tool: 'socialEyesConversation',
      params: props,
      instructions: `## Get Conversation — Error\n\nFailed to load conversation: ${(error as Error).message}\n\n### Recovery Options:\n- Verify the conversationId is correct (get it from \`socialEyesInbox\`)\n- Retry the request`
    };
  }
};

export const GetConversationRegistry: MacroComponentDefinition<typeof GetConversation> = {
  component: GetConversation,
  name: 'socialEyesConversation',
  nameSpace: 'socialeyes-macros',
  version: '1.0.0',
  description: 'Load a full message thread by conversationId. Returns all messages in chronological order with sender details.',
  roles: ['USER'],
  stem: 'socialEyesConversation',
  tags: ['social', 'messaging', 'conversation', 'thread'],
  tools: [{
    type: 'function',
    function: {
      name: 'socialEyesConversation',
      description: 'Load a full message conversation thread. Provide the conversationId from an inbox message. Returns messages in chronological order.',
      parameters: {
        type: 'object',
        properties: {
          conversationId: { type: 'string', description: 'The conversationId to load (from an inbox message)' },
          page: { type: 'number', description: 'Page number (default: 1)' },
          pageSize: { type: 'number', description: 'Messages per page (default: 50)' },
        },
        required: ['conversationId'],
      },
    },
  }],
};

// ─── SendMessage ──────────────────────────────────────────────────────────────

export const SendMessage: Macro<SocialEyesMacroResult<SocialMessageResult>, SendMessageProps> = async (
  props: SendMessageProps,
  state: ChatState,
): Promise<SocialEyesMacroResult<SocialMessageResult>> => {
  const { accountId, to, content } = props;

  try {
    const result = await mutateGraph(
      SEND_MESSAGE_MUTATION,
      { input: { accountId, to, content } },
      {},
      state.context,
    );

    const message: SocialMessageResult = result?.socialEyesSendMessage;

    logger.info(`socialEyesSendMessage: sent via account ${accountId} to ${to}`);

    return {
      success: true,
      data: message,
      tool: 'socialEyesSendMessage',
      params: props,
      instructions: `
## Message Sent

Message id: ${message?.id ?? 'unknown'}
Platform: ${message?.platform ?? 'unknown'}
Sent: ${message?.sentAt ?? 'unknown'}

The message was successfully delivered. To follow up, use the conversationId (${message?.conversationId ?? 'unknown'}) with socialEyesConversation to view the thread.
`,
    };
  } catch (error) {
    logger.error('socialEyesSendMessage error:', error);
    return { success: false, error: (error as Error).message, tool: 'socialEyesSendMessage', params: props,
      instructions: `## Send Message — Error\n\nFailed to send message: ${(error as Error).message}\n\n### Recovery Options:\n- Verify accountId and recipient are correct\n- Check the account is connected and has messaging permissions\n- Retry the request`
    };
  }
};

export const SendMessageRegistry: MacroComponentDefinition<typeof SendMessage> = {
  component: SendMessage,
  name: 'socialEyesSendMessage',
  nameSpace: 'socialeyes-macros',
  version: '1.0.0',
  description: 'Send a new direct message to a user on a social platform via a connected account.',
  roles: ['USER'],
  stem: 'socialEyesSendMessage',
  tags: ['social', 'messaging', 'dm', 'send'],
  tools: [{
    type: 'function',
    function: {
      name: 'socialEyesSendMessage',
      description: 'Send a new direct message to a user on a social platform. Requires a connected account ID, the recipient username or platform user ID, and the message content.',
      parameters: {
        type: 'object',
        properties: {
          accountId: { type: 'string', description: 'ID of the connected social account to send from' },
          to: { type: 'string', description: 'Recipient username or platform user ID' },
          content: { type: 'string', description: 'The message text to send' },
        },
        required: ['accountId', 'to', 'content'],
      },
    },
  }],
};

// ─── ReplyToMessage ───────────────────────────────────────────────────────────

export const ReplyToMessage: Macro<SocialEyesMacroResult<SocialMessageResult>, ReplyToMessageProps> = async (
  props: ReplyToMessageProps,
  state: ChatState,
): Promise<SocialEyesMacroResult<SocialMessageResult>> => {
  const { messageId, content } = props;

  try {
    const result = await mutateGraph(
      REPLY_TO_MESSAGE_MUTATION,
      { messageId, content },
      {},
      state.context,
    );

    const message: SocialMessageResult = result?.socialEyesReplyToMessage;

    logger.info(`socialEyesReplyToMessage: replied to ${messageId}`);

    return {
      success: true,
      data: message,
      tool: 'socialEyesReplyToMessage',
      params: props,
      instructions: `
## Reply Sent

Replied to message ${messageId}. New message id: ${message?.id ?? 'unknown'}. Sent: ${message?.sentAt ?? 'unknown'}.

The conversation thread can be viewed with socialEyesConversation using conversationId: ${message?.conversationId ?? 'unknown'}.
`,
    };
  } catch (error) {
    logger.error('socialEyesReplyToMessage error:', error);
    return {
      success: false,
      error: (error as Error).message,
      tool: 'socialEyesReplyToMessage',
      params: props,
      instructions: `## Reply To Message — Error\n\nFailed to reply: ${(error as Error).message}\n\n### Recovery Options:\n- Verify the messageId is correct (get from \`socialEyesConversation\`)\n- Retry the request`
    };
  }
};

export const ReplyToMessageRegistry: MacroComponentDefinition<typeof ReplyToMessage> = {
  component: ReplyToMessage,
  name: 'socialEyesReplyToMessage',
  nameSpace: 'socialeyes-macros',
  version: '1.0.0',
  description: 'Reply to an existing message in a conversation thread.',
  roles: ['USER'],
  stem: 'socialEyesReplyToMessage',
  tags: ['social', 'messaging', 'reply', 'dm'],
  tools: [{
    type: 'function',
    function: {
      name: 'socialEyesReplyToMessage',
      description: 'Send a reply to an existing message. Provide the message ID to reply to and the reply content.',
      parameters: {
        type: 'object',
        properties: {
          messageId: { type: 'string', description: 'ID of the message to reply to' },
          content: { type: 'string', description: 'The reply text' },
        },
        required: ['messageId', 'content'],
      },
    },
  }],
};

// ─── MarkMessageRead ──────────────────────────────────────────────────────────

export const MarkMessageRead: Macro<SocialEyesMacroResult<SocialMessageResult>, MarkMessageReadProps> = async (
  props: MarkMessageReadProps,
  state: ChatState,
): Promise<SocialEyesMacroResult<SocialMessageResult>> => {
  const { id } = props;

  try {
    const result = await mutateGraph(
      MARK_MESSAGE_READ_MUTATION,
      { id },
      {},
      state.context,
    );

    const message: SocialMessageResult = result?.socialEyesMarkMessageRead;

    logger.info(`socialEyesMarkMessageRead: marked ${id} as read`);

    return {
      success: true,
      data: message,
      tool: 'socialEyesMarkMessageRead',
      params: props,
      instructions: `Message ${id} marked as read at ${message?.readAt ?? 'now'}.`,
    };
  } catch (error) {
    logger.error('socialEyesMarkMessageRead error:', error);
    return {
      success: false,
      error: (error as Error).message,
      tool: 'socialEyesMarkMessageRead',
      params: props,
      instructions: `## Mark Message Read — Error\n\nFailed to mark message as read: ${(error as Error).message}\n\n### Recovery Options:\n- Verify the message ID is valid\n- Retry the request`
    };
  }
};

export const MarkMessageReadRegistry: MacroComponentDefinition<typeof MarkMessageRead> = {
  component: MarkMessageRead,
  name: 'socialEyesMarkMessageRead',
  nameSpace: 'socialeyes-macros',
  version: '1.0.0',
  description: 'Mark a message as read by ID.',
  roles: ['USER'],
  stem: 'socialEyesMarkMessageRead',
  tags: ['social', 'messaging', 'read', 'inbox'],
  tools: [{
    type: 'function',
    function: {
      name: 'socialEyesMarkMessageRead',
      description: 'Mark a specific message as read. Provide the message ID.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The message ID to mark as read' },
        },
        required: ['id'],
      },
    },
  }],
};

// ─── SyncInbox ────────────────────────────────────────────────────────────────

export const SyncInbox: Macro<SocialEyesMacroResult<{ newMessages: number }>, SyncInboxProps> = async (
  props: SyncInboxProps,
  state: ChatState,
): Promise<SocialEyesMacroResult<{ newMessages: number }>> => {
  const { accountId } = props;

  try {
    const result = await mutateGraph(
      SYNC_INBOX_MUTATION,
      { accountId },
      {},
      state.context,
    );

    const syncResult = result?.socialEyesSyncInbox;
    const newMessages: number = syncResult?.newMessages ?? 0;

    logger.info(`socialEyesSyncInbox: account ${accountId} — ${newMessages} new messages`);

    return {
      success: true,
      data: { newMessages },
      tool: 'socialEyesSyncInbox',
      params: props,
      instructions: `
## Inbox Sync Complete

Account: ${accountId}
New messages fetched: ${newMessages}

${newMessages > 0
    ? 'Call socialEyesInbox to view the updated inbox.'
    : 'No new messages since the last sync.'}
`,
    };
  } catch (error) {
    logger.error('socialEyesSyncInbox error:', error);
    return { success: false, error: (error as Error).message, tool: 'socialEyesSyncInbox', params: props,
      instructions: `## Sync Inbox — Error\n\nFailed to sync inbox: ${(error as Error).message}\n\n### Recovery Options:\n- Verify the accountId is correct\n- Check the social account is still connected\n- Retry the request`
    };
  }
};

export const SyncInboxRegistry: MacroComponentDefinition<typeof SyncInbox> = {
  component: SyncInbox,
  name: 'socialEyesSyncInbox',
  nameSpace: 'socialeyes-macros',
  version: '1.0.0',
  description: 'Trigger a manual inbox sync for a connected social account. Returns the number of new messages fetched.',
  roles: ['USER'],
  stem: 'socialEyesSyncInbox',
  tags: ['social', 'messaging', 'sync', 'inbox'],
  tools: [{
    type: 'function',
    function: {
      name: 'socialEyesSyncInbox',
      description: 'Trigger a manual inbox sync for a connected social account. Fetches the latest messages from the platform API. Returns the count of new messages.',
      parameters: {
        type: 'object',
        properties: {
          accountId: { type: 'string', description: 'ID of the connected social account to sync' },
        },
        required: ['accountId'],
      },
    },
  }],
};
