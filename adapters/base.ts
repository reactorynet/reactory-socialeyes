import { ISocialAccountDocument } from "../models/Account";
import { ISocialPost, ISocialPostDocument } from "../models/Post";
import { ISocialMessage, ISocialMessageDocument } from "../models/Message";

export interface ISocialSearchResults {
    posts: ISocialPost[];
    nextCursor?: string;
}

/**
 * Result of a social account lookup.
 */
export interface ISocialAccountLookupResult {
    /** Platform-specific user ID */
    id: string;
    /** Username / handle */
    username: string;
    /** Display name */
    name?: string;
    /** Avatar / profile image URL */
    avatar?: string;
    /** User bio / description */
    bio?: string;
    /** Number of followers */
    followerCount?: number;
    /** Number of accounts this user follows */
    followingCount?: number;
    /** Total number of posts */
    postCount?: number;
    /** Whether the account is verified */
    verified?: boolean;
    /** Profile URL on the platform */
    url?: string;
    /** Additional platform-specific metadata */
    metadata?: Record<string, any>;
}

/**
 * Options for looking up a social account.
 * At least one of `username` or `userId` must be provided.
 */
export interface ISocialAccountLookupOptions {
    /** Lookup by username / handle (without leading @) */
    username?: string;
    /** Lookup by platform-specific user ID */
    userId?: string;
    /** Additional platform-specific options */
    [key: string]: any;
}

export interface ISocialAdapter {
    /**
     * Authenticate or refresh tokens
     */
    connect(credentials: any): Promise<ISocialAccountDocument>;
    
    /**
     * Search for posts based on a query
     */
    search(query: string, options?: any): Promise<ISocialSearchResults>;
    
    /**
     * Get details of a specific post
     */
    getPost(id: string): Promise<ISocialPostDocument | null>;
    
    /**
     * Send a direct message
     */
    sendMessage(to: string, content: string, attachments?: any[]): Promise<ISocialMessageDocument>;
    
    /**
     * Get messages (inbox sync)
     */
    getMessages(since?: Date, limit?: number): Promise<ISocialMessage[]>;
    
    /**
     * Post an update (optional, mainly for replies)
     */
    postUpdate(content: string, replyToId?: string): Promise<ISocialPostDocument>;

    /**
     * Look up a social account by username or user ID.
     * Returns null if the account is not found.
     */
    lookupAccount(options: ISocialAccountLookupOptions): Promise<ISocialAccountLookupResult | null>;
}

export type SocialAdapterProps = {
 account: ISocialAccountDocument;
 [key: string]: any;
};   

export abstract class AbstractSocialAdapter implements 
 Reactory.Service.IReactoryService,  
 ISocialAdapter {
    name: string = "AbstractSocialAdapter";
    nameSpace: string = "reactory-socialeyes";
    version: string = "1.0.0";
    description: string = "Base class for social media adapters";
    protected account: ISocialAccountDocument;
    protected context: Reactory.Server.IReactoryContext;

    constructor(props: any, context: Reactory.Server.IReactoryContext) {
        this.account = props.account;
        this.context = context;
    }

    abstract connect(credentials: any): Promise<ISocialAccountDocument>;
    abstract search(query: string, options?: any): Promise<ISocialSearchResults>;
    abstract getPost(id: string): Promise<ISocialPostDocument | null>;
    abstract sendMessage(to: string, content: string, attachments?: any[]): Promise<ISocialMessageDocument>;
    abstract getMessages(since?: Date, limit?: number): Promise<ISocialMessage[]>;
    abstract postUpdate(content: string, replyToId?: string): Promise<ISocialPostDocument>;
    abstract lookupAccount(options: ISocialAccountLookupOptions): Promise<ISocialAccountLookupResult | null>;

    setExecutionContext(context: Reactory.Server.IReactoryContext): void {
        this.context = context;
    }    
}
