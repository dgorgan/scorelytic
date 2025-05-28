import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';

// Import routes
import biasReportRoutes from './routes/biasReport';
import sentimentRoutes from './routes/sentiment';
import reviewRoutes from './routes/review';
import gameRoutes from './routes/game';
import youtubeRoutes from './routes/youtube';
import creatorRoutes from './routes/creator';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/bias-report', biasReportRoutes);
app.use('/api/sentiment', sentimentRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/creator', creatorRoutes);

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 