const CALENDAR_CONNECT_RETURN_KEY = "prospectly_calendar_connect_return_to";
const CALENDAR_REOPEN_MODAL_KEY = "prospectly_calendar_reopen_modal";

export function isSafeCalendarReturnPath(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//")) {
    return false;
  }
  return !path.includes("://");
}

export function setCalendarConnectReturn(path: string): void {
  if (!isSafeCalendarReturnPath(path)) {
    return;
  }
  try {
    sessionStorage.setItem(CALENDAR_CONNECT_RETURN_KEY, path);
  } catch {
    // Ignore storage errors (private browsing, quota, etc.)
  }
}

export function clearCalendarConnectReturn(): void {
  try {
    sessionStorage.removeItem(CALENDAR_CONNECT_RETURN_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function peekCalendarConnectReturn(): string | null {
  try {
    const path = sessionStorage.getItem(CALENDAR_CONNECT_RETURN_KEY);
    if (!path || !isSafeCalendarReturnPath(path)) {
      return null;
    }
    return path;
  } catch {
    return null;
  }
}

export function consumeCalendarConnectReturn(): string | null {
  const path = peekCalendarConnectReturn();
  try {
    sessionStorage.removeItem(CALENDAR_CONNECT_RETURN_KEY);
  } catch {
    // Ignore storage errors
  }
  return path;
}

export function setCalendarConnectReopenModal(): void {
  try {
    sessionStorage.setItem(CALENDAR_REOPEN_MODAL_KEY, "1");
  } catch {
    // Ignore storage errors
  }
}

export function consumeCalendarConnectReopenModal(): boolean {
  try {
    const value = sessionStorage.getItem(CALENDAR_REOPEN_MODAL_KEY);
    sessionStorage.removeItem(CALENDAR_REOPEN_MODAL_KEY);
    return value === "1";
  } catch {
    return false;
  }
}

export function clearCalendarConnectReopenModal(): void {
  try {
    sessionStorage.removeItem(CALENDAR_REOPEN_MODAL_KEY);
  } catch {
    // Ignore storage errors
  }
}
