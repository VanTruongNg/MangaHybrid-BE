import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose from "mongoose";
import { Manga } from "src/manga/schemas/manga.schema";

@Schema({
    timestamps: true
})
export class Genre {
    @Prop()
    name: string

    @Prop({type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Manga'}]})
    manga: Manga[]
}

export const GenreSchema = SchemaFactory.createForClass(Genre)