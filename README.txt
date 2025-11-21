HOSTY - HOSTS File Manager
Installation and Usage Instructions

================================================================================
INSTALLATION
================================================================================

1. Extract the ZIP file to a folder of your choice (e.g., C:\Program Files\HOSTY
   or any location you prefer)

2. Navigate to the extracted folder and locate the file named:
   "HOSTY.exe" (or "HOSTY Application.exe")

3. IMPORTANT: Right-click on "HOSTY.exe" and select "Run as administrator"
   This is required because HOSTY needs administrator privileges to modify
   your Windows HOSTS file.

4. If prompted by Windows Security, click "Yes" to allow the application to run


================================================================================
FIRST TIME SETUP
================================================================================

On first launch, HOSTY will:
- Create a data folder in your AppData directory
- Display the main interface with an empty environment list
- Show "UNKNOWN" as the current profile until you activate an environment


================================================================================
BASIC USAGE
================================================================================

CREATING AN ENVIRONMENT:
1. Click the "+ Add New" button in the left sidebar
2. Enter a name for your environment (e.g., "Development", "Test Server")
3. Select a category: "On-Prem Test Environment", "Personal", or "Other"
4. Click "Save Environment"

ADDING HOST ENTRIES:
1. Select an environment from the sidebar
2. Click "Add Entry" to add individual IP/hostname pairs
   OR
3. Click "Bulk Import" to paste multiple entries at once
   Format: IP address, hostname, optional comment (one per line)
   Example:
   192.168.1.100    server1.example.com    # Server 1
   192.168.1.101    server2.example.com    # Server 2

ACTIVATING AN ENVIRONMENT:
- Click on any environment name in the sidebar to activate it
- This will replace your current HOSTS file with that environment's entries
- The "Current Profile" bar at the top will show the active environment name

VIEWING CURRENT HOSTS FILE:
- Click "View Current HOST" to see and edit your current HOSTS file content
- Make changes and click "Save Changes" to update the file
- Note: Changes will change your profile to "Custom"

CUSTOM HOSTS FILE:
- Click the "Custom" button to create a custom HOSTS file without saving it
  as a named environment
- Paste your custom entries and click "Save"

RESTORING DEFAULT:
- Click "Restore Default HOSTS" to revert to the default Windows HOSTS file


================================================================================
ADVANCED FEATURES
================================================================================

ON-PREM TEST ENVIRONMENTS (OPTE):
- Click "OPTE Update" button to sync environments from Confluence
- You'll need to authenticate with Confluence in the browser window that opens
- After logging in, click "Extract Environments" to update your environments
- Environments no longer on Confluence will be marked as "OLD" (in red) but
  not deleted

FILTERING ENVIRONMENTS:
- Use the dropdown menu below "Add New" and "Custom" buttons to filter by:
  * All
  * Personal
  * On-Prem Test Environments
  * Other


================================================================================
IMPORTANT NOTES
================================================================================

- HOSTY requires administrator privileges to run properly
- Always run HOSTY as administrator by right-clicking and selecting
  "Run as administrator"
- The HOSTS file is located at: C:\Windows\System32\drivers\etc\HOSTS
- Your environment data is stored in: %APPDATA%\HOSTY\data\environments.json
- Dassault Systemes required lines are automatically added to all HOSTS files
- Changes to the HOSTS file take effect immediately (no reboot required)
- Some applications may need to be restarted to pick up HOSTS file changes


================================================================================
TROUBLESHOOTING
================================================================================

If HOSTY won't start:
- Make sure you're running it as administrator
- Check that Windows Defender or antivirus isn't blocking it
- Try extracting to a different folder (avoid Program Files if issues persist)

If changes aren't taking effect:
- Make sure HOSTY is running as administrator
- Check that no other program has the HOSTS file locked
- Try restarting your web browser or other network applications

If you see "UNKNOWN" as current profile:
- This means HOSTY couldn't detect which environment is currently active
- Activate an environment from the sidebar to set it properly


================================================================================
SUPPORT
================================================================================

For issues or questions, please contact your system administrator or
refer to the development team.


Version: 1.0.0
License: MIT









