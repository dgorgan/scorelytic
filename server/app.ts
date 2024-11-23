import 'module-alias/register';
import express, { Request, Response, Express } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import gameRoutes from './src/routes/gameRoutes';


dotenv.config();

const app: Express = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

console.log('Mongo URI:', process.env.MONGO_URI);
console.log('processEnv:', process.env);

// // DB Connection
// mongoose.connect(process.env.MONGO_URI!).then(() => console.log('Database connected'))
//   .catch(err => console.error('Database connection error:', err));

// Test route
app.get('/', (req: Request, res: Response) => res.send('API is working!'));
app.use('/games', gameRoutes);

export default app;

