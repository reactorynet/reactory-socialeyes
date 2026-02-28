import Snoowrap from 'snoowrap';
import { AbstractSocialAdapter, ISocialSearchResults } from '../base';
import { ISocialAccountDocument } from '../../models/Account';
import { ISocialPost, ISocialPostDocument, SocialPost } from '../../models/Post';
import { ISocialMessage, ISocialMessageDocument, SocialMessage } from '../../models/Message';

/**
 * Reddit Adapter
 *
 * Full integration with the Reddit API using the snoowrap library.
 * Requires Reddit API credentials (client_id, client_secret, refresh_token).
 */
export class RedditAdapter extends AbstractSocialAdapter {
    name: string = 'RedditAdapter';
    description: string = 'Reddit Platform Adapter';

    private client: Snoowrap;

    constructor(props: any, context: Reactory.Server.IReactoryContext) {
        super(props, context);
        this.initializeClient();
    }

    /**
     * Initialize the snoowrap client from stored account credentials.
     */
    private initializeClient(): void {
        const clientId = process.env.REDDIT_CLIENT_ID;
        const clientSecret = process.env.REDDIT_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            this.context.warn(
                'Reddit API credentials not configured. Set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET.',
                { accountId: this.account._id },
                'RedditAdapter.initializeClient',
            );
            return;
        }

