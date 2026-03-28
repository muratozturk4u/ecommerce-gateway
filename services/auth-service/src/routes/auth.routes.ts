import { Router } from 'express';
import { SignOptions } from 'jsonwebtoken';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { UserRepository } from '../repositories/user.repository';
import { UserModel } from '../models/user.model';
import { Config } from '../config';

const userRepository = new UserRepository(UserModel);
const authService = new AuthService(userRepository, Config.JWT_SECRET, Config.JWT_EXPIRES_IN as SignOptions['expiresIn']);
const authController = new AuthController(authService);

const router = Router();

router.post('/auth/register', authController.register.bind(authController));
router.post('/auth/login', authController.login.bind(authController));
router.get('/auth/profile', authController.getProfile.bind(authController));

export { router as authRouter };
