// src/routes/gameRoutes.ts
import { Router, Request, Response } from 'express';

const router = Router();

// Define your routes
router.get('/', (req: Request, res: Response) => {
  res.send('List of games');
});

// You can add more routes as needed
router.post('/', (req: Request, res: Response) => {
  res.send('Create a new game');
});

export default router;
