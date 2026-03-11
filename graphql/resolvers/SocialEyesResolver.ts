import Reactory from '@reactorynet/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import { query, mutation, property } from '@reactory/server-core/models/graphql/decorators/resolver';
import SocialEyesService from '../../services/SocialEyesService';
import MessagingService from '../../services/MessagingService';

// ─────────────────────────────────────────────
// INPUT INTERFACES
// ─────────────────────────────────────────────

interface SocialEyesConnectAccountInput {
    platform: string;
    accessToken: string;
    refreshToken?: string;
    tokenExpiry?: Date;
    providerAccountId: string;
    name: string;
    email?: string;
    avatar?: string;
    scopes?: string[];
}

interface SocialEyesCreateListenerInput {
    name: string;
    platform: string;
    type: string;
    query: string;
    intervalMinutes?: number;
    actions?: string[];
    metadata?: Record<string, any>;
}

interface SocialEyesUpdateListenerInput {
    name?: string;
    platform?: string;
    type?: string;
    query?: string;
    intervalMinutes?: number;
    actions?: string[];
    metadata?: Record<string, any>;
}

interface SocialEyesSendMessageInput {
    accountId: string;
    to: string;
    content: string;
}

interface SocialEyesAccountLookupInput {
    platform: string;
    username?: string;
    userId?: string;
    accessToken?: string;
}

interface SocialEyesFeedFilter {
    platform?: string;
    dateFrom?: Date;
    dateTo?: Date;
    search?: string;
    listenerId?: string;
}

interface SocialEyesListenerFilter {
    platform?: string;
    type?: string;
    isActive?: boolean;
}

interface SocialEyesAccountFilter {
    platform?: string;
    isActive?: boolean;
    search?: string;
}

// ─────────────────────────────────────────────
// HELPER: Service resolution
// ─────────────────────────────────────────────

function getSocialEyesService(context: Reactory.Server.IReactoryContext): SocialEyesService {
    const svc = context.getService<SocialEyesService>('socialeyes.SocialEyesService@1.0.0');
    if (!svc) throw new Error('SocialEyesService not available');
    return svc;
}

function getMessagingService(context: Reactory.Server.IReactoryContext): MessagingService {
    const svc = context.getService<MessagingService>('socialeyes.MessagingService@1.0.0');
    if (!svc) throw new Error('MessagingService not available');
    return svc;
}

// @resolver()
class SocialEyesResolver {
    resolver: Reactory.Graph.IResolverStruct;

    // ─────────────────────────────────────────────
    // QUERIES
    // ─────────────────────────────────────────────

    /**
     * List all connected social accounts for the current user.
     */
    @query("socialEyesAccounts")
    @roles(["USER"])
    async getAccounts(
        obj: any,
        { filter }: { filter?: SocialEyesAccountFilter },
        context: Reactory.Server.IReactoryContext,
    ) {
        const svc = getSocialEyesService(context);
        try {
            const accounts = await svc.listAccounts(context.user.id, filter);
            return accounts;
        } catch (error) {
            context.error('Error fetching accounts', { error }, 'SocialEyesResolver.getAccounts');
            throw error;
        }
    }

    /**
     * Get a specific social account by ID.
     */
    @query("socialEyesAccount")
    @roles(["USER"])
    async getAccount(
        obj: any,
        { id }: { id: string },
        context: Reactory.Server.IReactoryContext,
    ) {
        const svc = getSocialEyesService(context);
        try {
            return await svc.getAccount(id);
        } catch (error) {
            context.error('Error fetching account', { id, error }, 'SocialEyesResolver.getAccount');
            throw error;
        }
    }

    /**
     * List all listeners for the current user with optional filtering.
     */
    @query("socialEyesListeners")
    @roles(["USER"])
    async getListeners(
        obj: any,
        { filter }: { filter?: SocialEyesListenerFilter },
        context: Reactory.Server.IReactoryContext,
    ) {
        const svc = getSocialEyesService(context);
        try {
            return await svc.listListeners(context.user.id, filter);
        } catch (error) {
            context.error('Error fetching listeners', { error }, 'SocialEyesResolver.getListeners');
            throw error;
        }
    }

