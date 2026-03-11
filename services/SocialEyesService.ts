import mongoose from 'mongoose';
import { service } from '@reactory/server-core/application/decorators';
import { SocialAccount, ISocialAccountDocument } from '../models/Account';
import { SocialListener, ISocialListenerDocument } from '../models/Listener';
import { SocialPost, ISocialPostDocument } from '../models/Post';
import { ISocialAdapter, ISocialAccountLookupResult, ISocialAccountLookupOptions } from '../adapters/base';
import { XAdapter } from '../adapters/x';
import { RedditAdapter } from '../adapters/reddit';


interface AccountFilter {
    platform?: string;
    isActive?: boolean;
    search?: string;
}

interface ListenerFilter {
    platform?: string;
    type?: string;
    isActive?: boolean;
}

interface FeedFilter {
    platform?: string;
    dateFrom?: Date;
    dateTo?: Date;
    search?: string;
    listenerId?: string;
    paging?: Reactory.Models.IPagingRequest;
}

@service({
    id: 'socialeyes.SocialEyesService@1.0.0',
    name: 'SocialEyesService',
    nameSpace: 'socialeyes',
    description: 'Core orchestration service for SocialEyes module - manages accounts, adapters, listeners, and feed aggregation',
    serviceType: 'data',
    dependencies: [],
})
export default class SocialEyesService implements Reactory.Service.IReactoryService {

    name: string = 'SocialEyesService';
    nameSpace: string = 'socialeyes';
    version: string = '1.0.0';
    description: string = 'Core orchestration service for SocialEyes module';
    tags: string[] = ['social', 'orchestration'];

    private context: Reactory.Server.IReactoryContext;

    constructor(
        props: Reactory.Service.IReactoryServiceProps,
        context: Reactory.Server.IReactoryContext,
    ) {
        this.context = context;
    }

    // ─────────────────────────────────────────────
    // ADAPTER FACTORY
    // ─────────────────────────────────────────────

    /**
     * Create and return the appropriate adapter for a given platform and account.
     */
    getAdapter(platform: string, account: ISocialAccountDocument, context?: Reactory.Server.IReactoryContext): ISocialAdapter {
        const ctx = context || this.context;
        switch (platform.toLowerCase()) {
            case 'x':
            case 'twitter':
                return new XAdapter({ account }, ctx);
            case 'reddit':
                return new RedditAdapter({ account }, ctx);
            default:
                throw new Error(`Unsupported platform: ${platform}`);
        }
    }

    /**
     * Get an adapter for a given account ID.
     */
    async getAdapterForAccount(accountId: string): Promise<{ adapter: ISocialAdapter; account: ISocialAccountDocument }> {
        const account = await SocialAccount.findById(accountId);
        if (!account) {
            throw new Error(`Account not found: ${accountId}`);
        }
        const adapter = this.getAdapter(account.provider, account);
        return { adapter, account };
    }

    // ─────────────────────────────────────────────
    // ACCOUNT MANAGEMENT
    // ─────────────────────────────────────────────

    /**
     * List accounts for a user with optional filters.
     */
    async listAccounts(userId: string, filter?: AccountFilter): Promise<ISocialAccountDocument[]> {
        try {
            // only filter by owner if the user is not an admin - admins can see all accounts
            const query: any = { };
            if (!this.context.hasRole('ADMIN')) {
                query.owner = userId;
            }
            if (filter?.platform) query.provider = filter.platform;
            if (filter?.isActive !== undefined) query.isActive = filter.isActive;
            if (filter?.search) query.$or = [
                { name: { $regex: filter.search, $options: 'i' } },
                { email: { $regex: filter.search, $options: 'i' } }
            ];

            const accounts = await SocialAccount.find(query).sort({ createdAt: -1 });
            this.context.debug('Listed accounts', { userId, count: accounts.length }, 'SocialEyesService.listAccounts');
            return accounts;
        } catch (error) {
            this.context.error('Failed to list accounts', { userId, error }, 'SocialEyesService.listAccounts');
            throw error;
        }
    }

