import { IsEnum, IsOptional } from 'class-validator';
import { TicketCategory, TicketStatus } from '../../generated/prisma/client.js';

export class ListTicketsQueryDto {
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;
}
