import { IsEnum, IsUUID, IsOptional, IsString } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { PaymentMethod } from '../entities/payment.entity'

export class CreatePaymentDto {
  @ApiProperty({ description: 'UUID da solicitação de serviço' })
  @IsUUID()
  requestId: string

  @ApiProperty({
    enum: PaymentMethod,
    description:
      '`stripe_card` ou `stripe_pix` para pagamento automático via Stripe. ' +
      '`manual_pix` para pagamento direto à chave PIX do profissional.',
  })
  @IsEnum(PaymentMethod)
  method: PaymentMethod

  /**
   * Apenas para método `stripe_card` / `stripe_pix`:
   * ID do PaymentMethod criado pelo Stripe.js no frontend.
   */
  @ApiPropertyOptional({ description: 'Stripe PaymentMethod ID (apenas para métodos Stripe)' })
  @IsOptional()
  @IsString()
  stripePaymentMethodId?: string
}
