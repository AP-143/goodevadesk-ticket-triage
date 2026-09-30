import type { PrismaService } from '../prisma/prisma.service.js';
import type { TriageService } from '../triage/triage.service.js';
import { TicketsService } from './tickets.service.js';

const DTO = {
  customer_email: 'alice@example.com',
  subject: 'Double charge',
  message: 'I was charged twice.',
};

const SAVED = {
  id: 'ticket-1',
  organizationId: 'org-1',
  customerEmail: DTO.customer_email,
  subject: DTO.subject,
  message: DTO.message,
  category: null,
  suggestedReply: null,
  status: 'open',
  createdAt: new Date('2026-09-30T00:00:00Z'),
};

function setup(triageResult: unknown) {
  const prisma = {
    ticket: {
      create: vi.fn().mockResolvedValue(SAVED),
      update: vi.fn(async ({ data }: { data: object }) => ({
        ...SAVED,
        ...data,
      })),
    },
  };
  const triage = { triage: vi.fn().mockResolvedValue(triageResult) };
  const service = new TicketsService(
    prisma as unknown as PrismaService,
    triage as unknown as TriageService,
  );
  return { prisma, triage, service };
}

describe('TicketsService.create', () => {
  it('saves the ticket under the organization before triage', async () => {
    const { prisma, triage, service } = setup(null);

    await service.create('org-1', DTO);

    expect(prisma.ticket.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-1',
        customerEmail: DTO.customer_email,
        subject: DTO.subject,
        message: DTO.message,
      },
    });
    expect(triage.triage).toHaveBeenCalledWith(
      'org-1',
      DTO.subject,
      DTO.message,
    );
  });

  it('keeps the ticket open with null triage fields when triage fails', async () => {
    const { prisma, service } = setup(null);

    await expect(service.create('org-1', DTO)).resolves.toEqual(SAVED);
    expect(prisma.ticket.update).not.toHaveBeenCalled();
  });

  it('stores the triage result, scoped to the organization', async () => {
    const { prisma, service } = setup({
      category: 'billing',
      suggestedReply: 'Hi',
    });

    const ticket = await service.create('org-1', DTO);

    expect(prisma.ticket.update).toHaveBeenCalledWith({
      where: { id: 'ticket-1', organizationId: 'org-1' },
      data: { category: 'billing', suggestedReply: 'Hi' },
    });
    expect(ticket).toMatchObject({
      category: 'billing',
      suggestedReply: 'Hi',
      status: 'open',
    });
  });

  it('returns the saved ticket when storing the triage result fails', async () => {
    const { prisma, service } = setup({
      category: 'billing',
      suggestedReply: 'Hi',
    });
    prisma.ticket.update.mockRejectedValue(new Error('connection lost'));

    await expect(service.create('org-1', DTO)).resolves.toEqual(SAVED);
  });
});
