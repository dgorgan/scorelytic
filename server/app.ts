import 'module-alias/register';
import express, { Request, Response, Express } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
// import { supabase } from '@/lib/supabaseClient';

import gameRoutes from './src/routes/gameRoutes';

dotenv.config();

const app: Express = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Test route
app.get('/', (req: Request, res: Response) => res.send('Scorelytic API'));
app.use('/api/games', gameRoutes);

export default app;

