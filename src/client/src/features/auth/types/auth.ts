export interface AuthUser {
  userId: string;
  username: string;
  role: string;
  forcePasswordChange: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  username: string;
  role: string;
  forcePasswordChange: boolean;
}

export interface SetupRequest {
  username: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
