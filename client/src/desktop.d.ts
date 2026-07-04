import type { AppInfo, UpdateCheckResult } from '@kubus/shared';

declare global {
  /** Bridge exposed by the Electron preload (absent in regular browsers). */
  interface Window {
    kubusDesktop?: {
      /** Electron's process.platform ('linux', 'win32', 'darwin', …). */
      platform: string;
      stateStorage: {
        getItem(name: string): string | null;
        setItem(name: string, value: string): void;
        removeItem(name: string): void;
      };
      setTitleBarOverlay(options: { color: string; symbolColor: string }): void;
      getAppInfo(): Promise<AppInfo | undefined>;
      checkForUpdate(options?: { force?: boolean }): Promise<UpdateCheckResult>;
    };
  }
}

export {};
