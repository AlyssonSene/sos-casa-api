import { IsString, IsUUID, IsBoolean, IsOptional, IsNumber, Min, Length } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateServiceDto {
  @ApiProperty() @IsUUID() categoryId: string
  @ApiProperty({ example: 'Troca de torneira' }) @IsString() @Length(1, 150) name: string
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPriceVariable?: boolean
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) estimatedDurationMinutes?: number
}

export class UpsertProfessionalServiceDto {
  @ApiProperty() @IsUUID() serviceId: string
  @ApiProperty({ example: 80.0 }) @IsNumber() @Min(0) price: number
}
