export interface RegisterDto {
  email: string;
  password: string;
  name: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface UserWithoutPassword {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'customer';
}

export interface AuthResponse {
  user: UserWithoutPassword;
  token: string;
}

export interface UserProfile extends UserWithoutPassword {
  createdAt: Date;
}

export interface IAuthService {
  register(data: RegisterDto): Promise<AuthResponse>;
  login(data: LoginDto): Promise<AuthResponse>;
  getProfile(userId: string): Promise<UserProfile>;
}
