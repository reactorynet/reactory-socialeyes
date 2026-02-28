import { service } from '@reactory/server-core/application/decorators';
import { SocialListener, ISocialListenerDocument } from '../models/Listener';
import { SocialPost } from '../models/Post';
import { SocialEyesEvents } from '../events';
import SocialEyesService from './SocialEyesService';

/**
 * Listening Service
 *
 * Manages the execution of social media listeners.
 * Polls configured listeners and publishes events when matches are found.
 */
@service({
    id: 'socialeyes.ListeningService@1.0.0',
    name: 'ListeningService',
    nameSpace: 'socialeyes',
    description: 'Social Media Listening Service - manages polling listeners and event publishing',
    serviceType: 'data',
    dependencies: [
        { id: 'socialeyes.SocialEyesService@1.0.0', alias: 'socialEyesService' },
    ],
})
export default class ListeningService implements Reactory.Service.IReactoryService {

    name: string = 'ListeningService';
    nameSpace: string = 'socialeyes';
    version: string = '1.0.0';
    description: string = 'Social Media Listening Service';
    tags: string[] = ['social', 'listening', 'monitoring'];

    private context: Reactory.Server.IReactoryContext;
    private socialEyesService: SocialEyesService;
    private intervalHandles: Map<string, NodeJS.Timeout> = new Map();

    constructor(
        props: Reactory.Service.IReactoryServiceProps,
        context: Reactory.Server.IReactoryContext,
    ) {
        this.context = context;
        this.socialEyesService = (props.dependencies as any)?.socialEyesService;
    }

    /**
     * Start monitoring all active listeners.
     */
    async startAllListeners(): Promise<void> {
        const listeners = await SocialListener.find({ isActive: true });

        this.context.info(`Starting ${listeners.length} active listeners`, {}, 'ListeningService.startAllListeners');

        for (const listener of listeners) {
            await this.startListener(listener);
        }
    }

    /**
     * Start a specific listener.
     */
    async startListener(listener: ISocialListenerDocument): Promise<void> {
        const key = listener._id.toString();

        // Stop existing if running
        if (this.intervalHandles.has(key)) {
            this.stopListener(key);
        }

        // If intervalMinutes is 0, it's webhook-based, don't poll
        if (listener.intervalMinutes === 0) {
            this.context.debug(`Listener ${listener.name} is webhook-based, skipping polling`, {}, 'ListeningService.startListener');
            return;
        }

        this.context.info(`Starting listener: ${listener.name}`, {
            platform: listener.platform,
            interval: listener.intervalMinutes,
        }, 'ListeningService.startListener');

        // Execute immediately
        await this.executeListener(listener);

        // Schedule recurring execution
        const handle = setInterval(
            () => this.executeListener(listener),
            listener.intervalMinutes * 60 * 1000,
        );

        this.intervalHandles.set(key, handle);
    }

    /**
     * Stop a specific listener.
     */
    stopListener(listenerId: string): void {
        const handle = this.intervalHandles.get(listenerId);
        if (handle) {
            clearInterval(handle);
            this.intervalHandles.delete(listenerId);
            this.context.info(`Stopped listener: ${listenerId}`, {}, 'ListeningService.stopListener');
        }
    }

    /**
     * Stop all listeners.
     */
    stopAllListeners(): void {
        this.intervalHandles.forEach((handle) => {
            clearInterval(handle);
        });
        this.intervalHandles.clear();
        this.context.info('Stopped all listeners', {}, 'ListeningService.stopAllListeners');
    }

    /**
     * Execute a listener - search and process results.
     */
    private async executeListener(listener: ISocialListenerDocument): Promise<void> {
        try {
            this.context.debug(`Executing listener: ${listener.name}`, { query: listener.query }, 'ListeningService.executeListener');

            // Get the appropriate adapter via SocialEyesService
            const adapter = await this.getAdapterForListener(listener);

            if (!adapter) {
                this.context.warn(`No adapter found for platform: ${listener.platform}`, {}, 'ListeningService.executeListener');
                return;
            }

            // Execute search
            const results = await adapter.search(listener.query, {
                type: listener.type,
                limit: 25,
            });

            // Process results
            for (const post of results.posts) {
                await this.processPost(post, listener);
            }

            // Update last run time
            listener.lastRun = new Date();
            await listener.save();

            this.context.debug(`Listener ${listener.name} completed`, {
                postsFound: results.posts.length,
            }, 'ListeningService.executeListener');

        } catch (error) {
            this.context.error(`Listener ${listener.name} failed`, { error }, 'ListeningService.executeListener');
        }
    }