    /**
     * Get a specific listener by ID.
     */
    @query("socialEyesListener")
    @roles(["USER"])
    async getListener(
        obj: any,
        { id }: { id: string },
        context: Reactory.Server.IReactoryContext,
    ) {
        const svc = getSocialEyesService(context);
        try {
            return await svc.getListener(id);
        } catch (error) {
            context.error('Error fetching listener', { id, error }, 'SocialEyesResolver.getListener');
            throw error;
        }
    }

    /**
     * Get the aggregated social feed with filtering and pagination.
     */
    @query("socialEyesFeed")
    @roles(["USER"])
    async getFeed(
        obj: any,
        { filter, paging }: { filter?: SocialEyesFeedFilter; paging?: Reactory.Models.IPagingRequest },
        context: Reactory.Server.IReactoryContext,
    ) {
        const svc = getSocialEyesService(context);
        try {
            const feedFilter = filter ? { ...filter, paging } : { paging };
            const result = await svc.getFeed(feedFilter);
            return {
                paging: result.paging,
                posts: result.items,
            };
        } catch (error) {
            context.error('Error fetching feed', { filter, error }, 'SocialEyesResolver.getFeed');
            throw error;
        }
    }

    /**
     * Get a specific social post by ID.
     */
    @query("socialEyesPost")
    @roles(["USER"])
    async getPost(
        obj: any,
        { id }: { id: string },
        context: Reactory.Server.IReactoryContext,
    ) {
        const svc = getSocialEyesService(context);
        try {
            return await svc.getPost(id);
        } catch (error) {
            context.error('Error fetching post', { id, error }, 'SocialEyesResolver.getPost');
            throw error;
        }
    }

    /**
     * Get the unified inbox for the current user.
     */
    @query("socialEyesInbox")
    @roles(["USER"])
    async getInbox(
        obj: any,
        { paging }: { paging?: Reactory.Models.IPagingRequest },
        context: Reactory.Server.IReactoryContext,
    ) {
        const messagingSvc = getMessagingService(context);
        try {
            const result = await messagingSvc.getInbox(context.user.id, paging);
            return {
                paging: result.paging,
                messages: result.items,
            };
        } catch (error) {
            context.error('Error fetching inbox', { error }, 'SocialEyesResolver.getInbox');
            throw error;
        }
    }

    /**
     * Get messages in a specific conversation thread.
     */
    @query("socialEyesConversation")
    @roles(["USER"])
    async getConversation(
        obj: any,
        { conversationId, paging }: { conversationId: string; paging?: Reactory.Models.IPagingRequest },
        context: Reactory.Server.IReactoryContext,
    ) {
        const messagingSvc = getMessagingService(context);
        try {
            const result = await messagingSvc.getConversation(conversationId, paging);
            return {
                paging: result.paging,
                messages: result.items,
            };
        } catch (error) {
            context.error('Error fetching conversation', { conversationId, error }, 'SocialEyesResolver.getConversation');
            throw error;
        }
    }

    /**
     * Get sent messages for the current user.
     */
    @query("socialEyesSentMessages")
    @roles(["USER"])
    async getSentMessages(
        obj: any,
        { paging }: { paging?: Reactory.Models.IPagingRequest },
        context: Reactory.Server.IReactoryContext,
    ) {
        const messagingSvc = getMessagingService(context);
        try {
            const result = await messagingSvc.getSentMessages(context.user.id, paging);
            return {
                paging: result.paging,
                messages: result.items,
            };
        } catch (error) {
            context.error('Error fetching sent messages', { error }, 'SocialEyesResolver.getSentMessages');
            throw error;
        }
    }

    /**
     * Look up a social media account by username or platform ID.
     * Uses a temporary adapter (no persisted account required).
     * Returns null if the account is not found or the lookup fails.
     */
    @query("socialEyesLookupAccount")
    @roles(["USER"])
    async lookupAccount(
        obj: any,
        { input }: { input: SocialEyesAccountLookupInput },
        context: Reactory.Server.IReactoryContext,
    ) {
        const svc = getSocialEyesService(context);
        try {
            return await svc.lookupAccount(input.platform, {
                username: input.username,
                userId: input.userId,
                accessToken: input.accessToken,
            });
        } catch (error) {
            context.error('Error looking up account', { input, error }, 'SocialEyesResolver.lookupAccount');
            return null;
        }
    }