        try {
            this.client = new Snoowrap({
                userAgent: 'Reactory SocialEyes v1.0.0',
                clientId,
                clientSecret,
                refreshToken: this.account.refreshToken,
                accessToken: this.account.accessToken,
            });

            // Configure rate limiting
            this.client.config({
                requestDelay: 1000,
                continueAfterRatelimitError: true,
                warnings: false,
            });

            this.context.debug('Reddit API client initialized', { accountId: this.account._id }, 'RedditAdapter.initializeClient');
        } catch (error) {
            this.context.error('Failed to initialize Reddit client', { error }, 'RedditAdapter.initializeClient');
        }
    }

    /**
     * Connect / validate credentials by fetching the authenticated user profile.
     */
    async connect(credentials: any): Promise<ISocialAccountDocument> {
        try {
            if (credentials.accessToken) {
                this.account.accessToken = credentials.accessToken;
            }
            if (credentials.refreshToken) {
                this.account.refreshToken = credentials.refreshToken;
            }

            // Re-initialize with new credentials
            this.initializeClient();

            // Validate by fetching the authenticated user
            const me = await this.client.getMe();

            this.account.providerAccountId = (me as any).id;
            this.account.name = `u/${me.name}`;
            this.account.isActive = true;
            this.account.metadata = {
                ...this.account.metadata,
                displayName: me.name,
                karma: (me as any).total_karma,
                iconUrl: (me as any).icon_img,
            };
            this.account.updatedAt = new Date();
            await this.account.save();

            this.context.info('Reddit account connected', {
                accountId: this.account._id,
                username: me.name,
            }, 'RedditAdapter.connect');

            return this.account;
        } catch (error) {
            this.context.error('Failed to connect Reddit account', { error }, 'RedditAdapter.connect');
            throw error;
        }
    }

    /**
     * Search Reddit for submissions matching a query.
     */
    async search(query: string, options?: any): Promise<ISocialSearchResults> {
        try {
            this.context.debug('Searching Reddit', { query, options }, 'RedditAdapter.search');

            const searchOptions: any = {
                query,
                sort: options?.sort || 'relevance',
                time: options?.time || 'week',
                limit: options?.limit || 25,
            };

            let results: any[];
            if (options?.subreddit) {
                results = await this.client.getSubreddit(options.subreddit).search(searchOptions) as any;
            } else {
                results = await this.client.search(searchOptions) as any;
            }

            const posts: ISocialPost[] = [];
            for (const submission of results) {
                posts.push(this.transformSubmissionToPost(submission));
            }

            // snoowrap doesn't use cursor pagination in the same way —
            // use the last item's fullname as the "after" cursor
            const lastItem = results[results.length - 1];
            const nextCursor = results.length >= (options?.limit || 25) && lastItem
                ? (lastItem as any).name  // Reddit fullname (e.g. "t3_abc123")
                : undefined;

            return {
                posts,
                nextCursor,
            };
        } catch (error) {
            this.context.error('Reddit search failed', { query, error }, 'RedditAdapter.search');
            throw error;
        }
    }

    /**
     * Fetch a single submission by ID and cache it in MongoDB.
     */
    async getPost(id: string): Promise<ISocialPostDocument | null> {
        try {
            // Check DB first
            const existing = await SocialPost.findOne({ platform: 'reddit', sourceId: id });
            if (existing) return existing;

            const submission = await this.client.getSubmission(id).fetch() as any;
            const post = this.transformSubmissionToPost(submission);

            return await SocialPost.create(post);
        } catch (error) {
            this.context.error('Failed to get Reddit post', { id, error }, 'RedditAdapter.getPost');
            return null;
        }
    }

    /**
     * Send a private message on Reddit.
     */
    async sendMessage(to: string, content: string, attachments?: any[]): Promise<ISocialMessageDocument> {
        try {
            this.context.debug('Sending Reddit message', { to }, 'RedditAdapter.sendMessage');

            await this.client.composeMessage({
                to,
                subject: 'Message via SocialEyes',
                text: content,
            });

            // Save to our database
            const message: ISocialMessage = {
                platform: 'reddit',
                sourceId: `reddit-msg-${Date.now()}`,
                conversationId: `conversation-${to}`,
                from: {
                    id: this.account.providerAccountId,
                    username: this.account.name,
                },
                to: [{ id: to, username: to }],
                content,
                isIncoming: false,
                sentAt: new Date(),
                accountId: this.account._id,
            };

            return await SocialMessage.create(message);
        } catch (error) {
            this.context.error('Failed to send Reddit message', { to, error }, 'RedditAdapter.sendMessage');
            throw error;
        }
    }

    /**
     * Retrieve inbox messages from Reddit.
     */
    async getMessages(since?: Date, limit: number = 50): Promise<ISocialMessage[]> {
        try {
            this.context.debug('Fetching Reddit messages', { since, limit }, 'RedditAdapter.getMessages');

            const inbox = await this.client.getInbox({ limit }) as any[];

            const messages: ISocialMessage[] = [];
            for (const item of inbox) {
                const messageDate = new Date(item.created_utc * 1000);
                if (since && messageDate < since) continue;

                messages.push(this.transformRedditMessage(item));
            }

            return messages;
        } catch (error) {
            this.context.error('Failed to get Reddit messages', { error }, 'RedditAdapter.getMessages');
            return [];
        }
    }

    /**
     * Post a reply to a Reddit submission or comment.
     */
    async postUpdate(content: string, replyToId?: string): Promise<ISocialPostDocument> {
        try {
            this.context.debug('Posting to Reddit', { replyToId }, 'RedditAdapter.postUpdate');

            if (!replyToId) {
                throw new Error('Reddit requires a replyToId (submission or comment ID) for posting');
            }

            const reply = await this.client.getSubmission(replyToId).reply(content) as any;

            const post: ISocialPost = {
                platform: 'reddit',
                sourceId: reply.id || `reddit-reply-${Date.now()}`,
                url: reply.permalink ? `https://reddit.com${reply.permalink}` : undefined,
                author: {
                    id: this.account.providerAccountId,
                    username: this.account.name,
                },
                content,
                publishedAt: new Date(),
                collectedAt: new Date(),
            };

            return await SocialPost.create(post);
        } catch (error) {
            this.context.error('Failed to post to Reddit', { error }, 'RedditAdapter.postUpdate');
            throw error;
        }
    }

    // ─────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────

    /**
     * Transform a Reddit submission (snoowrap Submission) to our normalized ISocialPost.
     */
    private transformSubmissionToPost(submission: any): ISocialPost {
        return {
            platform: 'reddit',
            sourceId: submission.id,
            url: `https://reddit.com${submission.permalink}`,
            author: {
                id: submission.author?.id || 'unknown',
                username: submission.author?.name || '[deleted]',
            },
            content: submission.selftext || submission.title,
            hashtags: [],
            mentions: [],
            metrics: {
                likes: submission.ups || 0,
                shares: 0,
                comments: submission.num_comments || 0,
                views: 0,
            },
            publishedAt: new Date(submission.created_utc * 1000),
            collectedAt: new Date(),
            metadata: {
                subreddit: submission.subreddit?.display_name || submission.subreddit_name_prefixed,
                title: submission.title,
                flair: submission.link_flair_text,
                isNsfw: submission.over_18,
                score: submission.score,
                upvoteRatio: submission.upvote_ratio,
            },
        };
    }

    /**
     * Transform a Reddit inbox message to our normalized ISocialMessage.
     */
    private transformRedditMessage(message: any): ISocialMessage {
        return {
            platform: 'reddit',
            sourceId: message.id,
            conversationId: message.context || message.id,
            from: {
                id: message.author?.id || 'unknown',
                username: message.author?.name || '[deleted]',
            },
            to: [{
                id: message.dest?.id || this.account.providerAccountId,
                username: message.dest?.name || this.account.name,
            }],
            content: message.body,
            isIncoming: message.dest === this.account.name,
            sentAt: new Date(message.created_utc * 1000),
            accountId: this.account._id,
            metadata: {
                subject: message.subject,
                subreddit: message.subreddit?.display_name,
            },
        };
    }
}

export default RedditAdapter;
