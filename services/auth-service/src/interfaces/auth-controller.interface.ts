import { Request, Response } from 'express';

export interface IAuthController {
  register(req: Request, res: Response): Promise<void>;
  login(req: Request, res: Response): Promise<void>;
  getProfile(req: Request, res: Response): Promise<void>;
}
