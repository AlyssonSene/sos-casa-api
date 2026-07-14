import { IsString, IsOptional, Length, Matches } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateAddressDto {
  @ApiPropertyOptional({ example: 'Casa' }) @IsOptional() @IsString() @Length(1, 50) label?: string
  @ApiProperty({ example: 'Rua das Flores' }) @IsString() @Length(1, 255) street: string
  @ApiProperty({ example: '123' }) @IsString() @Length(1, 20) number: string
  @ApiPropertyOptional({ example: 'Apto 4' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  complement?: string
  @ApiProperty({ example: 'Centro' }) @IsString() @Length(1, 100) neighborhood: string
  @ApiProperty({ example: 'Varginha' }) @IsString() @Length(1, 100) city: string
  @ApiProperty({ example: 'MG' }) @IsString() @Length(2, 2) state: string
  @ApiProperty({ example: '37010-000' }) @IsString() @Matches(/^\d{5}-?\d{3}$/) zipCode: string
  @ApiPropertyOptional() @IsOptional() isDefault?: boolean
}
