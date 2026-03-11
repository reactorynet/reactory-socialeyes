import { queryGraph, mutateGraph } from '@reactory/server-core/graph/ReactoryApolloClient';
import { ChatState, Macro, MacroComponentDefinition } from '@reactory/server-modules/reactory-reactor/ai/openai/types/chat';
import logger from '@reactory/server-core/logging';
import {
  ListListenersProps,
  GetListenerProps,
  CreateListenerProps,
  UpdateListenerProps,
  DeleteListenerProps,
  ToggleListenerProps,
  SocialListenerResult,
  SocialEyesMacroResult,
} from '../types';

// ─────────────────────────────────────────────
// Shared GQL fragment
// ─────────────────────────────────────────────

const LISTENER_FIELDS = `
  id
  name
  platform
  type
  query
  intervalMinutes
  isActive
  lastRun
  owner
  metadata
  createdAt
  updatedAt
`;

// ─────────────────────────────────────────────
// LIST LISTENERS
// ─────────────────────────────────────────────

const LIST_LISTENERS_QUERY = `
  query SocialEyesListeners($filter: SocialEyesListenerFilter) {
    socialEyesListeners(filter: $filter) {
      ${LISTENER_FIELDS}
    }
  }
`;

export const ListListeners: Macro<SocialEyesMacroResult<SocialListenerResult[]>, ListListenersProps> = async (
  props: ListListenersProps,
  state: ChatState,
): Promise<SocialEyesMacroResult<SocialListenerResult[]>> => {
  const startTime = Date.now();
  try {
    const filter: Record<string, unknown> = {};
    if (props.platform) filter.platform = props.platform;
    if (props.type) filter.type = props.type;
    if (props.isActive !== undefined) filter.isActive = props.isActive;

    const result = await queryGraph(LIST_LISTENERS_QUERY, { filter: Object.keys(filter).length ? filter : undefined }, {}, state.context);
    const listeners: SocialListenerResult[] = result?.socialEyesListeners ?? [];
    const active = listeners.filter((l) => l.isActive).length;
    const ms = Date.now() - startTime;

    return {
      success: true,
      data: listeners,
      tool: 'socialEyesListeners',
      params: props,
      instructions: `
## Social Listeners (${listeners.length} total, ${active} active)

Retrieved in ${ms}ms. Each listener has: id, name, platform, type, query, intervalMinutes, isActive, lastRun.

Use the listener id to update, delete, or toggle a listener.
Use socialEyesFeed with listenerId to see posts captured by a specific listener.
${listeners.length === 0 ? '\nNo listeners configured. Use socialEyesCreateListener to set one up.' : ''}
`,
    };
  } catch (error) {
    logger.error('socialEyesListListeners error:', error);
    return { success: false, error: (error as Error).message, tool: 'socialEyesListeners', params: props };
  }
};

export const ListListenersRegistry: MacroComponentDefinition<typeof ListListeners> = {
  component: ListListeners,
  name: 'socialEyesListeners',
  nameSpace: 'socialeyes-macros',
  version: '1.0.0',
  description: 'List all social media listeners. Optionally filter by platform, type, or active status.',
  roles: ['USER'],
  stem: 'socialEyesListeners',
  tags: ['social', 'listeners', 'list', 'monitoring'],
  tools: [{
    type: 'function',
    function: {
      name: 'socialEyesListeners',
      description: 'List configured social media listeners. Optionally filter by platform (x, reddit, facebook, instagram), type (keyword, hashtag, mention, user, group), or isActive status.',
      parameters: {
        type: 'object',
        properties: {
          platform: { type: 'string', description: 'Filter by platform' },
          type: { type: 'string', description: 'Filter by listener type: keyword, hashtag, mention, user, group' },
          isActive: { type: 'boolean', description: 'Filter by active status' },
        },
        required: [],
      },
    },
  }],
};

// ─────────────────────────────────────────────
// GET LISTENER
// ─────────────────────────────────────────────

