import { Environment, HostEntry } from '../shared/types';

export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  getEnvironments: () => Promise<Environment[]>;
  getCurrentEnvironment: () => Promise<string | null>;
  addEnvironment: (environment: Environment) => Promise<{ success: boolean; error?: string }>;
  updateEnvironment: (name: string, environment: Environment) => Promise<{ success: boolean; error?: string }>;
  deleteEnvironment: (name: string) => Promise<{ success: boolean; error?: string }>;
  activateEnvironment: (name: string | null) => Promise<{ success: boolean; error?: string }>;
  revertToDefault: () => Promise<{ success: boolean; error?: string }>;
  getCurrentHostsFile: () => Promise<{ success: boolean; content?: string; error?: string }>;
  saveHostsFile: (content: string) => Promise<{ success: boolean; error?: string }>;
  getEnvironmentByName: (name: string) => Promise<Environment | undefined>;
  parseBulkEntries: (text: string) => Promise<HostEntry[]>;
  getConfluenceUrl: () => Promise<string | null>;
  saveConfluenceUrl: (url: string) => Promise<{ success: boolean; error?: string }>;
  updateOPTEEnvironments: (url: string) => Promise<{ success: boolean; added?: number; updated?: number; markedOld?: number; error?: string }>;
  openConfluenceBrowser: (url: string) => Promise<{ success: boolean; error?: string }>;
  extractConfluencePage: () => Promise<{ success: boolean; environments?: Array<{name: string, entries: HostEntry[]}>; error?: string }>;
}

declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.jpeg' {
  const value: string;
  export default value;
}

declare module '*.gif' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  const value: string;
  export default value;
}

declare module '*.ico' {
  const value: string;
  export default value;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

