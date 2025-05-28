import { Router } from 'express';
import { gameController } from '../controllers/gameController';

const router = Router();

router.get('/', gameController.getGames);
router.get('/:id', gameController.getGameById);

export default router; 