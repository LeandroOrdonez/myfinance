#!/usr/bin/env python3
"""
Database backup script for MyFinance application.
Backs up the database and uploads it to Google Drive.
"""

import os
import sys
import shutil
from datetime import datetime
import subprocess
from pathlib import Path
import argparse
import re

try:
    from pydrive2.auth import GoogleAuth
    from pydrive2.drive import GoogleDrive
except ImportError:
    print("Installing required dependencies...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pydrive2"])
    from pydrive2.auth import GoogleAuth
    from pydrive2.drive import GoogleDrive


def get_last_tag():
    """Get the last git tag."""
    try:
        result = subprocess.run(
            ["git", "describe", "--tags", "--abbrev=0"],
            capture_output=True,
            text=True,
            check=True
        )
        tag = result.stdout.strip()
        # Remove the 'v' prefix if it exists
        if tag.startswith('v'):
            tag = tag[1:]
        return tag if tag else datetime.now().strftime("%H%M%S")
    except subprocess.SubprocessError as e:
        print(f"Error getting git tag: {e}")
        return datetime.now().strftime("%H%M%S")  # Fallback to timestamp


def backup_database(source_path, backup_dir):
    """Create a backup of the database file."""
    if not os.path.exists(source_path):
        print(f"Error: Database file not found at {source_path}")
        sys.exit(1)
    
    # Create backup directory if it doesn't exist
    os.makedirs(backup_dir, exist_ok=True)
    
    # Generate backup filename with date and tag
    date_str = datetime.now().strftime("%Y%m%d")
    tag = get_last_tag()
    backup_filename = f"myfinance-{date_str}-{tag}.db"
    backup_path = os.path.join(backup_dir, backup_filename)
    
    # Copy the database file
    shutil.copy2(source_path, backup_path)
    print(f"Database backed up to {backup_path}")
    
    return backup_path


def authenticate_google_drive():
    """Authenticate with Google Drive."""
    # Check for service account credentials
    service_account_file = "service-account.json"
    client_secrets_file = "client_secrets.json"
    
    # Try service account auth first (easier, no browser auth needed)
    if os.path.exists(service_account_file):
        try:
            print("Using service account authentication...")
            gauth = GoogleAuth()
            settings_path = os.path.join(os.path.dirname(__file__), "settings.yaml")
            
            # Create settings.yaml for service account if it doesn't exist
            if not os.path.exists(settings_path):
                with open(settings_path, "w") as f:
                    f.write(f"""client_config_backend: settings
client_config:
  client_type: service
  auth_uri: https://accounts.google.com/o/oauth2/auth
  token_uri: https://accounts.google.com/o/oauth2/token
  revoke_uri: https://accounts.google.com/o/oauth2/revoke
  client_id: placeholder
  client_secret: placeholder
service_config:
  client_json_file_path: {os.path.abspath(service_account_file)}
save_credentials: False
oauth_scope:
  - https://www.googleapis.com/auth/drive
""")
            
            gauth.ServiceAuth()
            return GoogleDrive(gauth)
        except Exception as e:
            print(f"Service account authentication failed: {e}")
            print("Falling back to OAuth authentication...")
    
    # Fall back to OAuth flow
    if not os.path.exists(client_secrets_file):
        print("\nERROR: No authentication credentials found!")
        print("\nYou have two options for Google Drive authentication:")
        print("\nOPTION 1: OAuth (requires browser authentication)")
        print("1. Go to https://console.cloud.google.com/")
        print("2. Create a new project or select existing one")
        print("3. Set up the OAuth consent screen (add yourself as a test user)")
        print("4. Enable the Google Drive API")
        print("5. Create OAuth client ID (Application type: Desktop)")
        print("6. Download the JSON and save as 'client_secrets.json' in this directory")
        print("\nOPTION 2: Service Account (simpler, no browser auth)")
        print("1. Go to https://console.cloud.google.com/")
        print("2. Create a new project or select existing one")
        print("3. Enable the Google Drive API")
        print("4. Create a Service Account")
        print("5. Create a key for the service account (JSON type)")
        print("6. Download and save as 'service-account.json' in this directory")
        print("7. Share your Google Drive folder with the service account email")
        sys.exit(1)

    gauth = GoogleAuth()
    
    # Set up the client_secrets.json path
    client_secrets_path = os.path.abspath(client_secrets_file)
    settings_path = os.path.join(os.path.dirname(__file__), "settings.yaml")
    
    # Create settings.yaml if it doesn't exist
    if not os.path.exists(settings_path):
        with open(settings_path, "w") as f:
            f.write(f"""client_config_backend: file
client_config_file: {client_secrets_path}
save_credentials: True
save_credentials_backend: file
save_credentials_file: mycreds.txt
get_refresh_token: True
oauth_scope:
  - https://www.googleapis.com/auth/drive.file
  - https://www.googleapis.com/auth/drive.appdata
  - https://www.googleapis.com/auth/drive.metadata
""")
    
    # Try to load saved client credentials
    gauth.LoadClientConfigFile(client_secrets_path)
    gauth.LoadCredentialsFile("mycreds.txt")
    
    if gauth.credentials is None:
        # Authenticate if they're not available
        print("\nOpening browser for authentication...")
        print("If you see a warning about an unverified app, click 'Advanced' and then 'Go to (unsafe)'")
        print("This is safe because you created these credentials yourself.")
        gauth.LocalWebserverAuth()
    elif gauth.access_token_expired:
        # Refresh them if expired
        gauth.Refresh()
    else:
        # Initialize the saved creds
        gauth.Authorize()
    
    # Save the current credentials to a file
    gauth.SaveCredentialsFile("mycreds.txt")
    
    return GoogleDrive(gauth)


