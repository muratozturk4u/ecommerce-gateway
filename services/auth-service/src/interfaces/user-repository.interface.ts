import { IUserDocument, CreateUserDto } from './user.interface';

export interface IUserRepository {
  create(data: CreateUserDto): Promise<IUserDocument>;
  findByEmail(email: string): Promise<IUserDocument | null>;
  findById(id: string): Promise<IUserDocument | null>;
}
