/**
 * Social Eyes Event Definitions
 * 
 * These events are published to the Reactory Queue system
 * and can trigger workflows or other business logic.
 */

export interface SocialEventPayload {
    platform: string;
    sourceId: string;
    actor: {
        id: string;
        handle: string;
        name?: string;
    };
    content: string;
    media: string[];
    timestamp: Date;
    metadata?: any;
}

/**
 * Event Types
 */
export const SocialEyesEvents = {
    POST_DETECTED: 'SocialEyes.PostDetected',
    MESSAGE_RECEIVED: 'SocialEyes.MessageReceived',
    ACCOUNT_CONNECTED: 'SocialEyes.AccountConnected',
    LISTENER_STARTED: 'SocialEyes.ListenerStarted',
    LISTENER_STOPPED: 'SocialEyes.ListenerStopped',
    SEARCH_COMPLETED: 'SocialEyes.SearchCompleted'
} as const;

export type SocialEyesEventType = typeof SocialEyesEvents[keyof typeof SocialEyesEvents];