def load_env_vars(env_path):
    """Load environment variables from a .env file."""
    if not os.path.exists(env_path):
        return {}
    
    env_vars = {}
    with open(env_path, 'r') as file:
        for line in file:
            line = line.strip()
            if line and not line.startswith('#'):
                key, value = line.split('=', 1)
                env_vars[key] = value
    
    return env_vars


def upload_to_drive(drive, file_path, folder_id=None):
    """Upload the backup file to Google Drive."""
    filename = os.path.basename(file_path)
    
    file_metadata = {
        'title': filename,
    }
    
    # If folder_id is provided, upload to that folder
    if folder_id:
        file_metadata['parents'] = [{'id': folder_id}]
    
    # Upload the file
    gfile = drive.CreateFile(file_metadata)
    gfile.SetContentFile(file_path)
    gfile.Upload()
    
    print(f"File uploaded to Google Drive with ID: {gfile['id']}")
    return gfile['id']


def main():
    parser = argparse.ArgumentParser(description='Backup MyFinance database to Google Drive')
    parser.add_argument(
        '--folder-id', 
        help='Google Drive folder ID to upload to'
    )
    args = parser.parse_args()
    
    # Paths
    script_dir = Path(__file__).parent.absolute()
    project_root = script_dir.parent
    db_path = project_root / "backend" / "app" / "data" / "myfinance.db"
    backup_dir = project_root / "backup"
    env_path = project_root / ".env"
    
    # Change to the script directory to ensure client_secrets.json is found
    original_dir = os.getcwd()
    os.chdir(script_dir)
    
    # Get folder_id from .env if not provided as argument
    folder_id = args.folder_id
    if not folder_id:
        env_vars = load_env_vars(env_path)
        folder_id = env_vars.get('MYFINANCE_BACKUP_FOLDER')
        if folder_id:
            print(f"Using folder ID from .env file: {folder_id}")
    
    try:
        # Backup database
        backup_path = backup_database(db_path, backup_dir)
        
        # Upload to Google Drive
        drive = authenticate_google_drive()
        upload_to_drive(drive, backup_path, folder_id)
        print("Backup completed successfully!")
    except Exception as e:
        print(f"Error uploading to Google Drive: {e}")
        sys.exit(1)
    finally:
        # Return to original directory
        os.chdir(original_dir)


if __name__ == "__main__":
    main()