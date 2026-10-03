export type AuthUser = { id: string; email: string; displayName: string | null }
export type AuthResponse = { user: AuthUser; message: string }
export type RegisterInput = { fullName: string; email: string; password: string }
export type LoginInput = { identifier: string; password: string }
