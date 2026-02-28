import mongoose, { Schema, Document } from 'mongoose';

const { ObjectId } = Schema.Types;

export interface ISocialListener {
    name: string;
    platform: string; // 'x', 'reddit', etc.
    type: string; // 'keyword', 'hashtag', 'mention', 'user', 'group'
    query: string;
    intervalMinutes: number; // 0 for webhook-based/realtime
    lastRun?: Date;
    isActive: boolean;
    owner: mongoose.Types.ObjectId;
    actions?: string[]; // ['emit-event', 'auto-reply']
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

export interface ISocialListenerDocument extends ISocialListener, Document {}

const SocialListenerSchema = new Schema<ISocialListenerDocument>({
    name: { type: String, required: true },
    platform: { type: String, required: true },
    type: { type: String, required: true, enum: ['keyword', 'hashtag', 'mention', 'user', 'group'] },
    query: { type: String, required: true },
    intervalMinutes: { type: Number, default: 15 },
    lastRun: { type: Date },
    isActive: { type: Boolean, default: true },
    owner: { type: ObjectId, ref: 'User', required: true },
    actions: [{ type: String }],
    metadata: { type: Object },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

export const SocialListener = mongoose.model<ISocialListenerDocument>('SocialListener', SocialListenerSchema);
