import { RolesGuard } from './roles.guard'
import { Reflector } from '@nestjs/core'
import { ExecutionContext } from '@nestjs/common'
import { Role } from '../enums/role.enum'

const mockReflector = { getAllAndOverride: jest.fn() }

const makeContext = (role?: Role): ExecutionContext =>
  ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { role } : undefined }),
    }),
  }) as unknown as ExecutionContext

describe('RolesGuard', () => {
  let guard: RolesGuard

  beforeEach(() => {
    guard = new RolesGuard(mockReflector as unknown as Reflector)
    jest.clearAllMocks()
  })

  it('should allow access when no roles are required', () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined)
    expect(guard.canActivate(makeContext())).toBe(true)
  })

  it('should allow access when user has required role', () => {
    mockReflector.getAllAndOverride.mockReturnValue([Role.ADMIN])
    expect(guard.canActivate(makeContext(Role.ADMIN))).toBe(true)
  })

  it('should deny access when user does not have required role', () => {
    mockReflector.getAllAndOverride.mockReturnValue([Role.ADMIN])
    expect(guard.canActivate(makeContext(Role.CLIENT))).toBe(false)
  })

  it('should deny access when user is undefined', () => {
    mockReflector.getAllAndOverride.mockReturnValue([Role.ADMIN])
    expect(guard.canActivate(makeContext())).toBe(false)
  })
})
