import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  type Ticket,
  type TicketStatus,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TriageService } from '../triage/triage.service.js';
import type { CreateTicketDto } from './dto/create-ticket.dto.js';
import type { ListTicketsQueryDto } from './dto/list-tickets-query.dto.js';

const LIST_LIMIT = 50;

// Every query in this service is scoped by organizationId (tenant isolation).
@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly triage: TriageService,
  ) {}

  async create(organizationId: string, dto: CreateTicketDto): Promise<Ticket> {
    // Save first: the ticket must survive any LLM or cache failure.
    const ticket = await this.prisma.ticket.create({
      data: {
        organizationId,
        customerEmail: dto.customer_email,
        subject: dto.subject,
        message: dto.message,
      },
    });

    const result = await this.triage.triage(organizationId, dto.subject, dto.message);
    if (!result) return ticket;

    try {
      return await this.prisma.ticket.update({
        where: { id: ticket.id, organizationId },
        data: { category: result.category, suggestedReply: result.suggestedReply },
      });
    } catch (error) {
      this.logger.error(`Failed to store triage for ticket ${ticket.id}`, error);
      return ticket;
    }
  }

  findAll(organizationId: string, filter: ListTicketsQueryDto): Promise<Ticket[]> {
    return this.prisma.ticket.findMany({
      where: { organizationId, status: filter.status, category: filter.category },
      orderBy: { createdAt: 'desc' },
      take: LIST_LIMIT,
    });
  }

  async findOne(organizationId: string, id: string): Promise<Ticket> {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, organizationId },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async updateStatus(
    organizationId: string,
    id: string,
    status: TicketStatus,
  ): Promise<Ticket> {
    try {
      return await this.prisma.ticket.update({
        where: { id, organizationId },
        data: { status },
      });
    } catch (error) {
      // P2025: no row matched id + organizationId (missing or owned by another org).
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Ticket not found');
      }
      throw error;
    }
  }
}
