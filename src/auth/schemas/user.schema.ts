import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Role } from "./role.enum";
import { Manga } from "src/manga/schemas/manga.schema";
import mongoose, { Types } from "mongoose";
import { Chapter } from "src/chapters/schemas/chapter.shema";

@Schema({
 timestamps: true,
})
export class User{
    @Prop({ required: true })
    name: string;

    @Prop({ 
        required: true, 
        unique: true,
        lowercase: true,
        trim: true 
    })
    email: string;

    @Prop({ required: true })
    password: string;

    @Prop({
        type: String,
        enum: Role,
        default: Role.READER
    })  
    role: Role

    @Prop({ default: false }) 
    isVerified: boolean

    @Prop ()
    avatarUrl: string

    @Prop ({ type:[{type: mongoose.Schema.Types.ObjectId, ref: 'Manga'}] })
    favoritesManga: Manga[]
    
    @Prop ({ type:[{type: mongoose.Schema.Types.ObjectId, ref: 'Manga'}] })
    dislikedManga: Manga[]

    @Prop ({ type:[{type: mongoose.Schema.Types.ObjectId, ref: 'Manga'}] })
    followingManga: Manga[]

    @Prop ({ type: [{type: mongoose.Schema.Types.ObjectId, ref: 'Manga'}]})
    uploadedManga: Manga[]

    @Prop({ type: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}]})
    following: User[]

    @Prop({ type: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}]})
    followers: User[]

    @Prop({
        type: [{
            manga: { type: mongoose.Schema.Types.ObjectId, ref: 'Manga'},
            chapter: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter'},
            updatedAt: { type: Date, default: Date.now }
        }]
    })
    readingHistory: { manga: Manga, chapter: Chapter, updatedAt: Date }[];
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ 'readingHistory.updatedAt': 1 });