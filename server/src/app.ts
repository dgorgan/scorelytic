import 'module-alias/register';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
const bodyParser = require('body-parser');

import gameRoutes from './routes/game';
import reviewRoutes from './routes/review';
import sentimentRoutes from './routes/sentiment';
import youtubeRoutes from './routes/youtube';

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
app.use('/api/youtube', youtubeRoutes);

export default app;
