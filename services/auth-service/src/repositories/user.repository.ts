import { IUserRepository } from '../interfaces/user-repository.interface';
import { IUserDocument, CreateUserDto } from '../interfaces/user.interface';
import { Model } from 'mongoose';

export class UserRepository implements IUserRepository {
  constructor(private readonly userModel: Model<IUserDocument>) {}

  async create(data: CreateUserDto): Promise<IUserDocument> {
    return this.userModel.create(data);
  }

  async findByEmail(email: string): Promise<IUserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() });
  }

  async findById(id: string): Promise<IUserDocument | null> {
    return this.userModel.findById(id);
  }
}
