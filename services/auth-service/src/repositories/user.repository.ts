import { User } from '../models/user.model';
import { IUser } from '../interfaces/user.interface';

export class UserRepository {
  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email });
  }

  async findById(id: string): Promise<IUser | null> {
    return User.findById(id);
  }

  async create(data: { email: string; password: string; role?: 'admin' | 'customer' }): Promise<IUser> {
    const user = new User(data);
    return user.save();
  }
}
