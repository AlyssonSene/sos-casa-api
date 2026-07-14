import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class RegisterDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @MaxLength(150)
  name: string

  @ApiProperty({ example: 'joao@email.com' })
  @IsEmail()
  email: string

  @ApiProperty({ example: '35999990000' })
  @IsString()
  @Matches(/^\d{10,11}$/, { message: 'phone must be 10 or 11 digits' })
  phone: string

  @ApiProperty({ example: 'Senha@123' })
  @IsString()
  @MinLength(8)
  password: string
}
