import 'module-alias/register';
import express, { Request, Response, Express } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
// import { supabase } from '@/lib/supabaseClient';

import gameRoutes from './routes/gameRoutes';
import reviewRoutes from './routes/reviewRoutes';
import sentimentRoutes from './routes/sentimentRoutes';

dotenv.config();

const app: Express = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Test route
app.get('/', (req: Request, res: Response) => res.send('Scorelytic API'));
app.use('/api/games', gameRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/sentiment', sentimentRoutes);

export default app;