    /**
     * Get a single account by ID.
     */
    async getAccount(id: string): Promise<ISocialAccountDocument | null> {
        try {
            return await SocialAccount.findById(id);
        } catch (error) {
            this.context.error('Failed to get account', { id, error }, 'SocialEyesService.getAccount');
            throw error;
        }
    }

    /**
     * Connect a new social media account.
     * Creates the account record and validates credentials via the adapter.
     *
     * Owner resolution:
     *   - If userId is provided it is used as the account owner.
     *   - If userId is not provided, the current context user is used as fallback.
     *   - An error is thrown if no owner can be resolved (should never happen
     *     when called from an authenticated resolver).
     */
    async connectAccount(
        platform: string,
        credentials: {
            accessToken: string;
            refreshToken?: string;
            tokenExpiry?: Date;
            providerAccountId: string;
            name: string;
            email?: string;
            avatar?: string;
            scopes?: string[];
        },
        userId?: string,
    ): Promise<ISocialAccountDocument> {
        try {
            // Resolve the owner – prefer explicit userId, fall back to context user
            const resolvedOwner = userId || this.context?.user?._id?.toString();

            if (!resolvedOwner) {
                throw new Error('Cannot connect account: no owner could be resolved. Ensure the request is authenticated or an explicit userId is provided.');
            }

            this.context.info('Connecting social account', { platform, owner: resolvedOwner }, 'SocialEyesService.connectAccount');

            // Check for existing account
            let account = await SocialAccount.findOne({
                provider: platform,
                providerAccountId: credentials.providerAccountId,
            });

            if (account) {
                // Update existing account – also ensure owner is set if it was missing
                account.accessToken = credentials.accessToken;
                account.refreshToken = credentials.refreshToken;
                account.tokenExpiry = credentials.tokenExpiry;
                account.name = credentials.name;
                account.email = credentials.email;
                account.avatar = credentials.avatar;
                account.scopes = credentials.scopes;
                account.isActive = true;
                if (!account.owner) {
                    account.owner = new mongoose.Types.ObjectId(resolvedOwner);
                }
                account.updatedAt = new Date();
                await account.save();
            } else {
                // Create new account
                account = await SocialAccount.create({
                    provider: platform,
                    providerAccountId: credentials.providerAccountId,
                    name: credentials.name,
                    email: credentials.email,
                    avatar: credentials.avatar,
                    accessToken: credentials.accessToken,
                    refreshToken: credentials.refreshToken,
                    tokenExpiry: credentials.tokenExpiry,
                    scopes: credentials.scopes,
                    isActive: true,
                    owner: new mongoose.Types.ObjectId(resolvedOwner),
                });
            }

            // Validate by connecting via adapter
            const adapter = this.getAdapter(platform, account);
            await adapter.connect(credentials);

            this.context.info('Social account connected', {
                platform,
                accountId: account._id,
                owner: resolvedOwner,
            }, 'SocialEyesService.connectAccount');

            return account;
        } catch (error) {
            this.context.error('Failed to connect account', { platform, error }, 'SocialEyesService.connectAccount');
            throw error;
        }
    }

    /**
     * Disconnect (deactivate) a social account.
     */
    async disconnectAccount(id: string): Promise<ISocialAccountDocument | null> {
        try {
            const account = await SocialAccount.findById(id);
            if (!account) {
                throw new Error(`Account not found: ${id}`);
            }

            account.isActive = false;
            account.updatedAt = new Date();
            await account.save();

            // Deactivate all listeners for this account
            await SocialListener.updateMany(
                { owner: account.owner, platform: account.provider },
                { isActive: false, updatedAt: new Date() },
            );

            this.context.info('Account disconnected', { id }, 'SocialEyesService.disconnectAccount');
            return account;
        } catch (error) {
            this.context.error('Failed to disconnect account', { id, error }, 'SocialEyesService.disconnectAccount');
            throw error;
        }
    }

