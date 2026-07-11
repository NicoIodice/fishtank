/**
 * User data transfer objects for user management.
 * Matches backend UserDto and CreateUserRequest.
 */

export interface User {
  id: string;
  username: string;
  role: "Admin" | "StandardUser";
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
