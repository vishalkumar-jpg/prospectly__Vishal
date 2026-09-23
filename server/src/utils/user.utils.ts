import { User } from "database/schema/users";

/**
 * Sanitize user object(s) by removing the password field
 * This ensures passwords are never exposed in API responses
 *
 * @param user - User object, array of users, null, or undefined
 * @returns Sanitized user object(s) without password field
 */
export function sanitizeUser<T extends User | null | undefined>(
  user: T
): T extends User ? Omit<User, "password"> : T;
export function sanitizeUser<T extends User[]>(
  user: T
): Array<Omit<User, "password">>;
export function sanitizeUser(
  user: User | User[] | null | undefined
): Omit<User, "password"> | Array<Omit<User, "password">> | null | undefined {
  if (!user) {
    return user;
  }

  if (Array.isArray(user)) {
    return user.map((u) => {
      const { password: _password, ...sanitized } = u;
      return sanitized;
    });
  }

  const { password: _password, ...sanitized } = user;
  return sanitized;
}