    // ─────────────────────────────────────────────
    // MUTATIONS
    // ─────────────────────────────────────────────

    /**
     * Connect a new social media account.
     * Owner resolution:
     *   1. If input.email is provided, look up a matching Reactory user via UserService.
     *      If found, that user becomes the account owner.
     *   2. Otherwise, the currently authenticated user (context.user) is the owner.
     */
    @mutation("socialEyesConnectAccount")
    @roles(["USER"])
    async connectAccount(
        obj: any,
        { input }: { input: SocialEyesConnectAccountInput },
        context: Reactory.Server.IReactoryContext,
    ) {
        const svc = getSocialEyesService(context);
        try {
            // Resolve owner: check if a different user should own this account
            let ownerId: string = context.user._id.toString();

            if (input.email) {
                try {
                    const userService = context.getService<Reactory.Service.IReactoryUserService>(
                        'core.UserService@1.0.0',
                    );
                    const userByEmail = await userService.findUserWithEmail(input.email);
                    if (userByEmail && userByEmail._id) {
                        ownerId = userByEmail._id.toString();
                        context.info(
                            `Account owner resolved via email lookup: ${input.email} -> ${ownerId}`,
                            { email: input.email, ownerId },
                            'SocialEyesResolver.connectAccount',
                        );
                    }
                } catch (lookupError) {
                    context.warn(
                        `Could not look up user by email "${input.email}", defaulting to current user`,
                        { error: lookupError },
                        'SocialEyesResolver.connectAccount',
                    );
                }
            }

            return await svc.connectAccount(input.platform, {
                accessToken: input.accessToken,
                refreshToken: input.refreshToken,
                tokenExpiry: input.tokenExpiry,
                providerAccountId: input.providerAccountId,
                name: input.name,
                email: input.email,
                avatar: input.avatar,
                scopes: input.scopes,
            }, ownerId);
        } catch (error) {
            context.error('Error connecting account', { platform: input.platform, error }, 'SocialEyesResolver.connectAccount');
            throw error;
        }
    }

    /**
     * Disconnect (deactivate) a social media account.
     */
    @mutation("socialEyesDisconnectAccount")
    @roles(["USER"])
    async disconnectAccount(
        obj: any,
        { id }: { id: string },
        context: Reactory.Server.IReactoryContext,
    ) {
        const svc = getSocialEyesService(context);
        try {
            return await svc.disconnectAccount(id);
        } catch (error) {
            context.error('Error disconnecting account', { id, error }, 'SocialEyesResolver.disconnectAccount');
            throw error;
        }
    }

    /**
     * Refresh OAuth tokens for a connected account.
     */
    @mutation("socialEyesRefreshAccount")
    @roles(["USER"])
    async refreshAccount(
        obj: any,
        { id }: { id: string },
        context: Reactory.Server.IReactoryContext,
    ) {
        const svc = getSocialEyesService(context);
        try {
            return await svc.refreshAccount(id);
        } catch (error) {
            context.error('Error refreshing account', { id, error }, 'SocialEyesResolver.refreshAccount');
            throw error;
        }
    }

    /**
     * Create a new social media listener.
     */
    @mutation("socialEyesCreateListener")
    @roles(["USER"])
    async createListener(
        obj: any,
        { input }: { input: SocialEyesCreateListenerInput },
        context: Reactory.Server.IReactoryContext,
    ) {
        const svc = getSocialEyesService(context);
        try {
            return await svc.createListener(input, context.user._id.toString());
        } catch (error) {
            context.error('Error creating listener', { input, error }, 'SocialEyesResolver.createListener');
            throw error;
        }
    }

    /**
     * Update an existing listener.
     */
    @mutation("socialEyesUpdateListener")
    @roles(["USER"])
    async updateListener(
        obj: any,
        { id, input }: { id: string; input: SocialEyesUpdateListenerInput },
        context: Reactory.Server.IReactoryContext,
    ) {
        const svc = getSocialEyesService(context);
        try {
            return await svc.updateListener(id, input);
        } catch (error) {
            context.error('Error updating listener', { id, input, error }, 'SocialEyesResolver.updateListener');
            throw error;
        }
    }

