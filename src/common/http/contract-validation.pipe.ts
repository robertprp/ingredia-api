import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import {
  FieldError,
  ValidationErrorCode,
} from '@ingredia/contracts';
import { ZodType } from 'zod';

export class ContractValidationException extends BadRequestException {
  constructor(readonly fieldErrors: FieldError[]) {
    super('The request did not match the required contract.');
  }
}

@Injectable()
export class ContractValidationPipe<TContract>
  implements PipeTransform<object, TContract>
{
  constructor(private readonly schema: ZodType<TContract>) {}

  transform(value: object): TContract {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;

    throw new ContractValidationException(
      result.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'request',
        code: this.mapIssueCode(issue.code),
        message: issue.message,
      })),
    );
  }

  private mapIssueCode(code: string): ValidationErrorCode {
    if (code === 'too_small') return ValidationErrorCode.TOO_SMALL;
    if (code === 'too_big') return ValidationErrorCode.TOO_LARGE;
    if (code === 'invalid_type') return ValidationErrorCode.REQUIRED;
    return ValidationErrorCode.INVALID;
  }
}

