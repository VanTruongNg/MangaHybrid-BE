import { Document } from "mongoose";

export interface RefreshToken extends Document {
    _id: string
    user: string
    isRevoked: boolean
    createdAt: Date
    updatedAt: Date
}