/**
 * Application modules that can be gated per organisation.
 *
 * Prospecting is always available to every authenticated user and is therefore
 * intentionally NOT listed here. Only modules that require an organisation grant
 * (surfaced via `user.accessibleModules` from `/auth/me`) belong in this map.
 */
export const APP_MODULES = {
  RECRUITING: "recruiting",
} as const;

export type AppModule = (typeof APP_MODULES)[keyof typeof APP_MODULES];

/**
 * Returns true when the user's organisation(s) have been granted the module.
 */
export function hasModuleAccess(
  accessibleModules: string[] | undefined | null,
  module: AppModule
): boolean {
  return Boolean(accessibleModules?.includes(module));
}
