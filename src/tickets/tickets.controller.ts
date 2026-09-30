import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from '../auth/api-key.guard.js';
import { CurrentOrg } from '../auth/current-org.decorator.js';
import type { Organization } from '../generated/prisma/client.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { ListTicketsQueryDto } from './dto/list-tickets-query.dto.js';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto.js';
import { toTicketResponse, type TicketResponse } from './ticket.mapper.js';
import { TicketsService } from './tickets.service.js';

@Controller('tickets')
@UseGuards(ApiKeyGuard)
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Post()
  async create(
    @CurrentOrg() org: Organization,
    @Body() dto: CreateTicketDto,
  ): Promise<TicketResponse> {
    return toTicketResponse(await this.tickets.create(org.id, dto));
  }

  @Get()
  async findAll(
    @CurrentOrg() org: Organization,
    @Query() query: ListTicketsQueryDto,
  ): Promise<TicketResponse[]> {
    const tickets = await this.tickets.findAll(org.id, query);
    return tickets.map(toTicketResponse);
  }

  @Get(':id')
  async findOne(
    @CurrentOrg() org: Organization,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TicketResponse> {
    return toTicketResponse(await this.tickets.findOne(org.id, id));
  }

  @Patch(':id/status')
  async updateStatus(
    @CurrentOrg() org: Organization,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketStatusDto,
  ): Promise<TicketResponse> {
    return toTicketResponse(await this.tickets.updateStatus(org.id, id, dto.status));
  }
}
