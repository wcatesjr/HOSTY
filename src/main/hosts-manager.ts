import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { app } from 'electron';
import { Environment, HostEntry, REQUIRED_LINES, DEFAULT_HOSTS_CONTENT } from '../shared/types';

const HOSTS_FILE_PATH = 'C:\\Windows\\System32\\drivers\\etc\\HOSTS';
const DATA_DIR = join(app.getPath('userData'), 'data');
const ENVIRONMENTS_FILE = join(DATA_DIR, 'environments.json');
const CONFLUENCE_URL_FILE = join(DATA_DIR, 'confluence-url.txt');
const DEFAULT_HOSTS_FILE = join(DATA_DIR, 'default-hosts.txt');

export class HostsManager {
  private environments: Environment[] = [];
  private currentEnvironment: string | null = null;

  async initialize(): Promise<void> {
    // Ensure data directory exists
    try {
      await mkdir(DATA_DIR, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Check if this is first startup (no environments.json or it's empty)
    const isFirstStartup = await this.isFirstStartup();
    
    if (isFirstStartup) {
      // On first startup, save the current HOSTS file as the DEFAULT
      await this.saveCurrentHostsAsDefault();
    }

    // Load environments from file
    await this.loadEnvironments();
    
    // Detect current environment from HOSTS file
    await this.detectCurrentEnvironment();
  }

  private async isFirstStartup(): Promise<boolean> {
    try {
      // Check if environments.json exists and has content
      const data = await readFile(ENVIRONMENTS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      // If file exists but is empty array, still consider it first startup for DEFAULT setup
      return parsed.length === 0;
    } catch (error) {
      // File doesn't exist, this is first startup
      return true;
    }
  }

  private async saveCurrentHostsAsDefault(): Promise<void> {
    try {
      // Read the current HOSTS file
      const currentHostsContent = await readFile(HOSTS_FILE_PATH, 'utf-8');
      // Save it as the default HOSTS content
      await writeFile(DEFAULT_HOSTS_FILE, currentHostsContent, 'utf-8');
      console.log('Saved current HOSTS file as DEFAULT on first startup');
    } catch (error) {
      // If we can't read the HOSTS file, use the built-in default
      console.warn('Could not read current HOSTS file, using built-in default:', error);
      await writeFile(DEFAULT_HOSTS_FILE, DEFAULT_HOSTS_CONTENT, 'utf-8');
    }
  }

  private async getDefaultHostsContent(): Promise<string> {
    try {
      // Try to read the saved default HOSTS file
      return await readFile(DEFAULT_HOSTS_FILE, 'utf-8');
    } catch (error) {
      // If file doesn't exist, use the built-in default
      return DEFAULT_HOSTS_CONTENT;
    }
  }

  private async detectCurrentEnvironment(): Promise<void> {
    try {
      const hostsContent = await readFile(HOSTS_FILE_PATH, 'utf-8');
      const lines = hostsContent.split('\n');
      
      // Check first few lines for environment header
      for (let i = 0; i < Math.min(10, lines.length); i++) {
        const line = lines[i].trim();
        
        // Check for environment header pattern: # EnvironmentName
        // Skip copyright and other standard headers
        if (line.startsWith('#') && 
            !line.startsWith('# Copyright') && 
            !line.startsWith('# Environment activated') &&
            !line.startsWith('# This is a sample') &&
            !line.startsWith('# localhost') &&
            line !== '#') {
          // Extract environment name (skip the #)
          const envName = line.substring(1).trim();
          
          // Check for "Custom" header
          if (envName === 'Custom') {
            this.currentEnvironment = 'Custom';
            return;
          }
          
          // Check if this environment exists in our list
          if (envName && envName !== '') {
            const envExists = this.environments.some(env => env.name === envName);
            if (envExists) {
              this.currentEnvironment = envName;
              return;
            }
          }
        }
      }
      
      // Check if it's the default HOSTS file content
      // Compare normalized content (remove whitespace differences)
      const normalizedContent = hostsContent.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      
      // Get the saved default content (or built-in default)
      const defaultContent = await this.getDefaultHostsContent();
      const normalizedDefault = defaultContent.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      
      if (normalizedContent === normalizedDefault) {
        this.currentEnvironment = 'DEFAULT';
        return;
      }
      
      // Check if it has copyright but no environment header (might be default)
      if (hostsContent.includes('Copyright (c) 1993-2009 Microsoft Corp')) {
        // Check if it only has localhost entries and Dassault lines
        const nonCommentLines = hostsContent
          .split('\n')
          .map(l => l.trim())
          .filter(l => l && !l.startsWith('#'));
        
        const hasNonDefaultEntries = nonCommentLines.some(line => {
          return !line.includes('localhost') && !line.includes('dslauncher.3ds.com');
        });
        
        if (!hasNonDefaultEntries) {
          this.currentEnvironment = 'DEFAULT';
          return;
        }
      }
      
      // If we can't determine, set to UNKNOWN
      this.currentEnvironment = 'UNKNOWN';
    } catch (error) {
      // If we can't read the file, set to UNKNOWN
      this.currentEnvironment = 'UNKNOWN';
    }
  }

  async loadEnvironments(): Promise<void> {
    try {
      const data = await readFile(ENVIRONMENTS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      // Migrate existing environments to have "Other" category if missing
      const migrated = parsed.map((env: any) => ({
        ...env,
        category: env.category || 'Other'
      }));
      this.environments = migrated;
      // Only save if migration occurred (had environments without category)
      const needsMigration = parsed.some((env: any) => !env.category);
      if (needsMigration) {
        await this.saveEnvironments();
      }
    } catch (error) {
      // File doesn't exist, start with empty array
      this.environments = [];
    }
  }

  async saveEnvironments(): Promise<void> {
    await writeFile(ENVIRONMENTS_FILE, JSON.stringify(this.environments, null, 2), 'utf-8');
  }

  getEnvironments(): Environment[] {
    return this.environments;
  }

  getCurrentEnvironment(): string | null {
    return this.currentEnvironment;
  }

  async addEnvironment(environment: Environment): Promise<void> {
    // Check if name already exists
    if (this.environments.some(env => env.name === environment.name)) {
      throw new Error(`Environment "${environment.name}" already exists`);
    }
    this.environments.push(environment);
    await this.saveEnvironments();
  }

  async updateEnvironment(name: string, environment: Environment): Promise<void> {
    const index = this.environments.findIndex(env => env.name === name);
    if (index === -1) {
      throw new Error(`Environment "${name}" not found`);
    }
    
    // If name changed, check for conflicts
    if (name !== environment.name && this.environments.some(env => env.name === environment.name)) {
      throw new Error(`Environment "${environment.name}" already exists`);
    }
    
    this.environments[index] = environment;
    await this.saveEnvironments();
    
    // Update current environment name if it was renamed
    if (this.currentEnvironment === name && name !== environment.name) {
      this.currentEnvironment = environment.name;
    }
  }

  async deleteEnvironment(name: string): Promise<void> {
    const index = this.environments.findIndex(env => env.name === name);
    if (index === -1) {
      throw new Error(`Environment "${name}" not found`);
    }
    this.environments.splice(index, 1);
    await this.saveEnvironments();
    
    // If deleted environment was current, reset to null
    if (this.currentEnvironment === name) {
      this.currentEnvironment = null;
    }
  }

  async activateEnvironment(name: string | null): Promise<void> {
    let entries: HostEntry[] = [];
    
    if (name === null || name === 'DEFAULT') {
      // Use default entries
      entries = [
        { ip: '127.0.0.1', hostname: 'localhost', comment: '' },
        { ip: '::1', hostname: 'localhost', comment: '' }
      ];
      this.currentEnvironment = 'DEFAULT';
      await this.writeHostsFile(entries, 'DEFAULT');
    } else {
      const environment = this.environments.find(env => env.name === name);
      if (!environment) {
        throw new Error(`Environment "${name}" not found`);
      }
      entries = environment.entries;
      this.currentEnvironment = name;
      await this.writeHostsFile(entries, name);
    }
  }

  private async formatHostsContent(entries: HostEntry[], environmentName: string | null): Promise<string> {
    let content = '';
    
    // Add default header if using DEFAULT
    if (environmentName === 'DEFAULT' || !environmentName) {
      // Use the saved DEFAULT content (from first startup) or built-in default
      return await this.getDefaultHostsContent();
    }
    
    // Add environment name comment header
    content += `# ${environmentName}\n`;
    content += `# Environment activated by HOSTY\n`;
    content += `#\n\n`;
    
    // For custom environments, add entries
    entries.forEach(entry => {
      const line = `${entry.ip.padEnd(20)} ${entry.hostname}${entry.comment ? ' # ' + entry.comment : ''}`;
      content += line + '\n';
    });
    
    // Always append required Dassault Systemes lines
    content += '\n';
    REQUIRED_LINES.forEach(line => {
      content += line + '\n';
    });
    
    return content;
  }

  private async writeHostsFile(entries: HostEntry[], environmentName: string | null = null): Promise<void> {
    const name = environmentName || this.currentEnvironment;
    const content = await this.formatHostsContent(entries, name);
    await writeFile(HOSTS_FILE_PATH, content, 'utf-8');
  }

  async getCurrentHostsFile(): Promise<string> {
    try {
      return await readFile(HOSTS_FILE_PATH, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read HOSTS file: ${error}`);
    }
  }

  async saveHostsFileContent(content: string): Promise<void> {
    try {
      await writeFile(HOSTS_FILE_PATH, content, 'utf-8');
      // Re-detect the environment after saving
      await this.detectCurrentEnvironment();
    } catch (error) {
      throw new Error(`Failed to save HOSTS file: ${error}`);
    }
  }

  async revertToDefault(): Promise<void> {
    await this.activateEnvironment(null);
  }

  getCurrentEnvironmentName(): string | null {
    return this.currentEnvironment;
  }

  getEnvironmentByName(name: string): Environment | undefined {
    return this.environments.find(env => env.name === name);
  }

  async getConfluenceUrl(): Promise<string | null> {
    try {
      const url = await readFile(CONFLUENCE_URL_FILE, 'utf-8');
      return url.trim() || null;
    } catch (error) {
      return null;
    }
  }

  async saveConfluenceUrl(url: string): Promise<void> {
    await writeFile(CONFLUENCE_URL_FILE, url, 'utf-8');
  }

  async updateOPTEEnvironments(confluenceUrl: string, fetchedData: Array<{name: string, entries: HostEntry[]}>): Promise<{added: number, updated: number, markedOld: number}> {
    let added = 0;
    let updated = 0;
    let markedOld = 0;

    // Get list of environment names from Confluence
    const confluenceNames = new Set(fetchedData.map(e => e.name));

    // Mark existing OPTE environments as old if they're not in Confluence
    for (const env of this.environments) {
      if (env.category === 'On-Prem Test Environment') {
        if (!confluenceNames.has(env.name)) {
          if (!env.isOld) {
            env.isOld = true;
            markedOld++;
          }
        } else {
          // If it was old but now exists again, unmark it
          if (env.isOld) {
            env.isOld = false;
          }
        }
      }
    }

    // Add or update environments from Confluence
    for (const fetchedEnv of fetchedData) {
      const existingIndex = this.environments.findIndex(e => e.name === fetchedEnv.name && e.category === 'On-Prem Test Environment');
      
      if (existingIndex === -1) {
        // Add new environment
        this.environments.push({
          name: fetchedEnv.name,
          category: 'On-Prem Test Environment',
          entries: fetchedEnv.entries,
          isOld: false
        });
        added++;
      } else {
        // Update existing environment
        const existing = this.environments[existingIndex];
        existing.entries = fetchedEnv.entries;
        existing.isOld = false; // Unmark as old if it exists
        updated++;
      }
    }

    await this.saveEnvironments();
    return { added, updated, markedOld };
  }
}

