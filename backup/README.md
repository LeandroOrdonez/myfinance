# MyFinance Database Backup

A script to backup your MyFinance database to Google Drive.

## Features

- Creates a dated backup of the database file following the format: `myfinance-YYYYMMDD-VERSION.db`
- Removes the 'v' prefix from version numbers (e.g., 'v0.1.3' becomes '0.1.3' in the filename)
- Uploads the backup to a specified Google Drive folder
- Auto-installs required dependencies

## Setup

You have two options for Google Drive authentication:

### Option 1: Service Account (Recommended - No browser authentication needed)

1. Set up Google Drive API access with a Service Account:

   a. Go to [Google Cloud Console](https://console.cloud.google.com/)
   b. Create a new project or select an existing one
   c. Navigate to "APIs & Services" > "Library"
   d. Search for and enable "Google Drive API"
   e. Go to "IAM & Admin" > "Service Accounts"
   f. Click "Create Service Account"
      - Enter a service account name (e.g., "MyFinance Backup")
      - Add a description (optional)
      - Click "Create and Continue"
      - Skip the "Grant this service account access to project" step
      - Click "Done"
   g. Click on the newly created service account
   h. Go to the "Keys" tab
   i. Click "Add Key" > "Create new key"
      - Choose "JSON" key type
      - Click "Create"
   j. Download the JSON key file and save it as `service-account.json` in the backup directory
   k. **Important:** Share your Google Drive folder with the service account email address
      - The email is in the downloaded JSON file (client_email field)
      - In Google Drive, right-click your backup folder
      - Click "Share" and add the service account email with Editor access

2. Run the script:
   - The script will automatically use the service account credentials
   - No browser authentication is needed

### Option 2: OAuth (Requires browser authentication)

1. Set up Google Drive API access with OAuth:

   a. Go to [Google Cloud Console](https://console.cloud.google.com/)
   b. Create a new project or select an existing one
   c. Navigate to "APIs & Services" > "OAuth consent screen"
      - Choose "External" user type (or "Internal" if using Google Workspace)
      - Fill in the App name ("MyFinance Backup"), user support email, and developer contact email
      - Skip adding scopes for now (we'll specify them in the script)
      - Add your email address as a test user
      - Complete the registration
   d. Navigate to "APIs & Services" > "Library"
   e. Search for and enable "Google Drive API"
   f. Go to "APIs & Services" > "Credentials"
   g. Create "OAuth client ID" credentials:
      - Application type: Desktop application
      - Name: MyFinance Backup (or any name you prefer)
   h. Download the JSON file and save it as `client_secrets.json` in the backup directory

2. First-time authentication:

   After setting up the client_secrets.json file:
   - Run the script once
   - It will open a browser window for Google authentication
   - You'll see a warning that "MyFinance has not completed the Google verification process"
   - Click "Advanced" and then "Go to [Project Name] (unsafe)" - this is safe as you created the credentials
   - Grant permission to access your Google Drive
   - Credentials will be saved locally in `mycreds.txt` for future use

3. Find your Google Drive folder ID:
   - Open Google Drive in a browser
   - Navigate to the folder where you want to store backups
   - The folder ID is the last part of the URL:
     `https://drive.google.com/drive/folders/FOLDER_ID_HERE`

## Usage

Basic usage:
```
./backup_script.py
```

To upload to a specific Google Drive folder:
```
./backup_script.py --folder-id YOUR_GOOGLE_DRIVE_FOLDER_ID
```

### Environment Variable Configuration

You can also specify the Google Drive folder ID in a `.env` file in the project root:

```
# In project root .env file
MYFINANCE_BACKUP_FOLDER=YOUR_GOOGLE_DRIVE_FOLDER_ID
```

The script will:
1. First check for a folder ID passed via command line argument
2. If not found, look for the MYFINANCE_BACKUP_FOLDER variable in the .env file
3. If neither is provided, the file will be uploaded to your Google Drive root

## Automation

You can schedule this script with cron to run automatic backups:

```
# Edit your crontab
crontab -e

# Add a line to run the backup daily at 2am
0 2 * * * cd /path/to/myfinance && /path/to/myfinance/backup/backup_script.py

# Alternative: specify folder ID directly (if not using .env)
# 0 2 * * * cd /path/to/myfinance && /path/to/myfinance/backup/backup_script.py --folder-id YOUR_FOLDER_ID
```

## Troubleshooting

- If authentication fails, delete the `mycreds.txt` file and run the script again
- Make sure your Google account has permission to write to the specified folder
- Check that the database file exists at the expected location