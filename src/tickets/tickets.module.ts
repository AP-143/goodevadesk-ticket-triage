import { Module } from '@nestjs/common';
import { TriageModule } from '../triage/triage.module.js';
import { TicketsController } from './tickets.controller.js';
import { TicketsService } from './tickets.service.js';

@Module({
  imports: [TriageModule],
  controllers: [TicketsController],
  providers: [TicketsService],
})
export class TicketsModule {}
