import { IsNotEmpty } from "class-validator";

export class GenresDTO {
    @IsNotEmpty()
    readonly name: string
} 