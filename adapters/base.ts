import { ISocialAccountDocument } from "../models/Account";
import { ISocialPost, ISocialPostDocument } from "../models/Post";
import { ISocialMessage, ISocialMessageDocument } from "../models/Message";

export interface ISocialSearchResults {
    posts: ISocialPost[];
    nextCursor?: string;
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

    setExecutionContext(context: Reactory.Server.IReactoryContext): void {
        this.context = context;
    }    
}
