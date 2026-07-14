import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiCookieAuth,
  ApiBody,
} from '@nestjs/swagger'
import type { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { User } from '../users/entities/user.entity'
import { SwaggerResponses } from '../../common/swagger/responses'

const REFRESH_COOKIE = 'refresh_token'
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── POST /auth/register ────────────────────────────────────────────────────

  @Post('register')
  @ApiOperation({
    summary: 'Cadastro de novo usuário (cliente)',
    description:
      'Cria conta, define cookie `refresh_token` (httpOnly, 7d) e retorna `accessToken` (JWT, 15min).',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Usuário criado com sucesso.',
    schema: { example: { accessToken: 'eyJhbGci...' } },
  })
  @ApiResponse(SwaggerResponses.badRequest)
  @ApiResponse(SwaggerResponses.conflict('Email já cadastrado.'))
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto)
    res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS)
    return { accessToken: result.accessToken, user: result.user }
  }

  // ── POST /auth/login ───────────────────────────────────────────────────────

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login',
    description: 'Valida credenciais, define cookie `refresh_token` e retorna `accessToken`.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login bem-sucedido.',
    schema: { example: { accessToken: 'eyJhbGci...' } },
  })
  @ApiResponse(SwaggerResponses.badRequest)
  @ApiResponse(SwaggerResponses.unauthorized)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto)
    res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS)
    return { accessToken: result.accessToken, user: result.user }
  }

  // ── POST /auth/refresh ─────────────────────────────────────────────────────

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('refresh_token')
  @ApiOperation({
    summary: 'Renovar access token',
    description:
      'Lê o cookie `refresh_token`, valida e emite novos tokens. Ideal para renovação silenciosa no frontend.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens renovados.',
    schema: { example: { accessToken: 'eyJhbGci...' } },
  })
  @ApiResponse(SwaggerResponses.unauthorized)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE] as string | undefined
    const result = await this.authService.refresh(refreshToken ?? '')
    res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS)
    return { accessToken: result.accessToken }
  }

  // ── POST /auth/logout ──────────────────────────────────────────────────────

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Logout',
    description: 'Limpa o cookie `refresh_token`. O `accessToken` expira em até 15min.',
  })
  @ApiResponse(SwaggerResponses.noContent)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(REFRESH_COOKIE)
  }

  // ── GET /auth/me ───────────────────────────────────────────────────────────

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Usuário autenticado',
    description:
      'Retorna os dados do usuário dono do `accessToken`. Campo `passwordHash` é excluído.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dados do usuário.',
    schema: {
      example: {
        id: 'uuid',
        name: 'João Silva',
        email: 'joao@email.com',
        phone: '35999990000',
        role: 'client',
        isActive: true,
      },
    },
  })
  @ApiResponse(SwaggerResponses.unauthorized)
  me(@CurrentUser() user: User) {
    return user
  }
}
