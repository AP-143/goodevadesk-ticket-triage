import type {
  Ticket,
  TicketCategory,
  TicketStatus,
} from '../generated/prisma/client.js';

export interface TicketResponse {
  id: string;
  organization_id: string;
  customer_email: string;
  subject: string;
  message: string;
  category: TicketCategory | null;
  suggested_reply: string | null;
  status: TicketStatus;
  created_at: Date;
}

export function toTicketResponse(ticket: Ticket): TicketResponse {
  return {
    id: ticket.id,
    organization_id: ticket.organizationId,
    customer_email: ticket.customerEmail,
    subject: ticket.subject,
    message: ticket.message,
    category: ticket.category,
    suggested_reply: ticket.suggestedReply,
    status: ticket.status,
    created_at: ticket.createdAt,
  };
}
