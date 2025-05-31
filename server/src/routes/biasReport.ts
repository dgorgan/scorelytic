import { Router } from 'express';
import { biasReportController } from '@/controllers/biasReportController';

const router: ReturnType<typeof Router> = Router();

router.post('/generate', biasReportController.generateReport);

export default router;
