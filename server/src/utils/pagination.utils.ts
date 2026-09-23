/**
 * Parses limit and offset strings into integers and applies clamping.
 * @param limit Raw limit string from query
 * @param offset Raw offset string from query
 * @param defaultLimit Default limit if parsing fails or is missing (default: 50)
 * @param maxLimit Maximum allowed limit (default: 100)
 * @returns Object containing parsed and clamped limit and offset
 */
export const parseClampPagination = (
  limit?: string,
  offset?: string,
  defaultLimit = 50,
  maxLimit = 100
) => {
  const parsedLimit = parseInt(limit ?? "", 10);
  const parsedOffset = parseInt(offset ?? "", 10);

  const newLimit = Math.min(
    maxLimit,
    Math.max(1, Number.isNaN(parsedLimit) ? defaultLimit : parsedLimit)
  );

  const newOffset = Math.max(0, Number.isNaN(parsedOffset) ? 0 : parsedOffset);

  return { newLimit, newOffset };
};
