import { IsEnum } from 'class-validator';
import { TicketStatus } from '../../generated/prisma/client.js';

export class UpdateTicketStatusDto {
  @IsEnum(TicketStatus)
  status: TicketStatus;
}