const GET_LISTENER_QUERY = `
  query SocialEyesListener($id: ID!) {
    socialEyesListener(id: $id) {
      ${LISTENER_FIELDS}
    }
  }
`;

export const GetListener: Macro<SocialEyesMacroResult<SocialListenerResult | null>, GetListenerProps> = async (
  props: GetListenerProps,
  state: ChatState,
): Promise<SocialEyesMacroResult<SocialListenerResult | null>> => {
  const { id } = props;
  if (!id) return { success: false, error: 'id is required', tool: 'socialEyesListener', params: props };

  try {
    const result = await queryGraph(GET_LISTENER_QUERY, { id }, {}, state.context);
    const listener: SocialListenerResult | null = result?.socialEyesListener ?? null;
    return {
      success: true,
      data: listener,
      tool: 'socialEyesListener',
      params: props,
      instructions: listener
        ? `## Listener: ${listener.name}\n- Platform: ${listener.platform}\n- Type: ${listener.type}\n- Query: \`${listener.query}\`\n- Active: ${listener.isActive}\n- Interval: ${listener.intervalMinutes === 0 ? 'webhook' : `${listener.intervalMinutes} min`}\n- Last run: ${listener.lastRun ?? 'never'}`
        : `No listener found with id: ${id}`,
    };
  } catch (error) {
    logger.error('socialEyesGetListener error:', error);
    return { success: false, error: (error as Error).message, tool: 'socialEyesListener', params: props };
  }
};

export const GetListenerRegistry: MacroComponentDefinition<typeof GetListener> = {
  component: GetListener,
  name: 'socialEyesListener',
  nameSpace: 'socialeyes-macros',
  version: '1.0.0',
  description: 'Get the details of a single social media listener by ID.',
  roles: ['USER'],
  stem: 'socialEyesListener',
  tags: ['social', 'listener', 'get'],
  tools: [{
    type: 'function',
    function: {
      name: 'socialEyesListener',
      description: 'Get a specific social media listener by its ID.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The listener ID to retrieve' },
        },
        required: ['id'],
      },
    },
  }],
};

// ─────────────────────────────────────────────
// CREATE LISTENER
// ─────────────────────────────────────────────

const CREATE_LISTENER_MUTATION = `
  mutation SocialEyesCreateListener($input: SocialEyesCreateListenerInput!) {
    socialEyesCreateListener(input: $input) {
      ${LISTENER_FIELDS}
    }
  }
`;

export const CreateListener: Macro<SocialEyesMacroResult<SocialListenerResult>, CreateListenerProps> = async (
  props: CreateListenerProps,
  state: ChatState,
): Promise<SocialEyesMacroResult<SocialListenerResult>> => {
  const required = ['name', 'platform', 'type', 'query'];
  for (const field of required) {
    if (!(props as any)[field]) {
      return { success: false, error: `${field} is required`, tool: 'socialEyesCreateListener', params: props };
    }
  }

  try {
    const result = await mutateGraph(CREATE_LISTENER_MUTATION, { input: props }, {}, state.context);
    const listener: SocialListenerResult = result?.socialEyesCreateListener;
    logger.info(`socialEyesCreateListener: created listener ${listener?.id} — "${listener?.name}"`);
    return {
      success: true,
      data: listener,
      tool: 'socialEyesCreateListener',
      params: props,
      instructions: `## Listener Created\n**${listener.name}** (ID: ${listener.id}) is now monitoring **${listener.platform}** for \`${listener.query}\` every ${listener.intervalMinutes === 0 ? 'webhook event' : `${listener.intervalMinutes} minutes`}.`,
    };
  } catch (error) {
    logger.error('socialEyesCreateListener error:', error);
    return { success: false, error: (error as Error).message, tool: 'socialEyesCreateListener', params: props };
  }
};

