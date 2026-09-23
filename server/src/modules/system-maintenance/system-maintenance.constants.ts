export const SYSTEM_MAINTENANCE_MESSAGES = {
  CLEANUP_START: "Starting database cleanup...",
  DELETING_USERS: "Deleting all users (cascading)...",
  CLEANUP_COMPLETED: "Database cleanup completed in",
  CLEANUP_SUCCESS: "Database cleanup completed successfully.",
  CLEANUP_FAILED: "Database cleanup failed:",
  CONTROLLER: {
    INITIATING_CLEANUP:
      "SYSTEM_MAINTENANCE_CONTROLLER :: CLEAN_DATABASE : Initiating database cleanup...",
    ERROR: "SYSTEM_MAINTENANCE_CONTROLLER :: CLEAN_DATABASE : ERROR :",
    PRODUCTION_BLOCKED:
      "SYSTEM_MAINTENANCE_CONTROLLER :: CLEAN_DATABASE : Operation blocked in production environment without explicit override.",
  },
};
