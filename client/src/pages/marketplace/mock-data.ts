/**
 * Utility function to generate unique sharer codes
 */
export const generateSharerCode = (): string =>
  Math.random().toString(36).substring(2, 10) +
  Math.random().toString(36).substring(2, 10);
