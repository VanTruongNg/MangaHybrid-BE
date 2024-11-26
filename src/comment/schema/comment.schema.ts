import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose from "mongoose";
import { User } from "src/auth/schemas/user.schema";
import { Chapter } from "src/chapters/schemas/chapter.shema";
import { Manga } from "src/manga/schemas/manga.schema";

interface Mention {
    userId: User;
    username: string;
    startIndex: number;
    endIndex: number;
}

@Schema({
    timestamps: true
})
export class Comment {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    user: User;

    @Prop({ required: true })
    content: string;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Manga' })
    manga?: Manga;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' })
    chapter?: Chapter;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' })
    parentComment?: Comment;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
    replyToUser?: User;

    @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }], default: [] })
    replies: Comment[];

    @Prop({
        type: [{
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            username: String,
            startIndex: Number,
            endIndex: Number
        }],
        default: []
    })
    mentions: Mention[];
}


export const CommentSchema = SchemaFactory.createForClass(Comment);
