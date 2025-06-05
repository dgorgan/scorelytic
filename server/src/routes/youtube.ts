import { Router } from 'express';
import { youtubeController, youtubeMetadataHandler } from '@/controllers/youtubeController';

const router: ReturnType<typeof Router> = Router();

router.post('/process', youtubeController.processVideo);
router.get('/process/stream', youtubeController.processVideoStream);
router.get('/metadata/:videoId', youtubeMetadataHandler);

export default router;
