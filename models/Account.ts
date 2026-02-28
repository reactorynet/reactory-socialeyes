import mongoose, { Schema, Document } from 'mongoose';

const { ObjectId } = Schema.Types;

export interface ISocialAccount {
    provider: string; // 'instagram', 'facebook', 'x', 'reddit', etc.
    providerAccountId: string; // The ID on the platform
    name: string; // Display name or handle
    email?: string;
    avatar?: string;
    accessToken?: string;
    refreshToken?: string;
    tokenExpiry?: Date;
    scopes?: string[];
    isActive: boolean;
    owner: mongoose.Types.ObjectId; // Reactory User ID
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

export interface ISocialAccountDocument extends ISocialAccount, Document {}

const SocialAccountSchema = new Schema<ISocialAccountDocument>({
    provider: { type: String, required: true },
    providerAccountId: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String },
    avatar: { type: String },
    accessToken: { type: String },
    refreshToken: { type: String },
    tokenExpiry: { type: Date },
    scopes: [{ type: String }],
    isActive: { type: Boolean, default: true },
    owner: { type: ObjectId, ref: 'User', required: true },
    metadata: { type: Object },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Composite unique index
SocialAccountSchema.index({ provider: 1, providerAccountId: 1 }, { unique: true });

export const SocialAccount = mongoose.model<ISocialAccountDocument>('SocialAccount', SocialAccountSchema);
