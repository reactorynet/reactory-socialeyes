import { TwitterApi, TweetV2 } from 'twitter-api-v2';
import { AbstractSocialAdapter, ISocialSearchResults } from '../base';
import { ISocialAccountDocument } from '../../models/Account';
import { ISocialPost, ISocialPostDocument, SocialPost } from '../../models/Post';
import { ISocialMessage, ISocialMessageDocument, SocialMessage } from '../../models/Message';

/**
 * Default tweet fields to request from the X API v2.
 */
const TWEET_FIELDS = [
    'id', 'text', 'created_at', 'author_id',
    'public_metrics', 'entities', 'referenced_tweets',
    'conversation_id', 'in_reply_to_user_id',
] as const;

const USER_FIELDS = [
    'id', 'name', 'username', 'profile_image_url',
] as const;

const TWEET_EXPANSIONS = [
    'author_id', 'referenced_tweets.id',
] as const;

/**
 * X (Twitter) Adapter
 *
 * Full integration with the X (Twitter) API v2 using the twitter-api-v2 library.
 * Supports OAuth 2.0 user context authentication.
 */
export class XAdapter extends AbstractSocialAdapter {
    name: string = 'XAdapter';
    description: string = 'X (Twitter) Platform Adapter';

    private client: TwitterApi;

    constructor(props: any, context: Reactory.Server.IReactoryContext) {
        super(props, context);
        this.initializeClient();
    }

    /**
     * Initialize the TwitterApi client from stored account credentials.
     * Supports both OAuth 2.0 user context (with access + refresh tokens) and
     * app-only bearer token authentication.
     */
    private initializeClient(): void {
        if (this.account.accessToken) {
            this.client = new TwitterApi(this.account.accessToken);
        } else {
            // Fallback to app-level bearer token from environment
            const bearerToken = process.env.X_BEARER_TOKEN;
            if (bearerToken) {
                this.client = new TwitterApi(bearerToken);
            } else {
                this.context.warn(
                    'No X API credentials available. Adapter will fail on API calls.',
                    { accountId: this.account._id },
                    'XAdapter.initializeClient',
                );
            }
        }

        this.context.debug('X API client initialized', { accountId: this.account._id }, 'XAdapter.initializeClient');
    }

    /**
     * Connect / validate credentials. If a refresh token is available and the
     * current token is nearing expiry, attempt a token refresh.
     */
    async connect(credentials: any): Promise<ISocialAccountDocument> {
        try {
            // If refresh token flow is available, try refreshing
            if (credentials.refreshToken && this.isTokenExpiring()) {
                const refreshed = await this.refreshTokens(credentials.refreshToken);
                this.account.accessToken = refreshed.accessToken;
                this.account.refreshToken = refreshed.refreshToken;
                this.account.tokenExpiry = refreshed.expiresAt;
                this.client = new TwitterApi(refreshed.accessToken);
            } else if (credentials.accessToken) {
                this.account.accessToken = credentials.accessToken;
                this.account.refreshToken = credentials.refreshToken;
                this.account.tokenExpiry = credentials.tokenExpiry;
                this.client = new TwitterApi(credentials.accessToken);
            }

            // Validate by fetching the authenticated user
            const { data: me } = await this.client.v2.me({
                'user.fields': ['id', 'name', 'username', 'profile_image_url'],
            });

            // Update account metadata from the API response
            this.account.providerAccountId = me.id;
            this.account.name = `@${me.username}`;
            this.account.metadata = {
                ...this.account.metadata,
                displayName: me.name,
                username: me.username,
                avatar: (me as any).profile_image_url,
            };
            this.account.updatedAt = new Date();
            await this.account.save();

            this.context.info('X account connected', {
                accountId: this.account._id,
                username: me.username,
            }, 'XAdapter.connect');

            return this.account;
        } catch (error) {
            this.context.error('Failed to connect X account', { error }, 'XAdapter.connect');
            throw error;
        }
    }

