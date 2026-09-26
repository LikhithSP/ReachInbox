import express, { Request, Response } from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import authRouter from './routes/auth';
import campaignsRouter from './routes/campaigns';
import emailsRouter from './routes/emails';
import sendersRouter from './routes/senders';
import { requestIdMiddleware, errorHandlerMiddleware } from './middleware/errorHandler';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { emailQueue } from './queues/emailQueue';

const app = express();

// Bull Board UI for queue monitoring and operational observability (RI-050)
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');
createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter,
});
app.use('/admin/queues', serverAdapter.getRouter());

app.use(requestIdMiddleware);
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'reachinbox-scheduler-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'reachinbox-api'
  });
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/campaigns', campaignsRouter);
app.use('/api/v1/emails', emailsRouter);
app.use('/api/v1/senders', sendersRouter);

app.use(errorHandlerMiddleware);

export default app;

