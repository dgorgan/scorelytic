import { Router } from 'express';
import { biasReportController } from '@/controllers/biasReportController';

const router = Router();

router.post('/generate', biasReportController.generateReport);

export default router; 