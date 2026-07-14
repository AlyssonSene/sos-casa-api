import { IsUUID, IsInt, Min, Max, IsOptional, IsString, IsArray } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateReviewDto {
  @ApiProperty() @IsUUID() requestId: string
  @ApiProperty() @IsUUID() professionalId: string
  @ApiProperty({ minimum: 1, maximum: 5 }) @IsInt() @Min(1) @Max(5) rating: number
  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]
}
