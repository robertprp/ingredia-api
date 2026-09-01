import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { ZodType } from 'zod';
import { ContractValidationPipe } from './contract-validation.pipe';

export function ContractHeaders<TContract>(
  schema: ZodType<TContract>,
): ParameterDecorator {
  const headers = createParamDecorator(
    (_data: unknown, context: ExecutionContext) =>
      context.switchToHttp().getRequest<Request>().headers,
  );
  return headers(new ContractValidationPipe(schema));
}
