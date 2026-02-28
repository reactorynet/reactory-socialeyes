import mongoose, { Schema, Document } from 'mongoose';

const { ObjectId } = Schema.Types;

export interface ISocialMessage {
    platform: string;
    sourceId: string;
    conversationId: string;
    from: {
        id: string;
        username: string;
        name?: string;
    };
    to: {
        id: string;
        username: string;
        name?: string;
    }[];
    content: string;
    attachments?: {
        type: string; // 'image', 'video', 'file'
        url: string;
    }[];
    isIncoming: boolean; // True if received by our managed account
    readAt?: Date;
    sentAt: Date;
    accountId: mongoose.Types.ObjectId; // The managed account involved
    metadata?: Record<string, any>;
}

export interface ISocialMessageDocument extends ISocialMessage, Document {}

const SocialMessageSchema = new Schema<ISocialMessageDocument>({
    platform: { type: String, required: true },
    sourceId: { type: String, required: true },
    conversationId: { type: String, index: true },
    from: {
        id: { type: String },
        username: { type: String },
        name: { type: String }
    },
    to: [{
        id: { type: String },
        username: { type: String },
        name: { type: String }
    }],
    content: { type: String },
    attachments: [{
        type: { type: String },
        url: { type: String }
    }],
    isIncoming: { type: Boolean, required: true },
    readAt: { type: Date },
    sentAt: { type: Date, required: true },
    accountId: { type: ObjectId, ref: 'SocialAccount', required: true },
    metadata: { type: Object }
});

SocialMessageSchema.index({ platform: 1, sourceId: 1 }, { unique: true });

export const SocialMessage = mongoose.model<ISocialMessageDocument>('SocialMessage', SocialMessageSchema);
