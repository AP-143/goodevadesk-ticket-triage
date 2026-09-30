import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Organization } from '../generated/prisma/client.js';
import type { OrgRequest } from './api-key.guard.js';

/** The organization resolved by ApiKeyGuard. The only valid source of organizationId. */
export const CurrentOrg = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Organization =>
    context.switchToHttp().getRequest<OrgRequest>().org,
);