    /**
     * Refresh tokens for an account via its adapter.
     */
    async refreshAccount(id: string): Promise<ISocialAccountDocument | null> {
        try {
            const account = await SocialAccount.findById(id);
            if (!account) {
                throw new Error(`Account not found: ${id}`);
            }

            const adapter = this.getAdapter(account.provider, account);
            const refreshed = await adapter.connect({
                accessToken: account.accessToken,
                refreshToken: account.refreshToken,
            });

            this.context.info('Account refreshed', { id }, 'SocialEyesService.refreshAccount');
            return refreshed;
        } catch (error) {
            this.context.error('Failed to refresh account', { id, error }, 'SocialEyesService.refreshAccount');
            throw error;
        }
    }

    /**
     * Look up a social media account by username or platform ID using the platform adapter.
     * Creates a temporary, non-persisted account object to initialise the adapter.
     * If no accessToken is provided the adapter falls back to a server-level bearer token
     * (e.g. X_BEARER_TOKEN env var) so unauthenticated public profile lookups work.
     */
    async lookupAccount(
        platform: string,
        options: { username?: string; userId?: string; accessToken?: string },
    ): Promise<ISocialAccountLookupResult | null> {
        if (!options.username && !options.userId) {
            throw new Error('Either username or userId must be provided for account lookup');
        }

        // Build a minimal temporary account – never saved to the database.
        const tempAccount = {
            _id: new mongoose.Types.ObjectId(),
            provider: platform,
            accessToken: options.accessToken || '',
            providerAccountId: '',
            name: '',
            isActive: false,
            owner: new mongoose.Types.ObjectId(),
        } as unknown as ISocialAccountDocument;

        try {
            const adapter = this.getAdapter(platform, tempAccount);
            const lookupOptions: ISocialAccountLookupOptions = {};
            if (options.username) lookupOptions.username = options.username;
            if (options.userId) lookupOptions.userId = options.userId;

            return await adapter.lookupAccount(lookupOptions);
        } catch (error) {
            this.context.error('Account lookup failed', { platform, options, error }, 'SocialEyesService.lookupAccount');
            return null;
        }
    }

    // ─────────────────────────────────────────────
    // LISTENER MANAGEMENT
    // ─────────────────────────────────────────────

    /**
     * Create a new listener configuration.
     */
    async createListener(
        input: {
            name: string;
            platform: string;
            type: string;
            query: string;
            intervalMinutes?: number;
            actions?: string[];
            metadata?: Record<string, any>;
        },
        userId: string,
    ): Promise<ISocialListenerDocument> {
        try {
            const listener = await SocialListener.create({
                name: input.name,
                platform: input.platform,
                type: input.type,
                query: input.query,
                intervalMinutes: input.intervalMinutes ?? 15,
                actions: input.actions ?? ['emit-event'],
                isActive: true,
                owner: userId,
                metadata: input.metadata,
            });

            this.context.info('Listener created', {
                listenerId: listener._id,
                name: input.name,
            }, 'SocialEyesService.createListener');

            return listener;
        } catch (error) {
            this.context.error('Failed to create listener', { input, error }, 'SocialEyesService.createListener');
            throw error;
        }
    }

    /**
     * Update an existing listener.
     */
    async updateListener(
        id: string,
        input: Partial<{
            name: string;
            platform: string;
            type: string;
            query: string;
            intervalMinutes: number;
            actions: string[];
            metadata: Record<string, any>;
        }>,
    ): Promise<ISocialListenerDocument | null> {
        try {
            const listener = await SocialListener.findByIdAndUpdate(
                id,
                { ...input, updatedAt: new Date() },
                { new: true },
            );

            if (listener) {
                this.context.info('Listener updated', { id }, 'SocialEyesService.updateListener');
            }

            return listener;
        } catch (error) {
            this.context.error('Failed to update listener', { id, error }, 'SocialEyesService.updateListener');
            throw error;
        }
    }

    /**
     * Delete a listener.
     */
    async deleteListener(id: string): Promise<boolean> {
        try {
            const result = await SocialListener.findByIdAndDelete(id);
            this.context.info('Listener deleted', { id }, 'SocialEyesService.deleteListener');
            return !!result;
        } catch (error) {
            this.context.error('Failed to delete listener', { id, error }, 'SocialEyesService.deleteListener');
            throw error;
        }
    }

