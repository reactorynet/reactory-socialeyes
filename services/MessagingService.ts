import { service } from '@reactory/server-core/application/decorators';
import { SocialMessage, ISocialMessageDocument } from '../models/Message';
import { SocialAccount } from '../models/Account';
import { SocialEyesEvents } from '../events';
import SocialEyesService from './SocialEyesService';

/**
 * Messaging Service
 *
 * Handles direct messaging functionality across social media platforms.
 * Provides unified inbox, send/reply capabilities, and inbox synchronization.
 */
@service({
    id: 'socialeyes.MessagingService@1.0.0',
    name: 'MessagingService',
    nameSpace: 'socialeyes',
    description: 'Social Media Messaging Service - unified inbox, send/reply, and sync',
    serviceType: 'data',
    dependencies: [
        { id: 'socialeyes.SocialEyesService@1.0.0', alias: 'socialEyesService' },
    ],
})
export default class MessagingService implements Reactory.Service.IReactoryService {

    name: string = 'MessagingService';
    nameSpace: string = 'socialeyes';
    version: string = '1.0.0';
    description: string = 'Social Media Messaging Service';
    tags: string[] = ['social', 'messaging', 'dm'];

    private context: Reactory.Server.IReactoryContext;
    private socialEyesService: SocialEyesService;

    constructor(
        props: Reactory.Service.IReactoryServiceProps,
        context: Reactory.Server.IReactoryContext,
    ) {
        this.context = context;
        this.socialEyesService = (props.dependencies as any)?.socialEyesService;
    }

    /**
     * Get the SocialEyesService instance (injected or resolved from context).
     */
    private getSocialEyesService(): SocialEyesService {
        if (this.socialEyesService) return this.socialEyesService;
        const svc = this.context.getService<SocialEyesService>('socialeyes.SocialEyesService@1.0.0');
        if (!svc) throw new Error('SocialEyesService not available');
        return svc;
    }

