import { Router } from 'express';
import { youtubeController } from '@/controllers/youtubeController';

const router: ReturnType<typeof Router> = Router();

router.post('/process', youtubeController.processVideo);
router.get('/process/stream', youtubeController.processVideoStream);
router.get('/metadata/:videoId', youtubeController.youtubeMetadataHandler);
router.get('/general-analysis', youtubeController.generalAnalysisHandler);

export default router;
