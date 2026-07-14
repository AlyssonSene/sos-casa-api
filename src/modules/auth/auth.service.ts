import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'
import { UsersService } from '../users/users.service'
import { Role } from '../../common/enums/role.enum'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { JwtPayload } from './strategies/jwt.strategy'

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ─── Register ────────────────────────────────────────────────────────────────

  async register(dto: RegisterDto, role: Role = Role.CLIENT) {
    const existing = await this.usersService.findByEmail(dto.email)
    if (existing) throw new ConflictException('Email already in use')

    const passwordHash = await bcrypt.hash(dto.password, 10)

    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      role,
    })

    return this.generateTokens(user.id, user.email, user.role)
  }

  // ─── Login ───────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email)
    if (!user) throw new UnauthorizedException('Invalid credentials')

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash)
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials')

    if (!user.isActive) throw new UnauthorizedException('Account disabled')

    return this.generateTokens(user.id, user.email, user.role)
  }

  // ─── Refresh ─────────────────────────────────────────────────────────────────

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      })

      const user = await this.usersService.findById(payload.sub)
      if (!user || !user.isActive) throw new UnauthorizedException()

      return this.generateTokens(user.id, user.email, user.role)
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token')
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private generateTokens(sub: string, email: string, role: string) {
    const payload = { sub, email, role }

    // expiresIn needs StringValue type — cast via any to bypass strict overload check

    const sign = (p: object, secret: string, expiresIn: string) =>
      (this.jwtService.sign as any)(p, { secret, expiresIn }) as string

    const accessToken = sign(
      payload,
      this.config.get<string>('jwt.accessSecret')!,
      this.config.get<string>('jwt.accessExpiresIn')!,
    )

    const refreshToken = sign(
      payload,
      this.config.get<string>('jwt.refreshSecret')!,
      this.config.get<string>('jwt.refreshExpiresIn')!,
    )

    return { accessToken, refreshToken }
  }
}
