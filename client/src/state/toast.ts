import { create } from 'zustand';

export type ToastSeverity = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  /** Distinguishes consecutive toasts so the snackbar's auto-hide timer restarts. */
  id: number;
  severity: ToastSeverity;
  message: string;
}

interface ToastState {
  toast: Toast | null;
  show: (severity: ToastSeverity, message: string) => void;
  dismiss: () => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>()((set) => ({
  toast: null,
  show: (severity, message) => set({ toast: { id: nextId++, severity, message } }),
  dismiss: () => set({ toast: null }),
}));

/** Show a transient notification from anywhere (components, mutation callbacks). */
export function showToast(severity: ToastSeverity, message: string): void {
  useToastStore.getState().show(severity, message);
}
