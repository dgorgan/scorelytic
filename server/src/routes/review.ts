import { Router } from 'express';
import { reviewController } from '@/controllers/reviewController';

const router: ReturnType<typeof Router> = Router();

router.post('/analyze', reviewController.analyzeReview);

export default router;
