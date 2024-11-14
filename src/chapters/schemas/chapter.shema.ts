import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose from "mongoose";
import { Comment } from "src/comment/schema/comment.schema";
import { Manga } from "src/manga/schemas/manga.schema";

export enum ChapterType {
    NORMAL = 'normal',
    SPECIAL = 'special',
    ONESHOT = 'oneshot'
}

@Schema({
    timestamps: true
})
export class Chapter {
    @Prop()
    number: number

    @Prop({type: [ String ]})
    pagesUrl: string[]

    @Prop()
    chapterTitle?: string

    @Prop()
    views: number

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Manga' })
    manga: Manga

    @Prop({ type: String, enum: ChapterType, default: ChapterType.NORMAL })
    chapterType: ChapterType;

    @Prop({
        default: function(this: Chapter) {
            switch (this.chapterType) {
                case ChapterType.SPECIAL:
                    return `Chapter Đặc Biệt${this.chapterTitle ? ': ' + this.chapterTitle : ''}`;
                case ChapterType.ONESHOT:
                    return 'OneShot';
                default:
                    return `Chap ${this.number}${this.chapterTitle ? ': ' + this.chapterTitle : ''}`;
            }
        }
    })
    chapterName: string;

    @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }] })
    comments: Comment[];
}

export const ChapterSchema = SchemaFactory.createForClass(Chapter)