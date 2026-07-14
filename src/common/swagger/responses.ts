/**
 * Tipos de resposta reutilizáveis para @ApiResponse em todos os controllers.
 * Uso: @ApiResponse(SwaggerResponses.unauthorized)
 */

export const SwaggerResponses = {
  badRequest: {
    status: 400,
    description: 'Dados inválidos — falha na validação do body/query/param.',
    schema: {
      example: {
        statusCode: 400,
        message: ['field must be a string'],
        error: 'Bad Request',
      },
    },
  },
  unauthorized: {
    status: 401,
    description: 'Não autenticado — JWT ausente ou inválido.',
    schema: {
      example: { statusCode: 401, message: 'Unauthorized' },
    },
  },
  forbidden: {
    status: 403,
    description: 'Acesso negado — role insuficiente.',
    schema: {
      example: { statusCode: 403, message: 'Forbidden resource' },
    },
  },
  notFound: (resource = 'Recurso') => ({
    status: 404,
    description: `${resource} não encontrado.`,
    schema: {
      example: { statusCode: 404, message: `${resource} not found` },
    },
  }),
  conflict: (description = 'Recurso já existe.') => ({
    status: 409,
    description,
    schema: {
      example: { statusCode: 409, message: 'Conflict' },
    },
  }),
  noContent: {
    status: 204,
    description: 'Operação realizada. Sem conteúdo no retorno.',
  },
} as const
