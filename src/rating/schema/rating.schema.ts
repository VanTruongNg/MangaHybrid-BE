import { Schema, SchemaFactory } from "@nestjs/mongoose";
import { Prop } from "@nestjs/mongoose";
import mongoose from "mongoose";
import { User } from "src/auth/schemas/user.schema";
import { Manga } from "src/manga/schemas/manga.schema";

@Schema({
    timestamps: true
})
export class Rating {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    user: User;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Manga', required: true })
    manga: Manga;

    @Prop({ required: true, min: 1, max: 5 })
    score: number;
}

export const RatingSchema = SchemaFactory.createForClass(Rating);
