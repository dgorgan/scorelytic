import { Router } from 'express';
import { youtubeController } from '../controllers/youtubeController';

const router = Router();

router.post('/process', youtubeController.processVideo);

export default router;
