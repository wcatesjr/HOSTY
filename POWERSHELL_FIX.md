# Fixing PowerShell Execution Policy Issue

## The Problem
PowerShell blocks npm scripts because they're not digitally signed. This is a Windows security feature.

## Solutions

### Option 1: Use CMD Instead (Easiest)
Instead of running `npm run build` in PowerShell, use Command Prompt:

```cmd
cmd /c "cd /d E:\HOSTY && npm run build"
```

Or just open Command Prompt (cmd.exe) and run:
```cmd
cd E:\HOSTY
npm run build
```

### Option 2: Use Helper Scripts (Recommended)
I've created helper scripts you can double-click:

- **`build.cmd`** - Double-click to build the app
- **`package.cmd`** - Double-click to package the app

Just double-click these files in Windows Explorer!

### Option 3: Change PowerShell Execution Policy (Requires Admin)

**Warning:** This changes system security settings. Only do this if you understand the implications.

1. Open PowerShell **as Administrator**
2. Run:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
3. Type `Y` to confirm

This allows locally created scripts to run.

### Option 4: Bypass for Single Command
Run this in PowerShell:
```powershell
powershell -ExecutionPolicy Bypass -Command "npm run build"
```

## Recommended Approach

**For daily use:** Use the `.cmd` helper scripts (Option 2) - just double-click them!

**For quick commands:** Use `cmd /c` prefix (Option 1)

**For permanent fix:** Change execution policy (Option 3) - but be careful!



