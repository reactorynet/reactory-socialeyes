import { MacroComponentDefinition } from '@reactory/server-modules/reactory-reactor/ai/openai/types/chat';

// Account macros
import {
  ListAccountsRegistry,
  GetAccountRegistry,
  ConnectAccountRegistry,
  DisconnectAccountRegistry,
  LookupAccountRegistry,
} from './accounts/macro';

// Listener macros
import {
  ListListenersRegistry,
  GetListenerRegistry,
  CreateListenerRegistry,
  UpdateListenerRegistry,
  DeleteListenerRegistry,
  ToggleListenerRegistry,
} from './listeners/macro';

// Feed macros
import { GetFeedRegistry } from './feed/macro';

// Messaging macros
import {
  GetInboxRegistry,
  GetConversationRegistry,
  SendMessageRegistry,
  ReplyToMessageRegistry,
  MarkMessageReadRegistry,
  SyncInboxRegistry,
} from './messaging/macro';

// Re-export individual macros and registries for direct use
export {
  // accounts
  ListAccountsRegistry,
  GetAccountRegistry,
  ConnectAccountRegistry,
  DisconnectAccountRegistry,
  LookupAccountRegistry,
  // listeners
  ListListenersRegistry,
  GetListenerRegistry,
  CreateListenerRegistry,
  UpdateListenerRegistry,
  DeleteListenerRegistry,
  ToggleListenerRegistry,
  // feed
  GetFeedRegistry,
  // messaging
  GetInboxRegistry,
  GetConversationRegistry,
  SendMessageRegistry,
  ReplyToMessageRegistry,
  MarkMessageReadRegistry,
  SyncInboxRegistry,
};

export { GetFeed } from './feed/macro';
export {
  GetInbox,
  GetConversation,
  SendMessage,
  ReplyToMessage,
  MarkMessageRead,
  SyncInbox,
} from './messaging/macro';
export {
  ListAccounts,
  GetAccount,
  ConnectAccount,
  DisconnectAccount,
  LookupAccount,
} from './accounts/macro';
export {
  ListListeners,
  GetListener,
  CreateListener,
  UpdateListener,
  DeleteListener,
  ToggleListener,
} from './listeners/macro';

export * from './types';

/**
 * Complete registry of all SocialEyes macros. Pass this array to the module
 * definition so that Sandy can use all social capabilities via tool calls.
 */
export const SocialEyesMacros: MacroComponentDefinition<any>[] = [
  // Accounts (5)
  ListAccountsRegistry,
  GetAccountRegistry,
  ConnectAccountRegistry,
  DisconnectAccountRegistry,
  LookupAccountRegistry,
  // Listeners (6)
  ListListenersRegistry,
  GetListenerRegistry,
  CreateListenerRegistry,
  UpdateListenerRegistry,
  DeleteListenerRegistry,
  ToggleListenerRegistry,
  // Feed (1)
  GetFeedRegistry,
  // Messaging (6)
  GetInboxRegistry,
  GetConversationRegistry,
  SendMessageRegistry,
  ReplyToMessageRegistry,
  MarkMessageReadRegistry,
  SyncInboxRegistry,
];

export default SocialEyesMacros;
