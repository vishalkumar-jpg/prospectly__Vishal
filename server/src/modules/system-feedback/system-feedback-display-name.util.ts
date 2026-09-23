type FeedbackUserLike = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
};

function isSameAsEmail(value: string, email: string): boolean {
  return value.trim().toLowerCase() === email.trim().toLowerCase();
}

function resolveFeedbackDisplayName(user: FeedbackUserLike): string | null {
  const email = user.email.trim();
  const combined = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (combined && !isSameAsEmail(combined, email)) return combined;

  const fullName = user.fullName?.trim();
  return fullName && !isSameAsEmail(fullName, email) ? fullName : null;
}

/** Greeting in user emails — first name when available, otherwise display name or email (never duplicated). */
export function resolveFeedbackGreetingName(user: FeedbackUserLike): string {
  const email = user.email.trim();
  const firstName = user.firstName?.trim();
  if (firstName && !isSameAsEmail(firstName, email)) return firstName;

  const displayName = resolveFeedbackDisplayName(user);
  if (displayName && !isSameAsEmail(displayName, email)) return displayName;

  return email;
}

/** Team email submitter line — "Name (email)" or email only when no separate name. */
export function resolveFeedbackSubmitterLabel(user: FeedbackUserLike): string {
  const email = user.email.trim();
  const displayName = resolveFeedbackDisplayName(user);
  if (displayName && !isSameAsEmail(displayName, email)) {
    return `${displayName} (${email})`;
  }
  return email;
}
