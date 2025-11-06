# NetSuite File Downloader

A Node.js utility for downloading files from NetSuite using the SuiteREST API with OAuth 1.0a authentication.

## Overview

This project provides a simple script to bulk download files from a specified NetSuite folder. It uses OAuth 1.0a for secure authentication and the NetSuite REST API for file operations.

## Project Structure

```
download_folder/
├── download_files.js          # Main script for downloading files
├── rest_client/
│   └── netsuiteRestClient.js  # NetSuite REST API client with OAuth
├── downloads/                 # Output directory for downloaded files
└── README.md
```

## Prerequisites

- Node.js (v14 or higher recommended)
- NetSuite account with REST API access enabled
- OAuth credentials for NetSuite (Consumer Key/Secret, Token ID/Secret)
- Access to the NetSuite folder you want to download from

## Installation

1. Clone this repository
2. Install dependencies:
```bash
npm install axios oauth-1.0a dotenv
```

3. Create a `.env` file in the root directory with your NetSuite credentials:
```env
NETSUITE_ACCOUNT_ID=your_account_id
NETSUITE_CONSUMER_KEY=your_consumer_key
NETSUITE_CONSUMER_SECRET=your_consumer_secret
NETSUITE_TOKEN_ID=your_token_id
NETSUITE_TOKEN_SECRET=your_token_secret
ROOT_FOLDER_ID=your_folder_id
```

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `NETSUITE_ACCOUNT_ID` | Your NetSuite account ID |
| `NETSUITE_CONSUMER_KEY` | OAuth Consumer Key from your integration record |
| `NETSUITE_CONSUMER_SECRET` | OAuth Consumer Secret from your integration record |
| `NETSUITE_TOKEN_ID` | Token ID from your access token |
| `NETSUITE_TOKEN_SECRET` | Token Secret from your access token |
| `ROOT_FOLDER_ID` | Internal ID of the NetSuite folder to download from |

### Finding Your Folder ID

To find the folder ID in NetSuite:
1. Navigate to the folder in the File Cabinet
2. Check the URL - the ID appears as `id=` parameter
3. Or use the NetSuite REST API browser to search for folders

## Usage

Run the download script:

```bash
node download_files.js
```

The script will:
1. Connect to NetSuite using your OAuth credentials
2. List all files in the specified folder (up to 1000 files)
3. Download each file to the `./downloads` directory
4. Display progress in the console

## Features

- **OAuth 1.0a Authentication**: Secure authentication using HMAC-SHA256 signatures
- **Batch Download**: Downloads all files from a specified NetSuite folder
- **Progress Tracking**: Console output shows download progress
- **Error Handling**: Detailed error messages for troubleshooting

## API Client

The `netsuiteRestClient.js` module provides:
- `netsuiteRequest()`: Generic function for making authenticated NetSuite REST API calls
- Automatic OAuth header generation
- Support for different HTTP methods (GET, POST, etc.)
- Configurable response types (JSON, arraybuffer for binary files)

## Limitations

- Currently downloads up to 1000 files per run (NetSuite API limit)
- Downloads files to a flat structure (no subfolder preservation)
- Requires valid OAuth credentials with appropriate permissions

## Troubleshooting

**Authentication Errors**: Verify your OAuth credentials are correct and the integration record is enabled in NetSuite.

**Permission Errors**: Ensure your token has access to the File Cabinet and the specific folder.

**File Not Found**: Check that the `ROOT_FOLDER_ID` is correct and the folder contains files.

## Security Notes

- Never commit your `.env` file to version control
- Keep your OAuth credentials secure
- Regularly rotate your tokens
- Use environment-specific credentials for development vs. production
