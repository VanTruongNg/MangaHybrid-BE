import { IsNotEmpty, IsNumber, Max, Min } from "class-validator";

export class CreateRatingDTO {
    @IsNotEmpty({ message: 'Điểm đánh giá không được để trống' })
    @IsNumber()
    @Min(1, { message: 'Điểm đánh giá phải từ 1-5' })
    @Max(5, { message: 'Điểm đánh giá phải từ 1-5' })
    score: number;
}