    /**
     * Toggle listener active state.
     */
    async toggleListener(id: string, isActive: boolean): Promise<ISocialListenerDocument | null> {
        try {
            const listener = await SocialListener.findByIdAndUpdate(
                id,
                { isActive, updatedAt: new Date() },
                { new: true },
            );

            if (listener) {
                this.context.info('Listener toggled', { id, isActive }, 'SocialEyesService.toggleListener');
            }

            return listener;
        } catch (error) {
            this.context.error('Failed to toggle listener', { id, error }, 'SocialEyesService.toggleListener');
            throw error;
        }
    }

    /**
     * List listeners for a user with optional filters.
     */
    async listListeners(userId: string, filter?: ListenerFilter): Promise<ISocialListenerDocument[]> {
        try {
            const query: any = { owner: userId };
            if (filter?.platform) query.platform = filter.platform;
            if (filter?.type) query.type = filter.type;
            if (filter?.isActive !== undefined) query.isActive = filter.isActive;

            return await SocialListener.find(query).sort({ createdAt: -1 });
        } catch (error) {
            this.context.error('Failed to list listeners', { userId, error }, 'SocialEyesService.listListeners');
            throw error;
        }
    }

    /**
     * Get a single listener by ID.
     */
    async getListener(id: string): Promise<ISocialListenerDocument | null> {
        try {
            return await SocialListener.findById(id);
        } catch (error) {
            this.context.error('Failed to get listener', { id, error }, 'SocialEyesService.getListener');
            throw error;
        }
    }

    // ─────────────────────────────────────────────
    // FEED / POSTS
    // ─────────────────────────────────────────────

    /**
     * Get the aggregated feed with filtering and pagination.
     */
    async getFeed(filter?: FeedFilter): Promise<Reactory.Models.IPagedResponse<ISocialPostDocument>> {
        try {
            const query: any = {};
            if (filter?.platform) query.platform = filter.platform;
            if (filter?.listenerId) query.listenerId = filter.listenerId;
            if (filter?.dateFrom || filter?.dateTo) {
                query.publishedAt = {};
                if (filter.dateFrom) query.publishedAt.$gte = filter.dateFrom;
                if (filter.dateTo) query.publishedAt.$lte = filter.dateTo;
            }
            if (filter?.search) {
                query.$text = { $search: filter.search };
            }

            const page = filter?.paging?.page || 1;
            const pageSize = filter?.paging?.pageSize || 20;
            const skip = (page - 1) * pageSize;

            const [items, total] = await Promise.all([
                SocialPost.find(query)
                    .sort({ publishedAt: -1 })
                    .skip(skip)
                    .limit(pageSize)
                    .exec(),
                SocialPost.countDocuments(query),
            ]);

            return {
                items,
                paging: {
                    total,
                    page,
                    pageSize,
                    hasNext: skip + pageSize < total,
                },
            };
        } catch (error) {
            this.context.error('Failed to get feed', { filter, error }, 'SocialEyesService.getFeed');
            throw error;
        }
    }

    /**
     * Get a single post by its MongoDB ID.
     */
    async getPost(id: string): Promise<ISocialPostDocument | null> {
        try {
            return await SocialPost.findById(id);
        } catch (error) {
            this.context.error('Failed to get post', { id, error }, 'SocialEyesService.getPost');
            throw error;
        }
    }

    /**
     * Get a post by its platform source ID.
     */
    async getPostBySourceId(platform: string, sourceId: string): Promise<ISocialPostDocument | null> {
        try {
            return await SocialPost.findOne({ platform, sourceId });
        } catch (error) {
            this.context.error('Failed to get post by sourceId', { platform, sourceId, error }, 'SocialEyesService.getPostBySourceId');
            throw error;
        }
    }

    setExecutionContext(context: Reactory.Server.IReactoryContext): void {
        this.context = context;
    }
}
