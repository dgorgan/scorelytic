import { Router } from 'express';
import { youtubeController } from '@/controllers/youtubeController';

const router: ReturnType<typeof Router> = Router();

router.post('/process', youtubeController.processVideo);

export default router;