    /**
     * Process a post found by a listener.
     */
    private async processPost(post: any, listener: ISocialListenerDocument): Promise<void> {
        try {
            // Check if we've already seen this post
            const existing = await SocialPost.findOne({
                platform: post.platform,
                sourceId: post.sourceId,
            });

            if (existing) {
                return; // Already processed
            }

            // Save the post
            post.listenerId = listener._id;
            const savedPost = await SocialPost.create(post);

            // Execute configured actions
            if (listener.actions && listener.actions.length > 0) {
                for (const action of listener.actions) {
                    await this.executeAction(action, savedPost, listener);
                }
            }

        } catch (error) {
            this.context.error('Failed to process post', { error, postId: post.sourceId }, 'ListeningService.processPost');
        }
    }

    /**
     * Execute an action based on listener configuration.
     */
    private async executeAction(
        action: string,
        post: any,
        listener: ISocialListenerDocument,
    ): Promise<void> {
        switch (action) {
            case 'emit-event':
                await this.emitPostDetectedEvent(post, listener);
                break;

            case 'auto-reply':
                await this.executeAutoReply(post, listener);
                break;

            default:
                this.context.warn(`Unknown action: ${action}`, {}, 'ListeningService.executeAction');
        }
    }

    /**
     * Execute auto-reply action using the platform adapter.
     */
    private async executeAutoReply(post: any, listener: ISocialListenerDocument): Promise<void> {
        try {
            const replyTemplate = listener.metadata?.autoReplyTemplate;
            if (!replyTemplate) {
                this.context.warn('Auto-reply template not configured for listener', {
                    listenerId: listener._id,
                }, 'ListeningService.executeAutoReply');
                return;
            }

            const adapter = await this.getAdapterForListener(listener);
            if (!adapter) return;

            await adapter.postUpdate(replyTemplate, post.sourceId);

            this.context.info('Auto-reply sent', {
                platform: post.platform,
                postId: post.sourceId,
            }, 'ListeningService.executeAutoReply');
        } catch (error) {
            this.context.error('Auto-reply failed', { error, postId: post.sourceId }, 'ListeningService.executeAutoReply');
        }
    }

    /**
     * Emit a PostDetected event to the queue.
     */
    private async emitPostDetectedEvent(post: any, listener: ISocialListenerDocument): Promise<void> {
        try {
            const queueService = this.context.getService('reactory.QueueProvider@1.0.0') as any;

            if (!queueService) {
                this.context.warn('Queue service not available', {}, 'ListeningService.emitPostDetectedEvent');
                return;
            }

            const payload = {
                platform: post.platform,
                sourceId: post.sourceId,
                actor: post.author,
                content: post.content,
                media: post.media || [],
                timestamp: post.publishedAt,
                metadata: {
                    listenerId: listener._id,
                    listenerName: listener.name,
                    url: post.url,
                },
            };

            const defaultProvider = queueService.getDefaultProvider?.();
            if (defaultProvider) {
                await defaultProvider.enqueue({
                    header: { eventType: SocialEyesEvents.POST_DETECTED, timestamp: new Date() },
                    body: payload,
                });
            }

            this.context.debug('Published PostDetected event', {
                platform: post.platform,
                sourceId: post.sourceId,
            }, 'ListeningService.emitPostDetectedEvent');

        } catch (error) {
            this.context.error('Failed to emit event', { error }, 'ListeningService.emitPostDetectedEvent');
        }
    }

    /**
     * Get the adapter for a listener's platform using the SocialEyesService factory.
     */
    private async getAdapterForListener(listener: ISocialListenerDocument): Promise<any> {
        try {
            // Use the injected SocialEyesService or resolve from context
            const svc = this.socialEyesService ||
                this.context.getService<SocialEyesService>('socialeyes.SocialEyesService@1.0.0');

            if (!svc) {
                this.context.error('SocialEyesService not available', {}, 'ListeningService.getAdapterForListener');
                return null;
            }

            // Find an active account for this platform owned by the listener owner
            const { SocialAccount } = require('../models/Account');
            const account = await SocialAccount.findOne({
                provider: listener.platform,
                owner: listener.owner,
                isActive: true,
            });

            if (!account) {
                this.context.warn(`No active account for platform: ${listener.platform}`, {}, 'ListeningService.getAdapterForListener');
                return null;
            }

            return svc.getAdapter(listener.platform, account);
        } catch (error) {
            this.context.error('Failed to get adapter for listener', { error }, 'ListeningService.getAdapterForListener');
            return null;
        }
    }

    setExecutionContext(context: Reactory.Server.IReactoryContext): void {
        this.context = context;
    }
}
