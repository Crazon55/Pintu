import { google } from 'googleapis';
import { createReadStream } from 'fs';
import { basename, dirname, join } from 'path';
import { fileURLToPath } from 'url';

let driveClient = null;

const __driveDir = dirname(fileURLToPath(import.meta.url));
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1mg-q6sQmQZ8cieiXe10fE7iYUn04AzL8';

function getDriveClient() {
  if (driveClient) return driveClient;
  const keyFile = join(__driveDir, 'service-account.json');
  console.log('[drive] Using key file:', keyFile);
  console.log('[drive] Target folder:', DRIVE_FOLDER_ID);
  const auth = new google.auth.GoogleAuth({
    keyFile,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  driveClient = google.drive({ version: 'v3', auth });
  return driveClient;
}

/**
 * Upload a file to Google Drive.
 * @param {string} filePath - Local file path
 * @param {string} fileName - Name for the file in Drive
 * @param {string} folderId - Drive folder ID (optional, uses env default)
 * @param {string} mimeType - MIME type (default: video/mp4)
 * @returns {Object} { fileId, webViewLink, webContentLink }
 */
export async function uploadToDrive(filePath, fileName, folderId, mimeType = 'video/mp4') {
  const drive = getDriveClient();
  const targetFolder = folderId || DRIVE_FOLDER_ID;

  console.log(`[drive] Uploading: ${fileName} to folder ${targetFolder}`);

  const response = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name: fileName || basename(filePath),
      parents: targetFolder ? [targetFolder] : [],
    },
    media: {
      mimeType,
      body: createReadStream(filePath),
    },
    fields: 'id, webViewLink, webContentLink',
  });

  console.log(`[drive] Uploaded: ${response.data.id} — ${response.data.webViewLink}`);
  return {
    fileId: response.data.id,
    webViewLink: response.data.webViewLink,
    webContentLink: response.data.webContentLink,
  };
}

/**
 * Upload multiple files to a subfolder in Drive.
 * Creates the subfolder if it doesn't exist.
 */
export async function uploadBatchToDrive(filePaths, subfolderName, parentFolderId) {
  const drive = getDriveClient();
  const parent = parentFolderId || DRIVE_FOLDER_ID;

  // Create subfolder
  const folder = await drive.files.create({
    requestBody: {
      name: subfolderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parent ? [parent] : [],
    },
    fields: 'id',
  });
  const folderId = folder.data.id;
  console.log(`[drive] Created subfolder: ${subfolderName} (${folderId})`);

  // Upload all files to subfolder
  const results = [];
  for (const filePath of filePaths) {
    const result = await uploadToDrive(filePath, basename(filePath), folderId);
    results.push(result);
  }

  return { folderId, files: results };
}
