import request from 'supertest';
import app from '../app';

describe('Health and API Routes', () => {
  it('GET /health returns 200 ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('reachinbox-api');
  });

  it('GET /api/v1/auth/me returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('GET /api/v1/auth/me returns user when developer credentials provided', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('x-dev-user-id', 'usr_test')
      .set('x-dev-user-email', 'test@reachinbox.ai');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('usr_test');
    expect(res.body.email).toBe('test@reachinbox.ai');
  });

  it('POST /api/v1/campaigns returns 400 when body is invalid', async () => {
    const res = await request(app)
      .post('/api/v1/campaigns')
      .set('x-dev-user-id', 'usr_test')
      .set('x-dev-user-email', 'test@reachinbox.ai')
      .send({
        subject: '',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
