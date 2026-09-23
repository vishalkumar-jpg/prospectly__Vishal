import * as React from "react";

import type {
  ToastPosition,
  ToastProps,
  ToastVariant,
} from "@/components/ui/toast";

const TOAST_LIMIT = 5;
const DEFAULT_DURATION = 8000;
const LEAVE_ANIMATION_MS = 320;

export type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  open?: boolean;
  paused?: boolean;
};

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

type ActionType = typeof actionTypes;

type Action =
  | { type: ActionType["ADD_TOAST"]; toast: ToasterToast }
  | { type: ActionType["UPDATE_TOAST"]; toast: Partial<ToasterToast> }
  | { type: ActionType["DISMISS_TOAST"]; toastId?: ToasterToast["id"] }
  | { type: ActionType["REMOVE_TOAST"]; toastId?: ToasterToast["id"] };

interface State {
  toasts: ToasterToast[];
}

const removeTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const queueRemoval = (toastId: string) => {
  if (removeTimeouts.has(toastId)) return;
  const timeout = setTimeout(() => {
    removeTimeouts.delete(toastId);
    dispatch({ type: "REMOVE_TOAST", toastId });
  }, LEAVE_ANIMATION_MS);
  removeTimeouts.set(toastId, timeout);
};

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case "DISMISS_TOAST": {
      const { toastId } = action;

      if (toastId) {
        queueRemoval(toastId);
      } else {
        state.toasts.forEach((toast) => queueRemoval(toast.id));
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined ? { ...t, open: false } : t
        ),
      };
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return { ...state, toasts: [] };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

const listeners: Array<(state: State) => void> = [];

let memoryState: State = { toasts: [] };

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => listener(memoryState));
}

const autoDismissTimers = new Map<string, ReturnType<typeof setTimeout>>();

const clearAutoDismiss = (id: string) => {
  const existing = autoDismissTimers.get(id);
  if (existing) {
    clearTimeout(existing);
    autoDismissTimers.delete(id);
  }
};

export const scheduleAutoDismiss = (id: string, ms: number) => {
  clearAutoDismiss(id);
  if (!Number.isFinite(ms) || ms <= 0) return;
  const timer = setTimeout(() => {
    autoDismissTimers.delete(id);
    dispatch({ type: "DISMISS_TOAST", toastId: id });
  }, ms);
  autoDismissTimers.set(id, timer);
};

export const cancelAutoDismiss = (id: string) => {
  clearAutoDismiss(id);
};

export const setToastPaused = (id: string, paused: boolean) => {
  dispatch({ type: "UPDATE_TOAST", toast: { id, paused } });
};

export type ToastInput = Omit<ToasterToast, "id" | "open" | "paused"> & {
  id?: string;
};

type ShortcutOptions = Omit<ToastInput, "title" | "variant">;

type ToastReturn = {
  id: string;
  dismiss: () => void;
  update: (props: Partial<ToasterToast>) => void;
};

function dispatchToast(props: ToastInput): ToastReturn {
  const id = props.id ?? genId();
  const duration = props.duration ?? DEFAULT_DURATION;

  const update = (next: Partial<ToasterToast>) =>
    dispatch({ type: "UPDATE_TOAST", toast: { ...next, id } });

  const dismiss = () => {
    clearAutoDismiss(id);
    dispatch({ type: "DISMISS_TOAST", toastId: id });
  };

  const existing = memoryState.toasts.find((t) => t.id === id);
  if (existing) {
    update({ ...props, duration, open: true, paused: false });
  } else {
    dispatch({
      type: "ADD_TOAST",
      toast: {
        ...props,
        id,
        duration,
        open: true,
        paused: false,
      },
    });
  }

  scheduleAutoDismiss(id, duration);

  return { id, dismiss, update };
}

const buildShortcut =
  (variant: ToastVariant) =>
  (title: React.ReactNode, options: ShortcutOptions = {}): ToastReturn =>
    dispatchToast({ ...options, title, variant });

type ToastFn = ((props: ToastInput) => ToastReturn) & {
  success: (title: React.ReactNode, options?: ShortcutOptions) => ToastReturn;
  error: (title: React.ReactNode, options?: ShortcutOptions) => ToastReturn;
  info: (title: React.ReactNode, options?: ShortcutOptions) => ToastReturn;
  warning: (title: React.ReactNode, options?: ShortcutOptions) => ToastReturn;
  loading: (title: React.ReactNode, options?: ShortcutOptions) => ToastReturn;
  message: (title: React.ReactNode, options?: ShortcutOptions) => ToastReturn;
  dismiss: (id?: string) => void;
};

const toast = ((props: ToastInput) => dispatchToast(props)) as ToastFn;

toast.success = buildShortcut("success");
toast.error = buildShortcut("destructive");
// info/warning are surfaced for migration parity. They render as the default
// (neutral) variant today; if/when info/warning visual styles are introduced,
// these shortcuts pick them up automatically.
toast.info = (title, options = {}) =>
  dispatchToast({ ...options, title, variant: "default" });
toast.warning = (title, options = {}) =>
  dispatchToast({ ...options, title, variant: "destructive" });
toast.message = (title, options = {}) =>
  dispatchToast({ ...options, title, variant: "default" });
toast.loading = (title, options = {}) =>
  dispatchToast({
    ...options,
    title,
    variant: "default",
    duration: options.duration ?? Number.POSITIVE_INFINITY,
  });
toast.dismiss = (id?: string) => {
  if (id) {
    clearAutoDismiss(id);
  } else {
    autoDismissTimers.forEach((timer) => clearTimeout(timer));
    autoDismissTimers.clear();
  }
  dispatch({ type: "DISMISS_TOAST", toastId: id });
};

function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  return {
    ...state,
    toast,
    dismiss: toast.dismiss,
  };
}

export type { ToastPosition, ToastVariant };
export { useToast, toast };