    /**
     * Delete a listener permanently.
     */
    @mutation("socialEyesDeleteListener")
    @roles(["USER"])
    async deleteListener(
        obj: any,
        { id }: { id: string },
        context: Reactory.Server.IReactoryContext,
    ) {
        const svc = getSocialEyesService(context);
        try {
            return await svc.deleteListener(id);
        } catch (error) {
            context.error('Error deleting listener', { id, error }, 'SocialEyesResolver.deleteListener');
            throw error;
        }
    }

    /**
     * Toggle a listener's active state.
     */
    @mutation("socialEyesToggleListener")
    @roles(["USER"])
    async toggleListener(
        obj: any,
        { id, isActive }: { id: string; isActive: boolean },
        context: Reactory.Server.IReactoryContext,
    ) {
        const svc = getSocialEyesService(context);
        try {
            return await svc.toggleListener(id, isActive);
        } catch (error) {
            context.error('Error toggling listener', { id, isActive, error }, 'SocialEyesResolver.toggleListener');
            throw error;
        }
    }

    /**
     * Send a direct message via a connected social account.
     */
    @mutation("socialEyesSendMessage")
    @roles(["USER"])
    async sendMessage(
        obj: any,
        { input }: { input: SocialEyesSendMessageInput },
        context: Reactory.Server.IReactoryContext,
    ) {
        const messagingSvc = getMessagingService(context);
        try {
            return await messagingSvc.sendMessage(input.accountId, input.to, input.content);
        } catch (error) {
            context.error('Error sending message', { input, error }, 'SocialEyesResolver.sendMessage');
            throw error;
        }
    }

    /**
     * Reply to an existing direct message.
     */
    @mutation("socialEyesReplyToMessage")
    @roles(["USER"])
    async replyToMessage(
        obj: any,
        { messageId, content }: { messageId: string; content: string },
        context: Reactory.Server.IReactoryContext,
    ) {
        const messagingSvc = getMessagingService(context);
        try {
            return await messagingSvc.replyToMessage(messageId, content);
        } catch (error) {
            context.error('Error replying to message', { messageId, error }, 'SocialEyesResolver.replyToMessage');
            throw error;
        }
    }

    /**
     * Mark a message as read.
     */
    @mutation("socialEyesMarkMessageRead")
    @roles(["USER"])
    async markMessageRead(
        obj: any,
        { id }: { id: string },
        context: Reactory.Server.IReactoryContext,
    ) {
        const messagingSvc = getMessagingService(context);
        try {
            return await messagingSvc.markAsRead(id);
        } catch (error) {
            context.error('Error marking message as read', { id, error }, 'SocialEyesResolver.markMessageRead');
            throw error;
        }
    }

    /**
     * Sync inbox from a specific account's platform.
     */
    @mutation("socialEyesSyncInbox")
    @roles(["USER"])
    async syncInbox(
        obj: any,
        { accountId }: { accountId: string },
        context: Reactory.Server.IReactoryContext,
    ) {
        const messagingSvc = getMessagingService(context);
        try {
            return await messagingSvc.syncInbox(accountId);
        } catch (error) {
            context.error('Error syncing inbox', { accountId, error }, 'SocialEyesResolver.syncInbox');
            throw error;
        }
    }

    // ─────────────────────────────────────────────
    // PROPERTY RESOLVERS
    // ─────────────────────────────────────────────

    /**
     * Resolve the profileUrl for a SocialAccount based on platform conventions.
     */
    @property("SocialAccount", "profileUrl")
    resolveProfileUrl(account: any) {
        if (!account) return null;

        const provider = account.provider?.toLowerCase();
        const name = account.name;

        switch (provider) {
            case 'x':
            case 'twitter': {
                const handle = name?.startsWith('@') ? name.substring(1) : name;
                return `https://twitter.com/${handle}`;
            }
            case 'reddit': {
                const username = name?.startsWith('u/') ? name.substring(2) : name;
                return `https://reddit.com/u/${username}`;
            }
            default:
                return null;
        }
    }
}

export default SocialEyesResolver;
