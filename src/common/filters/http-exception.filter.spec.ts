import { HttpExceptionFilter } from './http-exception.filter'
import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common'

const makeHost = (json: jest.Mock): ArgumentsHost =>
  ({
    switchToHttp: () => ({
      getResponse: () => ({
        status: jest.fn().mockReturnValue({ json }),
      }),
      getRequest: () => ({ method: 'GET', url: '/test' }),
    }),
  }) as unknown as ArgumentsHost

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter

  beforeEach(() => {
    filter = new HttpExceptionFilter()
  })

  it('should format exception with object message', () => {
    const json = jest.fn()
    const exception = new HttpException({ message: ['field is required'] }, HttpStatus.BAD_REQUEST)
    filter.catch(exception, makeHost(json))
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: ['field is required'],
      }),
    )
  })

  it('should format exception with string message', () => {
    const json = jest.fn()
    const exception = new HttpException('Not found', HttpStatus.NOT_FOUND)
    filter.catch(exception, makeHost(json))
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Not found',
      }),
    )
  })

  it('should include timestamp and path in response', () => {
    const json = jest.fn()
    const exception = new HttpException('Error', HttpStatus.INTERNAL_SERVER_ERROR)
    filter.catch(exception, makeHost(json))
    const call = json.mock.calls[0][0] as Record<string, unknown>
    expect(call).toHaveProperty('timestamp')
    expect(call).toHaveProperty('path', '/test')
  })

  it('should use INTERNAL_SERVER_ERROR when exception is not instanceof HttpException', () => {
    const json = jest.fn()
    // Bypass TypeScript types to exercise the else branch of the instanceof ternary
    const nonHttp = {
      getResponse: () => 'unexpected error',
      message: 'unexpected error',
    } as unknown as HttpException
    filter.catch(nonHttp, makeHost(json))
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: HttpStatus.INTERNAL_SERVER_ERROR }),
    )
  })
})