    /**
     * Search for tweets matching a query using the X v2 search/recent endpoint.
     */
    async search(query: string, options?: any): Promise<ISocialSearchResults> {
        try {
            this.context.debug('Searching X', { query, options }, 'XAdapter.search');

            const searchParams: any = {
                'tweet.fields': TWEET_FIELDS.join(','),
                'user.fields': USER_FIELDS.join(','),
                expansions: TWEET_EXPANSIONS.join(','),
                max_results: options?.limit || 25,
            };

            if (options?.next_token) {
                searchParams.next_token = options.next_token;
            }

            const result = await this.client.v2.search(query, searchParams);

            // Build a user lookup map from includes
            const userMap = new Map<string, any>();
            if (result.includes?.users) {
                for (const user of result.includes.users) {
                    userMap.set(user.id, user);
                }
            }

            const posts: ISocialPost[] = [];
            if (result.data?.data) {
                for (const tweet of result.data.data) {
                    const author = userMap.get(tweet.author_id);
                    posts.push(this.transformTweetToPost(tweet, author));
                }
            }

            return {
                posts,
                nextCursor: result.data?.meta?.next_token,
            };
        } catch (error) {
            this.context.error('X search failed', { query, error }, 'XAdapter.search');
            throw error;
        }
    }

    /**
     * Fetch a single tweet by ID and cache it in MongoDB.
     */
    async getPost(id: string): Promise<ISocialPostDocument | null> {
        try {
            // Check DB first
            const existing = await SocialPost.findOne({ platform: 'x', sourceId: id });
            if (existing) return existing;

            const { data: tweet, includes } = await this.client.v2.singleTweet(id, {
                'tweet.fields': TWEET_FIELDS.join(','),
                'user.fields': USER_FIELDS.join(','),
                expansions: TWEET_EXPANSIONS.join(','),
            });

            const author = includes?.users?.find((u) => u.id === tweet.author_id);
            const post = this.transformTweetToPost(tweet, author);

            return await SocialPost.create(post);
        } catch (error) {
            this.context.error('Failed to get X post', { id, error }, 'XAdapter.getPost');
            return null;
        }
    }

    /**
     * Send a direct message to a user on X.
     */
    async sendMessage(to: string, content: string, attachments?: any[]): Promise<ISocialMessageDocument> {
        try {
            this.context.debug('Sending X DM', { to }, 'XAdapter.sendMessage');

            const result = await this.client.v2.sendDmToParticipant(to, {
                text: content,
            });

            const dmEventId = (result as any).dm_event_id || `x-dm-${Date.now()}`;
            const conversationId = (result as any).dm_conversation_id || `conv-${to}`;

            const message: ISocialMessage = {
                platform: 'x',
                sourceId: dmEventId,
                conversationId,
                from: {
                    id: this.account.providerAccountId,
                    username: this.account.name,
                },
                to: [{ id: to, username: to }],
                content,
                attachments: attachments?.map((a) => ({ type: a.type || 'file', url: a.url })),
                isIncoming: false,
                sentAt: new Date(),
                accountId: this.account._id,
            };

            return await SocialMessage.create(message);
        } catch (error) {
            this.context.error('Failed to send X DM', { to, error }, 'XAdapter.sendMessage');
            throw error;
        }
    }

    /**
     * Retrieve direct message events from X.
     */
    async getMessages(since?: Date, limit: number = 50): Promise<ISocialMessage[]> {
        try {
            this.context.debug('Fetching X DMs', { since, limit }, 'XAdapter.getMessages');

            const result = await this.client.v2.listDmEvents({
                max_results: Math.min(limit, 100),
                event_types: 'MessageCreate',
            });

            const messages: ISocialMessage[] = [];

            if (result.data?.data) {
                for (const event of result.data.data) {
                    const eventDate = new Date(event.created_at);
                    if (since && eventDate < since) continue;

                    messages.push(this.transformDmEventToMessage(event));
                }
            }

            return messages;
        } catch (error) {
            this.context.error('Failed to get X messages', { error }, 'XAdapter.getMessages');
            return [];
        }
    }

