import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Organization } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { hashApiKey } from './api-key.js';

export interface OrgRequest extends Request {
  org: Organization;
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<OrgRequest>();
    const apiKey = request.header('x-api-key');
    if (!apiKey) throw new UnauthorizedException('Missing x-api-key header');

    const org = await this.prisma.organization.findUnique({
      where: { apiKeyHash: hashApiKey(apiKey) },
    });
    if (!org) throw new UnauthorizedException('Invalid API key');

    request.org = org;
    return true;
  }
}
