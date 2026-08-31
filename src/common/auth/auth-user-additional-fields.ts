import type { BetterAuthOptions } from 'better-auth';

type UserAdditionalFields = NonNullable<
  NonNullable<BetterAuthOptions['user']>['additionalFields']
>;

export const authUserAdditionalFields = {
  verificationStatus: {
    type: [
      'NOT_STARTED',
      'IN_PROGRESS',
      'APPROVED',
      'DECLINED',
      'IN_REVIEW',
      'RESUBMISSION_REQUIRED',
      'EXPIRED',
      'ABANDONED',
      'KYC_EXPIRED',
      'AWAITING_USER',
    ],
    required: true,
    defaultValue: 'NOT_STARTED',
    input: false,
    returned: false,
  },
  identityVerifiedAt: {
    type: 'date',
    required: false,
    input: false,
    returned: false,
  },
  verificationStatusUpdatedAt: {
    type: 'date',
    required: false,
    input: false,
    returned: false,
  },
  verificationStatusEventId: {
    type: 'string',
    required: false,
    input: false,
    returned: false,
  },
} satisfies UserAdditionalFields;
