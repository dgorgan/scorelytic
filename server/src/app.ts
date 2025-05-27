import 'module-alias/register';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
const bodyParser = require('body-parser');

import gameRoutes from './routes/gameRoutes';
import reviewRoutes from './routes/reviewRoutes';
import sentimentRoutes from './routes/sentimentRoutes';

dotenv.config();

const app: express.Application = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Test route
app.get('/', (req: express.Request, res: express.Response) => res.send('Scorelytic API'));
app.use('/api/games', gameRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/sentiment', sentimentRoutes);

export default app;
