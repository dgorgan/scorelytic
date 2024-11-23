import { Request, Response } from 'express';
export const getGames = (req: Request, res: Response) => {
  res.status(200).json([{ id: 1, title: 'Game 1' }, { id: 2, title: 'Game 2' }]);
};
