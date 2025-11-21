import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { HostsManager } from './hosts-manager';
import { Environment, HostEntry } from '../shared/types';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import { parse } from 'node-html-parser';
import * as fs from 'fs';
let mainWindow: BrowserWindow | null = null;
let confluenceWindow: BrowserWindow | null = null;
let hostsManager: HostsManager;

// Helper function to fetch URL using Node.js built-in modules
function fetchUrl(urlString: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const protocol = url.protocol === 'https:' ? https : http;
    
    const options: https.RequestOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      // Allow self-signed certificates (common in corporate environments)
      rejectUnauthorized: false
    };

    const req = protocol.request(options, (res) => {
      // Handle redirects (301, 302, 307, 308)
      if (res.statusCode && (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308)) {
        const location = res.headers.location;
        if (location) {
          // Resolve relative URLs
          let redirectUrl = location;
          if (!location.startsWith('http://') && !location.startsWith('https://')) {
            // Relative URL - construct absolute URL
            if (location.startsWith('/')) {
              redirectUrl = `${url.protocol}//${url.hostname}${location}`;
            } else {
              redirectUrl = `${url.protocol}//${url.hostname}${url.pathname.replace(/\/[^/]*$/, '/')}${location}`;
            }
          }
          req.destroy();
          // Recursively follow redirect (limit to 5 redirects to prevent infinite loops)
          return fetchUrl(redirectUrl).then(resolve).catch(reject);
        }
      }
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

function createWindow(): void {
  // Try multiple possible paths for the icon
  const fs = require('fs');
  let iconPath: string | undefined;
  
  // In production: dist/main/main/main.js -> dist/assets/icon.ico
  // In development: dist/main/main/main.js -> assets/icon.ico (but assets is at root)
  const possiblePaths = [
    join(__dirname, '../../assets/icon.ico'),  // Production path
    join(__dirname, '../../../assets/icon.ico'), // Alternative production path
    join(process.cwd(), 'assets/icon.ico'),     // Development path from project root
    join(process.cwd(), 'dist/assets/icon.ico') // If assets copied to dist
  ];
  
  for (const path of possiblePaths) {
    if (fs.existsSync(path)) {
      iconPath = path;
      break;
    }
  }
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js')
    },
    icon: iconPath
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Log errors to console
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('console-message', (event, level, message) => {
    console.log(`[Renderer ${level}]:`, message);
  });
}

app.whenReady().then(async () => {
  // Set app icon for Windows taskbar
  const fs = require('fs');
  const possibleIconPaths = [
    join(process.cwd(), 'assets/icon.ico'),
    join(process.cwd(), 'dist/assets/icon.ico'),
    join(__dirname, '../../assets/icon.ico'),
    join(__dirname, '../../../assets/icon.ico')
  ];
  
  for (const iconPath of possibleIconPaths) {
    if (fs.existsSync(iconPath)) {
      // Set the app icon - this affects the taskbar icon on Windows
      if (process.platform === 'win32') {
        app.setAppUserModelId('com.hosty.app');
      }
      break;
    }
  }
  
  hostsManager = new HostsManager();
  await hostsManager.initialize();
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('get-app-version', async () => {
  try {
    // Try multiple possible paths for package.json
    const possiblePaths = [
      join(__dirname, '../../package.json'), // Development
      join(process.resourcesPath, 'app.asar', 'package.json'), // Packaged (ASAR)
      join(process.resourcesPath, 'package.json'), // Packaged (no ASAR)
      join(app.getAppPath(), 'package.json') // Electron app path
    ];
    
    for (const packageJsonPath of possiblePaths) {
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        return packageJson.version || '1.0.0';
      }
    }
    
    // Fallback: try to read from app.getAppPath()
    const appPath = app.getAppPath();
    const packageJsonPath = join(appPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      return packageJson.version || '1.0.0';
    }
    
    return '1.0.0';
  } catch (error) {
    console.error('Error reading app version:', error);
    return '1.0.0';
  }
});

ipcMain.handle('get-environments', async () => {
  return hostsManager.getEnvironments();
});

ipcMain.handle('get-current-environment', async () => {
  return hostsManager.getCurrentEnvironment();
});

ipcMain.handle('add-environment', async (_, environment: Environment) => {
  try {
    await hostsManager.addEnvironment(environment);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-environment', async (_, name: string, environment: Environment) => {
  try {
    await hostsManager.updateEnvironment(name, environment);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-environment', async (_, name: string) => {
  try {
    await hostsManager.deleteEnvironment(name);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('activate-environment', async (_, name: string | null) => {
  try {
    await hostsManager.activateEnvironment(name);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('revert-to-default', async () => {
  try {
    await hostsManager.revertToDefault();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-current-hosts-file', async () => {
  try {
    return { success: true, content: await hostsManager.getCurrentHostsFile() };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-hosts-file', async (_, content: string) => {
  try {
    await hostsManager.saveHostsFileContent(content);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-environment-by-name', async (_, name: string) => {
  return hostsManager.getEnvironmentByName(name);
});

ipcMain.handle('parse-bulk-entries', async (_, text: string) => {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  const entries: HostEntry[] = [];
  
  for (const line of lines) {
    // Match IP, hostname, and optional comment
    // Format: IP hostname # comment or IP hostname
    const match = line.match(/^(\S+)\s+(\S+)(?:\s+#\s*(.+))?$/);
    if (match) {
      entries.push({
        ip: match[1],
        hostname: match[2],
        comment: match[3] || ''
      });
    }
  }
  
  return entries;
});

ipcMain.handle('get-confluence-url', async () => {
  try {
    return await hostsManager.getConfluenceUrl();
  } catch (error: any) {
    return null;
  }
});

ipcMain.handle('save-confluence-url', async (_, url: string) => {
  try {
    await hostsManager.saveConfluenceUrl(url);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fetch-confluence-page', async (_, url: string) => {
  try {
    // Fetch the Confluence page using Node.js built-in modules
    const html = await fetchUrl(url);

    const root = parse(html);
    const environments: Array<{name: string, entries: HostEntry[]}> = [];

    // Try multiple parsing strategies for Confluence pages
    // Strategy 1: Look for tables with environment data
    const tables = root.querySelectorAll('table');
    tables.forEach((table) => {
      const rows = table.querySelectorAll('tr');
      
      rows.forEach((row, rowIdx) => {
        if (rowIdx === 0) return; // Skip header row
        
        const cells = row.querySelectorAll('td, th');
        if (cells.length < 2) return;
        
        // Get environment name from first cell
        const envNameCellText = getCellTextWithLineBreaks(cells[0]).trim();
        const envName = envNameCellText || '';
        const entries: HostEntry[] = [];
        
        // Look for IP addresses in remaining columns
        // The IP address column may contain multi-line entries where each line is: IP hostname #comment
        for (let i = 1; i < cells.length; i++) {
          const cell = cells[i];
          // Get raw cell text with line breaks preserved
          const cellTextRaw = getCellTextWithLineBreaks(cell);
          
          // Split by newlines to handle multi-line cells, then trim each line
          const lines = cellTextRaw.split(/\r?\n/).map(line => line.trim()).filter(line => line);
          
          for (const line of lines) {
            // Skip comment-only lines (like "# Deployment Name: 2022 SP1 HF12")
            if (line.startsWith('#') && !line.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/)) {
              continue;
            }
            
            // Parse line format: IP hostname #comment
            const lineMatch = line.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+([a-zA-Z0-9][a-zA-Z0-9\-]*(?:\.[a-zA-Z0-9\-]+)*\.[a-zA-Z]{2,})\s*(?:#\s*(.+))?$/);
            
            if (lineMatch) {
              const ip = lineMatch[1];
              const hostname = lineMatch[2];
              const comment = lineMatch[3] ? lineMatch[3].trim() : `From ${envName}`;
              
              entries.push({
                ip: ip,
                hostname: hostname,
                comment: comment
              });
            } else {
              // Fallback: extract IP, hostname, and comment separately
              const ipMatch = line.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+/);
              if (ipMatch) {
                const ip = ipMatch[1];
                
                let hostname = '';
                let comment = `From ${envName}`;
                
                const afterIP = line.substring(ipMatch[0].length).trim();
                const commentIndex = afterIP.indexOf('#');
                
                if (commentIndex >= 0) {
                  hostname = afterIP.substring(0, commentIndex).trim();
                  comment = afterIP.substring(commentIndex + 1).trim();
                } else {
                  hostname = afterIP;
                }
                
                if (!hostname || hostname.length === 0) {
                  hostname = `server-${entries.length + 1}`;
                }
                
                entries.push({
                  ip: ip,
                  hostname: hostname,
                  comment: comment
                });
              }
            }
          }
        }
        
        if (envName && entries.length > 0) {
          environments.push({ name: envName, entries });
        }
      });
    });

    // Strategy 2: Look for structured lists or divs with environment info
    if (environments.length === 0) {
      const elements = root.querySelectorAll('div[data-macro-name], .confluence-information-macro, .panel');
      elements.forEach((element) => {
        const text = element.text;
        // Look for patterns like "Deployment: Name" or "Environment: Name"
        const nameMatch = text.match(/(?:Deployment|Environment|Name)[:\s]+([^\n\r]+)/i);
        if (nameMatch) {
          const envName = nameMatch[1].trim();
          const ipMatches = text.match(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g);
          if (ipMatches && ipMatches.length > 0) {
            const entries: HostEntry[] = ipMatches.map((ip: string, idx: number) => ({
              ip: ip,
              hostname: `server-${idx + 1}`,
              comment: `From ${envName}`
            }));
            environments.push({ name: envName, entries });
          }
        }
      });
    }

    // Strategy 3: Look for any text patterns that might indicate environment info
    if (environments.length === 0) {
      const bodyText = root.text;
      // Look for patterns like "Environment Name" followed by IPs
      const sections = bodyText.split(/\n\s*\n/);
      for (const section of sections) {
        const lines = section.split('\n').map((l: string) => l.trim()).filter((l: string) => l);
        if (lines.length >= 2) {
          const firstLine = lines[0];
          const ipMatches = section.match(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g);
          if (ipMatches && ipMatches.length > 0) {
            const envName = firstLine.substring(0, 50).trim(); // Use first line as name
            const entries: HostEntry[] = ipMatches.map((ip: string, idx: number) => ({
              ip: ip,
              hostname: `server-${idx + 1}`,
              comment: `From ${envName}`
            }));
            environments.push({ name: envName, entries });
          }
        }
      }
    }

    return { success: true, environments };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-confluence-browser', async (_, url: string) => {
  try {
    // Close existing window if open
    if (confluenceWindow) {
      confluenceWindow.close();
    }

    // Create a new browser window for Confluence
    confluenceWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      },
      title: 'Confluence - Please log in and navigate to the page'
    });

    confluenceWindow.loadURL(url);

    confluenceWindow.on('closed', () => {
      confluenceWindow = null;
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('extract-confluence-page', async () => {
  try {
    if (!confluenceWindow || confluenceWindow.isDestroyed()) {
      return { success: false, error: 'Confluence browser window is not open' };
    }

    // Get the HTML content from the browser window
    const html = await confluenceWindow.webContents.executeJavaScript(`
      document.documentElement.outerHTML
    `);

    const root = parse(html);
    const environments = await parseEnvironmentsFromHTML(root);
    
    return { success: true, environments };
  } catch (error: any) {
    console.error('Error extracting Confluence page:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-opte-environments', async (_, url: string) => {
  try {
    let html: string;
    let environments: Array<{name: string, entries: HostEntry[]}> = [];
    
    // Try to extract from browser window first
    if (confluenceWindow && !confluenceWindow.isDestroyed()) {
      try {
        html = await confluenceWindow.webContents.executeJavaScript(`
          document.documentElement.outerHTML
        `);
        const root = parse(html);
        environments = await parseEnvironmentsFromHTML(root);
        console.log(`Extracted ${environments.length} environments from browser window`);
      } catch (err: any) {
        console.log('Could not extract from browser window:', err.message);
        console.log('Falling back to HTTP fetch');
      }
    }
    
    // If browser extraction failed or not available, use HTTP fetch
    if (environments.length === 0 && url) {
      html = await fetchUrl(url);
      const root = parse(html);
      environments = await parseEnvironmentsFromHTML(root);
      console.log(`Extracted ${environments.length} environments from HTTP fetch`);
    }
    
    // Deduplicate environments by name (keep the one with most entries)
    const envMap = new Map<string, {name: string, entries: HostEntry[]}>();
    environments.forEach(env => {
      const existing = envMap.get(env.name);
      if (!existing || env.entries.length > existing.entries.length) {
        envMap.set(env.name, env);
      }
    });
    const uniqueEnvironments = Array.from(envMap.values());
    
    console.log(`Total environments found: ${uniqueEnvironments.length} (after deduplication)`);
    
    // Update the environments
    const result = await hostsManager.updateOPTEEnvironments(url || '', uniqueEnvironments);
    return { success: true, ...result };
  } catch (error: any) {
    console.error('Error updating OPTE environments:', error);
    return { success: false, error: error.message };
  }
});

// Helper function to extract text from cell, preserving line breaks from <br> tags and newlines
function getCellTextWithLineBreaks(cell: any): string {
  // Get innerHTML to preserve <br> tags
  const innerHTML = cell.innerHTML || '';
  // Replace <br> and <br/> tags with newlines
  let text = innerHTML.replace(/<br\s*\/?>/gi, '\n');
  // Remove other HTML tags but preserve their text content
  text = text.replace(/<[^>]+>/g, '');
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  return text;
}

// Helper function to parse environments from HTML
async function parseEnvironmentsFromHTML(root: any): Promise<Array<{name: string, entries: HostEntry[]}>> {
  const environments: Array<{name: string, entries: HostEntry[]}> = [];

  // Try multiple parsing strategies for Confluence pages
  // Strategy 1: Look for tables with environment data
  const tables = root.querySelectorAll('table');
  console.log(`Found ${tables.length} tables`);
  
  tables.forEach((table: any) => {
    const rows = table.querySelectorAll('tr');
    console.log(`Table has ${rows.length} rows`);
    
    rows.forEach((row: any, rowIdx: number) => {
      if (rowIdx === 0) return; // Skip header row
      
      const cells = row.querySelectorAll('td, th');
      if (cells.length < 2) return;
      
      // Use getCellTextWithLineBreaks to preserve line breaks
      const cellTexts = cells.map((cell: any) => getCellTextWithLineBreaks(cell).trim());
      
      // Environment name is in the second column (index 1), first column (index 0) is just a number
      const envName = cellTexts[1] || cellTexts[0] || '';
      
      // Skip if envName is just a number (likely row number)
      if (envName && /^\d+$/.test(envName.trim())) {
        // If first column is a number, try second column
        if (cellTexts.length > 2) {
          const secondCol = cellTexts[2] || '';
          if (secondCol && !/^\d+$/.test(secondCol.trim())) {
            // Use second column if it's not a number
            const envNameFromSecond = cellTexts[1] || '';
            if (envNameFromSecond && !/^\d+$/.test(envNameFromSecond.trim())) {
              // Use the one that's not a number
            }
          }
        }
        // If we only have a number, skip this row
        if (cellTexts.length < 3) return;
      }
      
      // Try to find the actual environment name (not a number)
      let actualEnvName = '';
      for (let i = 0; i < cellTexts.length; i++) {
        const text = cellTexts[i];
        // Skip if it's just a number or empty
        if (!text || /^\d+$/.test(text.trim())) continue;
        // Skip if it looks like an IP address
        if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(text)) continue;
        // Use the first non-numeric, non-IP text as the environment name
        actualEnvName = text;
        break;
      }
      
      // If we didn't find a name, skip this row
      if (!actualEnvName || actualEnvName.trim() === '') return;
      
      const entries: HostEntry[] = [];
      
      // Look for IP addresses in ALL columns (skip the first column which is usually a number)
      // The IP address column may contain multi-line entries where each line is: IP hostname #comment
      for (let i = 1; i < cells.length; i++) {
        const cell = cells[i];
        // Get raw cell text with line breaks preserved (don't trim yet)
        const cellTextRaw = getCellTextWithLineBreaks(cell);
        
        // Split by newlines to handle multi-line cells, then trim each line
        const lines = cellTextRaw.split(/\r?\n/).map(line => line.trim()).filter(line => line);
        
        for (const line of lines) {
          // Skip comment-only lines (like "# Deployment Name: 2022 SP1 HF12")
          if (line.startsWith('#') && !line.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/)) {
            continue;
          }
          
          // Parse line format: IP hostname #comment
          // More flexible pattern: IP, hostname (with multiple domain parts), optional comment
          // Comment can have spaces, dashes, etc.
          const lineMatch = line.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+([a-zA-Z0-9][a-zA-Z0-9\-]*(?:\.[a-zA-Z0-9\-]+)*\.[a-zA-Z]{2,})\s*(?:#\s*(.+))?$/);
          
          if (lineMatch) {
            const ip = lineMatch[1];
            const hostname = lineMatch[2];
            // Comment is everything after #, trimmed
            const comment = lineMatch[3] ? lineMatch[3].trim() : `From ${actualEnvName}`;
            
            // Skip IPs that are part of the environment name
            if (actualEnvName.includes(ip)) continue;
            
            entries.push({
              ip: ip,
              hostname: hostname,
              comment: comment
            });
          } else {
            // Fallback: try to extract IP, hostname, and comment separately if the line doesn't match the exact format
            const ipMatch = line.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+/);
            if (ipMatch) {
              const ip = ipMatch[1];
              if (actualEnvName.includes(ip)) continue;
              
              // Extract hostname (everything after IP until # or end of line)
              let hostname = '';
              let comment = `From ${actualEnvName}`;
              
              const afterIP = line.substring(ipMatch[0].length).trim();
              const commentIndex = afterIP.indexOf('#');
              
              if (commentIndex >= 0) {
                // Hostname is everything before #
                hostname = afterIP.substring(0, commentIndex).trim();
                // Comment is everything after #
                comment = afterIP.substring(commentIndex + 1).trim();
              } else {
                // No comment, everything after IP is hostname
                hostname = afterIP;
              }
              
              // If no hostname found, generate one
              if (!hostname || hostname.length === 0) {
                hostname = `${actualEnvName.toLowerCase().replace(/\s+/g, '-')}-${entries.length + 1}`;
              }
              
              entries.push({
                ip: ip,
                hostname: hostname,
                comment: comment
              });
            }
          }
        }
      }
      
      if (actualEnvName && entries.length > 0) {
        // Skip environments with more than 10 entries
        if (entries.length > 10) {
          console.log(`Skipping environment "${actualEnvName}" - has ${entries.length} entries (max 10 allowed)`);
          return;
        }
        console.log(`Found environment: ${actualEnvName} with ${entries.length} entries`);
        environments.push({ name: actualEnvName, entries });
      }
    });
  });

  // Strategy 2: Look for Confluence macro tables or data tables (run even if Strategy 1 found some)
  // Try alternative table parsing
  {
    // Look for any table-like structures
    const allTables = root.querySelectorAll('table, .confluenceTable, [data-macro-name="table"]');
    allTables.forEach((table: any) => {
      const rows = table.querySelectorAll('tr');
      rows.forEach((row: any, rowIdx: number) => {
        if (rowIdx === 0) return;
        
        const cells = row.querySelectorAll('td, th');
        // Use getCellTextWithLineBreaks to preserve line breaks
        const cellTexts = cells.map((cell: any) => getCellTextWithLineBreaks(cell).trim());
        
        if (cellTexts.length >= 2) {
          // Find the actual environment name (not a number, not an IP)
          let actualEnvName = '';
          for (let i = 0; i < cellTexts.length; i++) {
            const text = cellTexts[i];
            // Skip if it's just a number or empty
            if (!text || /^\d+$/.test(text.trim())) continue;
            // Skip if it looks like an IP address
            if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(text)) continue;
            // Use the first non-numeric, non-IP text as the environment name
            actualEnvName = text;
            break;
          }
          
          // If we didn't find a name, skip this row
          if (!actualEnvName || actualEnvName.trim() === '') return;
          
          const entries: HostEntry[] = [];
          
          // Collect all IPs from all cells (skip the first column which is usually a number)
          // The IP address column may contain multi-line entries where each line is: IP hostname #comment
          for (let i = 1; i < cells.length; i++) {
            const cell = cells[i];
            // Get raw cell text with line breaks preserved
            const cellTextRaw = getCellTextWithLineBreaks(cell);
            
            // Split by newlines to handle multi-line cells, then trim each line
            const lines = cellTextRaw.split(/\r?\n/).map(line => line.trim()).filter(line => line);
            
            for (const line of lines) {
              // Skip comment-only lines (like "# Deployment Name: 2022 SP1 HF12")
              if (line.startsWith('#') && !line.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/)) {
                continue;
              }
              
              // Parse line format: IP hostname #comment
              const lineMatch = line.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+([a-zA-Z0-9][a-zA-Z0-9\-]*(?:\.[a-zA-Z0-9\-]+)*\.[a-zA-Z]{2,})\s*(?:#\s*(.+))?$/);
              
              if (lineMatch) {
                const ip = lineMatch[1];
                if (actualEnvName.includes(ip)) continue;
                
                const hostname = lineMatch[2];
                const comment = lineMatch[3] ? lineMatch[3].trim() : `From ${actualEnvName}`;
                
                entries.push({
                  ip: ip,
                  hostname: hostname,
                  comment: comment
                });
              } else {
                // Fallback: extract IP, hostname, and comment separately
                const ipMatch = line.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+/);
                if (ipMatch) {
                  const ip = ipMatch[1];
                  if (actualEnvName.includes(ip)) continue;
                  
                  let hostname = '';
                  let comment = `From ${actualEnvName}`;
                  
                  const afterIP = line.substring(ipMatch[0].length).trim();
                  const commentIndex = afterIP.indexOf('#');
                  
                  if (commentIndex >= 0) {
                    hostname = afterIP.substring(0, commentIndex).trim();
                    comment = afterIP.substring(commentIndex + 1).trim();
                  } else {
                    hostname = afterIP;
                  }
                  
                  if (!hostname || hostname.length === 0) {
                    hostname = `${actualEnvName.toLowerCase().replace(/\s+/g, '-')}-${entries.length + 1}`;
                  }
                  
                  entries.push({
                    ip: ip,
                    hostname: hostname,
                    comment: comment
                  });
                }
              }
            }
          }
          
          if (actualEnvName && entries.length > 0) {
            // Skip environments with more than 10 entries
            if (entries.length > 10) {
              console.log(`Skipping environment "${actualEnvName}" - has ${entries.length} entries (max 10 allowed)`);
              return;
            }
            environments.push({ name: actualEnvName, entries });
          }
        }
      });
    });
  }

  // Strategy 3: Look for structured content with environment names and IPs (run even if previous strategies found some)
  {
    // Look for headings followed by IP addresses
    const headings = root.querySelectorAll('h1, h2, h3, h4, h5, h6, strong, .title');
    headings.forEach((heading: any) => {
      const headingText = heading.text.trim();
      if (headingText && headingText.length < 100) {
        // Look for IPs in the heading text
        const text = heading.text;
        const ipMatches = text.match(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g);
        if (ipMatches && ipMatches.length > 0) {
          const entries: HostEntry[] = [];
          for (const ip of ipMatches) {
            const hostnameMatch = text.match(/([a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,})/);
            const hostname = hostnameMatch ? hostnameMatch[1] : `${headingText.toLowerCase().replace(/\s+/g, '-')}-${entries.length + 1}`;
            entries.push({
              ip: ip,
              hostname: hostname,
              comment: `From ${headingText}`
            });
          }
          if (entries.length > 0) {
            // Skip environments with more than 10 entries
            if (entries.length > 10) {
              console.log(`Skipping environment "${headingText}" - has ${entries.length} entries (max 10 allowed)`);
              return;
            }
            environments.push({ name: headingText, entries });
          }
        }
      }
    });
  }

  // Strategy 4: Look for any text patterns that might indicate environment info (run even if previous strategies found some)
  {
    const bodyText = root.text;
    // Look for patterns like "Environment Name" followed by IPs
    const sections = bodyText.split(/\n\s*\n/);
    for (const section of sections) {
      const lines = section.split('\n').map((l: string) => l.trim()).filter((l: string) => l);
      if (lines.length >= 2) {
        const firstLine = lines[0];
        const ipMatches = section.match(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g);
        if (ipMatches && ipMatches.length > 0) {
          const envName = firstLine.substring(0, 50).trim(); // Use first line as name
          const entries: HostEntry[] = ipMatches.map((ip: string, idx: number) => ({
            ip: ip,
            hostname: `server-${idx + 1}`,
            comment: `From ${envName}`
          }));
          // Skip environments with more than 10 entries
          if (entries.length > 10) {
            console.log(`Skipping environment "${envName}" - has ${entries.length} entries (max 10 allowed)`);
            continue;
          }
          environments.push({ name: envName, entries });
        }
      }
    }
  }

  // Deduplicate environments by name (keep the one with most entries)
  const envMap = new Map<string, {name: string, entries: HostEntry[]}>();
  environments.forEach(env => {
    const existing = envMap.get(env.name);
    if (!existing || env.entries.length > existing.entries.length) {
      envMap.set(env.name, env);
    }
  });
  const uniqueEnvironments = Array.from(envMap.values());
  
  console.log(`Total environments found: ${uniqueEnvironments.length} (after deduplication)`);
  
  return uniqueEnvironments;
}
