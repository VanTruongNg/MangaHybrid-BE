import { Document } from "mongoose";

export interface FogottenPassword extends Document {
    email: string,
    resetToken: string,
    timestamp: Date
}