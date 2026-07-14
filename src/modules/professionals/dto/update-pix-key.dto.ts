import { IsEnum, IsString, Length, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PixKeyType } from '../entities/professional-profile.entity';

export class UpdatePixKeyDto {
  @ApiProperty({
    enum: PixKeyType,
    description: 'Tipo da chave PIX: cpf | cnpj | email | phone | random',
    example: PixKeyType.CPF,
  })
  @IsEnum(PixKeyType)
  pixKeyType: PixKeyType;

  @ApiProperty({
    description: 'Valor da chave PIX. Formato depende do tipo (ex.: 000.000.000-00 para CPF).',
    example: '000.000.000-00',
  })
  @IsString()
  @Length(1, 255)
  pixKey: string;
}

export class RemovePixKeyDto {
  // DTO vazio — usado apenas para tipagem no controller
}
