import mongoose, { Schema, Document } from 'mongoose';

const { ObjectId } = Schema.Types;

export interface ISocialPost {
    platform: string;
    sourceId: string; // ID of the post on the platform
    url?: string;
    author: {
        id: string;
        username: string;
        name?: string;
        avatar?: string;
    };
    content: string;
    media?: string[]; // URLs to images/videos
    hashtags?: string[];
    mentions?: string[];
    sentiment?: number; // -1 to 1
    metrics?: {
        likes: number;
        shares: number;
        comments: number;
        views?: number;
    };
    publishedAt: Date;
    collectedAt: Date;
    listenerId?: mongoose.Types.ObjectId; // Which listener found this
    metadata?: Record<string, any>;
    replies?: ISocialPost[];
}

export interface ISocialPostDocument extends ISocialPost, Document {}

const SocialPostSchema = new Schema<ISocialPostDocument>({
    platform: { type: String, required: true },
    sourceId: { type: String, required: true },
    url: { type: String },
    author: {
        id: { type: String, required: true },
        username: { type: String, required: true },
        name: { type: String },
        avatar: { type: String }
    },
    content: { type: String },
    media: [{ type: String }],
    hashtags: [{ type: String }],
    mentions: [{ type: String }],
    sentiment: { type: Number },
    metrics: {
        likes: { type: Number, default: 0 },
        shares: { type: Number, default: 0 },
        comments: { type: Number, default: 0 },
        views: { type: Number, default: 0 }
    },
    publishedAt: { type: Date, required: true },
    collectedAt: { type: Date, default: Date.now },
    listenerId: { type: ObjectId, ref: 'SocialListener' },
    metadata: { type: Object }
});

// Avoid duplicates
SocialPostSchema.index({ platform: 1, sourceId: 1 }, { unique: true });
SocialPostSchema.index({ content: 'text' }); // Enable text search

export const SocialPost = mongoose.model<ISocialPostDocument>('SocialPost', SocialPostSchema);
