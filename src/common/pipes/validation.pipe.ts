import { ValidationPipe } from '@nestjs/common';

export const globalValidationPipe = new ValidationPipe({
  whitelist: true,         // remove campos não declarados no DTO
  forbidNonWhitelisted: true,
  transform: true,         // converte tipos automaticamente (string → number, etc.)
  transformOptions: {
    enableImplicitConversion: true,
  },
});
