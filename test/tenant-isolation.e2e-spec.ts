import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { hashApiKey } from '../src/auth/api-key.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { GeminiClient } from '../src/triage/gemini.client.js';

const FAKE_REPLY = 'We are checking your invoice.';

describe('Tenant isolation (e2e)', () => {
  const keyA = `e2e-a-${randomUUID()}`;
  const keyB = `e2e-b-${randomUUID()}`;
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let orgAId: string;
  let orgBId: string;
  let ticketId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GeminiClient)
      .useValue({
        complete: async () =>
          JSON.stringify({ category: 'billing', suggested_reply: FAKE_REPLY }),
      })
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    const [orgA, orgB] = await Promise.all([
      prisma.organization.create({
        data: { name: 'E2E Org A', apiKeyHash: hashApiKey(keyA) },
      }),
      prisma.organization.create({
        data: { name: 'E2E Org B', apiKeyHash: hashApiKey(keyB) },
      }),
    ]);
    orgAId = orgA.id;
    orgBId = orgB.id;

    const created = await request(app.getHttpServer())
      .post('/tickets')
      .set('x-api-key', keyA)
      .send({
        customer_email: 'alice@example.com',
        subject: 'Double charge',
        message: 'I was charged twice this month.',
      })
      .expect(201);
    ticketId = created.body.id;
  });

  afterAll(async () => {
    const orgIds = [orgAId, orgBId];
    await prisma.ticket.deleteMany({
      where: { organizationId: { in: orgIds } },
    });
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
    await app.close();
  });

  it('rejects a request without an API key', async () => {
    await request(app.getHttpServer()).get('/tickets').expect(401);
  });

  it('rejects an unknown API key', async () => {
    await request(app.getHttpServer())
      .get('/tickets')
      .set('x-api-key', 'wrong-key')
      .expect(401);
  });

  it('returns the created ticket with triage fields in snake_case', async () => {
    const res = await request(app.getHttpServer())
      .get(`/tickets/${ticketId}`)
      .set('x-api-key', keyA)
      .expect(200);

    expect(res.body).toMatchObject({
      id: ticketId,
      organization_id: orgAId,
      customer_email: 'alice@example.com',
      category: 'billing',
      suggested_reply: FAKE_REPLY,
      status: 'open',
    });
  });

  it('rejects an organization_id sent in the request body', async () => {
    await request(app.getHttpServer())
      .post('/tickets')
      .set('x-api-key', keyA)
      .send({
        customer_email: 'alice@example.com',
        subject: 'Hi',
        message: 'Hello',
        organization_id: orgBId,
      })
      .expect(400);
  });

  it('hides the ticket from another organization list', async () => {
    const other = await request(app.getHttpServer())
      .get('/tickets')
      .set('x-api-key', keyB)
      .expect(200);
    expect(other.body.map((t: { id: string }) => t.id)).not.toContain(ticketId);

    const own = await request(app.getHttpServer())
      .get('/tickets')
      .set('x-api-key', keyA)
      .expect(200);
    expect(own.body.map((t: { id: string }) => t.id)).toContain(ticketId);
  });

  it('returns 404 when another organization reads the ticket', async () => {
    await request(app.getHttpServer())
      .get(`/tickets/${ticketId}`)
      .set('x-api-key', keyB)
      .expect(404);
  });

  it('returns 404 when another organization updates the status, and leaves it unchanged', async () => {
    await request(app.getHttpServer())
      .patch(`/tickets/${ticketId}/status`)
      .set('x-api-key', keyB)
      .send({ status: 'closed' })
      .expect(404);

    const res = await request(app.getHttpServer())
      .get(`/tickets/${ticketId}`)
      .set('x-api-key', keyA)
      .expect(200);
    expect(res.body.status).toBe('open');
  });

  it('lets the owner update the status and filter by it', async () => {
    const updated = await request(app.getHttpServer())
      .patch(`/tickets/${ticketId}/status`)
      .set('x-api-key', keyA)
      .send({ status: 'in_progress' })
      .expect(200);
    expect(updated.body.status).toBe('in_progress');

    const matching = await request(app.getHttpServer())
      .get('/tickets?status=in_progress&category=billing')
      .set('x-api-key', keyA)
      .expect(200);
    expect(matching.body.map((t: { id: string }) => t.id)).toContain(ticketId);

    const closed = await request(app.getHttpServer())
      .get('/tickets?status=closed')
      .set('x-api-key', keyA)
      .expect(200);
    expect(closed.body.map((t: { id: string }) => t.id)).not.toContain(
      ticketId,
    );
  });

  it('rejects an invalid status value', async () => {
    await request(app.getHttpServer())
      .patch(`/tickets/${ticketId}/status`)
      .set('x-api-key', keyA)
      .send({ status: 'done' })
      .expect(400);
  });
});
