import { contextBridge, ipcRenderer } from 'electron';
import { Environment, HostEntry } from '../shared/types';

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getEnvironments: () => ipcRenderer.invoke('get-environments'),
  getCurrentEnvironment: () => ipcRenderer.invoke('get-current-environment'),
  addEnvironment: (environment: Environment) => ipcRenderer.invoke('add-environment', environment),
  updateEnvironment: (name: string, environment: Environment) => ipcRenderer.invoke('update-environment', name, environment),
  deleteEnvironment: (name: string) => ipcRenderer.invoke('delete-environment', name),
  activateEnvironment: (name: string | null) => ipcRenderer.invoke('activate-environment', name),
  revertToDefault: () => ipcRenderer.invoke('revert-to-default'),
  getCurrentHostsFile: () => ipcRenderer.invoke('get-current-hosts-file'),
  saveHostsFile: (content: string) => ipcRenderer.invoke('save-hosts-file', content),
  getEnvironmentByName: (name: string) => ipcRenderer.invoke('get-environment-by-name', name),
  parseBulkEntries: (text: string) => ipcRenderer.invoke('parse-bulk-entries', text),
  getConfluenceUrl: () => ipcRenderer.invoke('get-confluence-url'),
  saveConfluenceUrl: (url: string) => ipcRenderer.invoke('save-confluence-url', url),
  updateOPTEEnvironments: (url: string) => ipcRenderer.invoke('update-opte-environments', url),
  openConfluenceBrowser: (url: string) => ipcRenderer.invoke('open-confluence-browser', url),
  extractConfluencePage: () => ipcRenderer.invoke('extract-confluence-page')
});

