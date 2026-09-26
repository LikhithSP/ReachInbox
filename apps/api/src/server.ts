import app from './app';
import { SchedulerService } from './services/scheduler.service';

const PORT = process.env.PORT || 4000;

app.listen(PORT, async () => {
  console.log(`ReachInbox API server running on port ${PORT}`);
  // Run startup reconciliation for pending scheduled jobs (ADR-005)
  await SchedulerService.reconcilePendingJobs();
});
