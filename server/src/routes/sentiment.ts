import { Router } from 'express';
import { sentimentController } from '@/controllers/sentimentController';

const router = Router();

router.post('/analyze', sentimentController.analyze);

export default router;