export const CreateListenerRegistry: MacroComponentDefinition<typeof CreateListener> = {
  component: CreateListener,
  name: 'socialEyesCreateListener',
  nameSpace: 'socialeyes-macros',
  version: '1.0.0',
  description: 'Create a new social media listener to monitor keywords, hashtags, mentions, or users.',
  roles: ['USER'],
  stem: 'socialEyesCreateListener',
  tags: ['social', 'listener', 'create', 'monitor'],
  tools: [{
    type: 'function',
    function: {
      name: 'socialEyesCreateListener',
      description: 'Create a new social media listener to monitor keywords, hashtags, mentions, or users on X or Reddit.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Human-readable name for the listener' },
          platform: { type: 'string', description: 'Platform to monitor: x or reddit' },
          type: { type: 'string', description: 'Listener type: keyword, hashtag, mention, user, or group' },
          query: { type: 'string', description: 'Search query or term to monitor (supports boolean operators on X)' },
          intervalMinutes: { type: 'number', description: 'Polling interval in minutes (default 15, use 0 for webhook)' },
          actions: { type: 'array', items: { type: 'string' }, description: 'Actions to trigger on match, e.g. ["emit-event"]' },
          metadata: { type: 'object', description: 'Additional metadata such as autoReplyTemplate' },
        },
        required: ['name', 'platform', 'type', 'query'],
      },
    },
  }],
};

// ─────────────────────────────────────────────
// UPDATE LISTENER
// ─────────────────────────────────────────────

const UPDATE_LISTENER_MUTATION = `
  mutation SocialEyesUpdateListener($id: ID!, $input: SocialEyesUpdateListenerInput!) {
    socialEyesUpdateListener(id: $id, input: $input) {
      ${LISTENER_FIELDS}
    }
  }
`;

export const UpdateListener: Macro<SocialEyesMacroResult<SocialListenerResult>, UpdateListenerProps> = async (
  props: UpdateListenerProps,
  state: ChatState,
): Promise<SocialEyesMacroResult<SocialListenerResult>> => {
  const { id, ...input } = props;
  if (!id) return { success: false, error: 'id is required', tool: 'socialEyesUpdateListener', params: props };

  try {
    const result = await mutateGraph(UPDATE_LISTENER_MUTATION, { id, input }, {}, state.context);
    const listener: SocialListenerResult = result?.socialEyesUpdateListener;
    return {
      success: true,
      data: listener,
      tool: 'socialEyesUpdateListener',
      params: props,
      instructions: `## Listener Updated\n**${listener.name}** (ID: ${listener.id}) has been updated.`,
    };
  } catch (error) {
    logger.error('socialEyesUpdateListener error:', error);
    return { success: false, error: (error as Error).message, tool: 'socialEyesUpdateListener', params: props };
  }
};

export const UpdateListenerRegistry: MacroComponentDefinition<typeof UpdateListener> = {
  component: UpdateListener,
  name: 'socialEyesUpdateListener',
  nameSpace: 'socialeyes-macros',
  version: '1.0.0',
  description: 'Update an existing social media listener — change query, interval, or actions.',
  roles: ['USER'],
  stem: 'socialEyesUpdateListener',
  tags: ['social', 'listener', 'update'],
  tools: [{
    type: 'function',
    function: {
      name: 'socialEyesUpdateListener',
      description: 'Update fields of an existing social media listener.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ID of the listener to update' },
          name: { type: 'string', description: 'New name' },
          platform: { type: 'string', description: 'New platform' },
          type: { type: 'string', description: 'New listener type' },
          query: { type: 'string', description: 'New search query' },
          intervalMinutes: { type: 'number', description: 'New polling interval in minutes' },
          actions: { type: 'array', items: { type: 'string' }, description: 'New action list' },
          metadata: { type: 'object', description: 'New/updated metadata' },
        },
        required: ['id'],
      },
    },
  }],
};

// ─────────────────────────────────────────────
// DELETE LISTENER
// ─────────────────────────────────────────────

const DELETE_LISTENER_MUTATION = `
  mutation SocialEyesDeleteListener($id: ID!) {
    socialEyesDeleteListener(id: $id) {
      id
      name
    }
  }
`;