    /**
     * Post a tweet, optionally as a reply.
     */
    async postUpdate(content: string, replyToId?: string): Promise<ISocialPostDocument> {
        try {
            this.context.debug('Posting to X', { replyToId }, 'XAdapter.postUpdate');

            const tweetParams: any = { text: content };
            if (replyToId) {
                tweetParams.reply = { in_reply_to_tweet_id: replyToId };
            }

            const { data: tweet } = await this.client.v2.tweet(tweetParams);

            const post: ISocialPost = {
                platform: 'x',
                sourceId: tweet.id,
                url: `https://twitter.com/i/web/status/${tweet.id}`,
                author: {
                    id: this.account.providerAccountId,
                    username: this.account.name,
                },
                content: tweet.text,
                publishedAt: new Date(),
                collectedAt: new Date(),
            };

            return await SocialPost.create(post);
        } catch (error) {
            this.context.error('Failed to post to X', { error }, 'XAdapter.postUpdate');
            throw error;
        }
    }

    // ─────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────

    /**
     * Check if the current token is expiring within 5 minutes.
     */
    private isTokenExpiring(): boolean {
        if (!this.account.tokenExpiry) return false;
        const fiveMinutes = 5 * 60 * 1000;
        return this.account.tokenExpiry.getTime() - Date.now() < fiveMinutes;
    }

    /**
     * Refresh OAuth 2.0 tokens using the refresh token.
     */
    private async refreshTokens(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresAt: Date;
    }> {
        const clientId = process.env.X_CLIENT_ID;
        const clientSecret = process.env.X_CLIENT_SECRET;

        if (!clientId) {
            throw new Error('X_CLIENT_ID environment variable is required for token refresh');
        }

        const tempClient = new TwitterApi({
            clientId,
            clientSecret,
        });

        const { accessToken, refreshToken: newRefresh, expiresIn } =
            await tempClient.refreshOAuth2Token(refreshToken);

        return {
            accessToken,
            refreshToken: newRefresh,
            expiresAt: new Date(Date.now() + expiresIn * 1000),
        };
    }

    /**
     * Transform a Twitter API v2 tweet object to our normalized ISocialPost.
     */
    private transformTweetToPost(tweet: TweetV2, author?: any): ISocialPost {
        return {
            platform: 'x',
            sourceId: tweet.id,
            url: `https://twitter.com/i/web/status/${tweet.id}`,
            author: {
                id: tweet.author_id || author?.id || 'unknown',
                username: author?.username || 'unknown',
                name: author?.name,
                avatar: author?.profile_image_url,
            },
            content: tweet.text,
            hashtags: tweet.entities?.hashtags?.map((h: any) => h.tag),
            mentions: tweet.entities?.mentions?.map((m: any) => m.username),
            metrics: {
                likes: tweet.public_metrics?.like_count || 0,
                shares: tweet.public_metrics?.retweet_count || 0,
                comments: tweet.public_metrics?.reply_count || 0,
                views: tweet.public_metrics?.impression_count || 0,
            },
            publishedAt: tweet.created_at ? new Date(tweet.created_at) : new Date(),
            collectedAt: new Date(),
        };
    }

    /**
     * Transform a DM event from the X API to our normalized ISocialMessage.
     */
    private transformDmEventToMessage(event: any): ISocialMessage {
        return {
            platform: 'x',
            sourceId: event.id,
            conversationId: event.dm_conversation_id || event.id,
            from: {
                id: event.sender_id || 'unknown',
                username: event.sender_id || 'unknown',
            },
            to: [{
                id: event.participant_ids?.find((id: string) => id !== event.sender_id) || this.account.providerAccountId,
                username: this.account.name,
            }],
            content: event.text || '',
            isIncoming: event.sender_id !== this.account.providerAccountId,
            sentAt: new Date(event.created_at),
            accountId: this.account._id,
        };
    }
}

export default XAdapter;
