import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose from "mongoose";
import { Comment } from "src/comment/schema/comment.schema";
import { Manga } from "src/manga/schemas/manga.schema";

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

    @Prop({ default: function(this: Chapter)
        {
            return `Chap ${this.number}`
        }
    })
    get chapterName(): string {
        return `Chap ${this.number}`
    }

    @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }] })
    comments: Comment[];
}

export const ChapterSchema = SchemaFactory.createForClass(Chapter)