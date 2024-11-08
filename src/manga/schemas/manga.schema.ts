import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { Types } from "mongoose";
import { User } from "src/auth/schemas/user.schema";
import { Chapter } from "src/chapters/schemas/chapter.shema";
import { Genre } from "src/genres/schemas/genre.schema";
import { ApprovalStatus, StatusEnum } from "./status.enum";
import { Comment } from "src/comment/schema/comment.schema";

@Schema({
    timestamps: true,
}
)
export class Manga {
    @Prop()
    title: string;

    @Prop()
    coverImg: string

    @Prop()
    description: string;

    @Prop()
    author: string

    @Prop({
        type: String,
        enum: StatusEnum,
        default: StatusEnum.INPROGRESS
    })
    status: StatusEnum

    @Prop({ default: 0, min: 0, max: 5})
    rating: number

    @Prop({default: 0})
    like: number;

    @Prop({default: 0})
    disLike: number;

    @Prop({default: 0})
    view: number;

    @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] })
    followers: User[]

    @Prop({ type: [{type: mongoose.Schema.Types.ObjectId, ref: 'Chapter'}]})
    chapters: Chapter[]

    @Prop({type: [{type: mongoose.Schema.Types.ObjectId, ref: 'Genre'}]})
    genre: Genre[]

    @Prop({type: mongoose.Schema.Types.ObjectId, ref: 'User'})
    uploader: User

    @Prop({
        type: String,
        enum: ApprovalStatus,
        default: ApprovalStatus.PENDING
    })
    approvalStatus: ApprovalStatus

    @Prop()
    rejectReason?: string

    @Prop({ default: 0 })
    totalRating: number

    @Prop({ default: 0 })
    ratingCount: number;

    @Prop({ default: 0, min: 0, max: 5 })
    averageRating: number;

    @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }] })
    comments: Comment[];
}

export const MangaSchema = SchemaFactory.createForClass(Manga)

@Schema({
    timestamps: true,
})
export class ViewLog {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Manga', required: true })
    manga: Manga

    @Prop({ required: true })
    date: Date

    @Prop({ required: true, default: 0 })
    views: number
}

export const ViewLogSchema = SchemaFactory.createForClass(ViewLog)