    /**
     * Get unified inbox across all platforms for a user.
     */
    async getInbox(
        userId: string,
        paging?: Reactory.Models.IPagingRequest,
    ): Promise<Reactory.Models.IPagedResponse<ISocialMessageDocument>> {
        try {
            const accounts = await SocialAccount.find({ owner: userId, isActive: true });
            const accountIds = accounts.map((a) => a._id);

            const page = paging?.page || 1;
            const pageSize = paging?.pageSize || 50;
            const skip = (page - 1) * pageSize;

            const query = {
                accountId: { $in: accountIds },
                isIncoming: true,
            };

            const [items, total] = await Promise.all([
                SocialMessage.find(query)
                    .sort({ sentAt: -1 })
                    .skip(skip)
                    .limit(pageSize)
                    .exec(),
                SocialMessage.countDocuments(query),
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
            this.context.error('Failed to get inbox', { error }, 'MessagingService.getInbox');
            throw error;
        }
    }

    /**
     * Get a conversation thread by conversationId.
     */
    async getConversation(
        conversationId: string,
        paging?: Reactory.Models.IPagingRequest,
    ): Promise<Reactory.Models.IPagedResponse<ISocialMessageDocument>> {
        try {
            const page = paging?.page || 1;
            const pageSize = paging?.pageSize || 50;
            const skip = (page - 1) * pageSize;

            const query = { conversationId };

            const [items, total] = await Promise.all([
                SocialMessage.find(query)
                    .sort({ sentAt: 1 })
                    .skip(skip)
                    .limit(pageSize)
                    .exec(),
                SocialMessage.countDocuments(query),
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
            this.context.error('Failed to get conversation', { error }, 'MessagingService.getConversation');
            throw error;
        }
    }

    /**
     * Send a direct message using the appropriate platform adapter.
     */
    async sendMessage(
        accountId: string,
        to: string,
        content: string,
        attachments?: any[],
    ): Promise<ISocialMessageDocument> {
        try {
            this.context.info('Sending message', { accountId, to }, 'MessagingService.sendMessage');

            const svc = this.getSocialEyesService();
            const { adapter } = await svc.getAdapterForAccount(accountId);

            const message = await adapter.sendMessage(to, content, attachments);

            // Emit event
            await this.emitMessageEvent(SocialEyesEvents.MESSAGE_RECEIVED, message);

            this.context.info('Message sent', {
                messageId: message._id,
                platform: message.platform,
            }, 'MessagingService.sendMessage');

            return message;
        } catch (error) {
            this.context.error('Failed to send message', { accountId, to, error }, 'MessagingService.sendMessage');
            throw error;
        }
    }

    /**
     * Reply to an existing message.
     */
    async replyToMessage(messageId: string, content: string): Promise<ISocialMessageDocument> {
        try {
            const originalMessage = await SocialMessage.findById(messageId);
            if (!originalMessage) {
                throw new Error(`Message not found: ${messageId}`);
            }

            // Reply to the sender of the original message
            const replyTo = originalMessage.isIncoming
                ? originalMessage.from.id
                : originalMessage.to[0]?.id;

            if (!replyTo) {
                throw new Error('Cannot determine reply recipient');
            }

            return await this.sendMessage(
                originalMessage.accountId.toString(),
                replyTo,
                content,
            );
        } catch (error) {
            this.context.error('Failed to reply to message', { messageId, error }, 'MessagingService.replyToMessage');
            throw error;
        }
    }

    /**
     * Mark a message as read.
     */
    async markAsRead(messageId: string): Promise<ISocialMessageDocument | null> {
        try {
            const message = await SocialMessage.findByIdAndUpdate(
                messageId,
                { readAt: new Date() },
                { new: true },
            );

            if (message) {
                this.context.debug('Message marked as read', { messageId }, 'MessagingService.markAsRead');
            }

            return message;
        } catch (error) {
            this.context.error('Failed to mark message as read', { messageId, error }, 'MessagingService.markAsRead');
            throw error;
        }
    }

    /**
     * Get sent messages for a user.
     */
    async getSentMessages(
        userId: string,
        paging?: Reactory.Models.IPagingRequest,
    ): Promise<Reactory.Models.IPagedResponse<ISocialMessageDocument>> {
        try {
            const accounts = await SocialAccount.find({ owner: userId, isActive: true });
            const accountIds = accounts.map((a) => a._id);

            const page = paging?.page || 1;
            const pageSize = paging?.pageSize || 50;
            const skip = (page - 1) * pageSize;

            const query = {
                accountId: { $in: accountIds },
                isIncoming: false,
            };

            const [items, total] = await Promise.all([
                SocialMessage.find(query)
                    .sort({ sentAt: -1 })
                    .skip(skip)
                    .limit(pageSize)
                    .exec(),
                SocialMessage.countDocuments(query),
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
            this.context.error('Failed to get sent messages', { error }, 'MessagingService.getSentMessages');
            throw error;
        }
    }

    /**
     * Sync inbox from a platform by pulling latest messages via the adapter.
     */
    async syncInbox(accountId: string): Promise<{ newMessages: number }> {
        try {
            this.context.info('Syncing inbox', { accountId }, 'MessagingService.syncInbox');

            const svc = this.getSocialEyesService();
            const { adapter, account } = await svc.getAdapterForAccount(accountId);

            // Find the most recent message for this account to use as "since"
            const lastMessage = await SocialMessage.findOne({ accountId: account._id })
                .sort({ sentAt: -1 })
                .exec();

            const since = lastMessage?.sentAt;
            const platformMessages = await adapter.getMessages(since, 100);

            let newCount = 0;
            for (const msg of platformMessages) {
                // Check if already stored
                const existing = await SocialMessage.findOne({
                    platform: msg.platform,
                    sourceId: msg.sourceId,
                });

                if (!existing) {
                    await SocialMessage.create({
                        ...msg,
                        accountId: account._id,
                    });
                    newCount++;
                }
            }

            this.context.info('Inbox sync complete', {
                accountId,
                newMessages: newCount,
            }, 'MessagingService.syncInbox');

            return { newMessages: newCount };
        } catch (error) {
            this.context.error('Failed to sync inbox', { accountId, error }, 'MessagingService.syncInbox');
            throw error;
        }
    }

    /**
     * Emit a message-related event to the queue.
     */
    private async emitMessageEvent(eventType: string, message: ISocialMessageDocument): Promise<void> {
        try {
            const queueService = this.context.getService('reactory.QueueProvider@1.0.0') as any;
            if (!queueService) return;

            const defaultProvider = queueService.getDefaultProvider?.();
            if (defaultProvider) {
                await defaultProvider.enqueue({
                    header: { eventType, timestamp: new Date() },
                    body: {
                        platform: message.platform,
                        sourceId: message.sourceId,
                        conversationId: message.conversationId,
                        from: message.from,
                        to: message.to,
                        content: message.content,
                        sentAt: message.sentAt,
                    },
                });
            }
        } catch (error) {
            this.context.error('Failed to emit message event', { error, eventType }, 'MessagingService.emitMessageEvent');
        }
    }

    setExecutionContext(context: Reactory.Server.IReactoryContext): void {
        this.context = context;
    }
}