export const DeleteListener: Macro<SocialEyesMacroResult<{ id: string; name: string }>, DeleteListenerProps> = async (
  props: DeleteListenerProps,
  state: ChatState,
) => {
  const { id } = props;
  if (!id) return { success: false, error: 'id is required', tool: 'socialEyesDeleteListener', params: props };

  try {
    const result = await mutateGraph(DELETE_LISTENER_MUTATION, { id }, {}, state.context);
    const deleted = result?.socialEyesDeleteListener;
    logger.info(`socialEyesDeleteListener: deleted ${id}`);
    return {
      success: true,
      data: deleted,
      tool: 'socialEyesDeleteListener',
      params: props,
      instructions: `## Listener Deleted\n**${deleted?.name}** (ID: ${deleted?.id}) has been permanently removed.`,
    };
  } catch (error) {
    logger.error('socialEyesDeleteListener error:', error);
    return { success: false, error: (error as Error).message, tool: 'socialEyesDeleteListener', params: props };
  }
};

export const DeleteListenerRegistry: MacroComponentDefinition<typeof DeleteListener> = {
  component: DeleteListener,
  name: 'socialEyesDeleteListener',
  nameSpace: 'socialeyes-macros',
  version: '1.0.0',
  description: 'Permanently delete a social media listener by ID.',
  roles: ['USER'],
  stem: 'socialEyesDeleteListener',
  tags: ['social', 'listener', 'delete'],
  tools: [{
    type: 'function',
    function: {
      name: 'socialEyesDeleteListener',
      description: 'Permanently delete a social media listener. This action cannot be undone.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ID of the listener to delete' },
        },
        required: ['id'],
      },
    },
  }],
};

// ─────────────────────────────────────────────
// TOGGLE LISTENER
// ─────────────────────────────────────────────

const TOGGLE_LISTENER_MUTATION = `
  mutation SocialEyesToggleListener($id: ID!, $isActive: Boolean!) {
    socialEyesToggleListener(id: $id, isActive: $isActive) {
      id
      name
      isActive
    }
  }
`;

export const ToggleListener: Macro<SocialEyesMacroResult<{ id: string; name: string; isActive: boolean }>, ToggleListenerProps> = async (
  props: ToggleListenerProps,
  state: ChatState,
) => {
  const { id, isActive } = props;
  if (!id) return { success: false, error: 'id is required', tool: 'socialEyesToggleListener', params: props };
  if (isActive === undefined) return { success: false, error: 'isActive is required', tool: 'socialEyesToggleListener', params: props };

  try {
    const result = await mutateGraph(TOGGLE_LISTENER_MUTATION, { id, isActive }, {}, state.context);
    const listener = result?.socialEyesToggleListener;
    return {
      success: true,
      data: listener,
      tool: 'socialEyesToggleListener',
      params: props,
      instructions: `## Listener ${isActive ? 'Activated' : 'Paused'}\n**${listener?.name}** is now ${listener?.isActive ? 'active and monitoring' : 'paused'}.`,
    };
  } catch (error) {
    logger.error('socialEyesToggleListener error:', error);
    return { success: false, error: (error as Error).message, tool: 'socialEyesToggleListener', params: props };
  }
};

export const ToggleListenerRegistry: MacroComponentDefinition<typeof ToggleListener> = {
  component: ToggleListener,
  name: 'socialEyesToggleListener',
  nameSpace: 'socialeyes-macros',
  version: '1.0.0',
  description: 'Activate or pause a social media listener without deleting it.',
  roles: ['USER'],
  stem: 'socialEyesToggleListener',
  tags: ['social', 'listener', 'toggle', 'activate', 'pause'],
  tools: [{
    type: 'function',
    function: {
      name: 'socialEyesToggleListener',
      description: 'Activate or pause a social media listener.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ID of the listener to toggle' },
          isActive: { type: 'boolean', description: 'true to activate, false to pause' },
        },
        required: ['id', 'isActive'],
      },
    },
  }],
};
