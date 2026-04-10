import { google } from 'googleapis';
import { createReadStream } from 'fs';
import { basename, dirname, join } from 'path';
import { fileURLToPath } from 'url';

let driveClient = null;

function getDriveClient() {
  if (driveClient) return driveClient;
  const keyFile = join(dirname(fileURLToPath(import.meta.url)), 'service-account.json');
  const auth = new google.auth.GoogleAuth({
    keyFile,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
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
  const targetFolder = folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;

  console.log(`[drive] Uploading: ${fileName} to folder ${targetFolder}`);

  const response = await drive.files.create({
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
  const parent = parentFolderId || process.env.GOOGLE_DRIVE_FOLDER_ID;

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
