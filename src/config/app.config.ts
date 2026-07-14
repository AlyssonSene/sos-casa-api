import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  url: process.env.APP_URL ?? 'http://localhost:3000',
  pagarme: {
    apiKey: process.env.PAGARME_API_KEY ?? '',
    encryptionKey: process.env.PAGARME_ENCRYPTION_KEY ?? '',
  },
}));
