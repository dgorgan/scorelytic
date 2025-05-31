import { Router } from 'express';
import { sentimentController } from '@/controllers/sentimentController';

const router: ReturnType<typeof Router> = Router();

router.post('/analyze', sentimentController.analyze);

export default router;
