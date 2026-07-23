import { google } from 'googleapis';
import { createReadStream, readFileSync } from 'fs';
import { basename, dirname, join } from 'path';
import { fileURLToPath } from 'url';

let driveClient = null;

const __driveDir = dirname(fileURLToPath(import.meta.url));
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '0AMBxg_5KAT-oUk9PVA';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

function getDriveClient() {
  if (driveClient) return driveClient;
  const keyFile = join(__driveDir, 'service-account.json');
  const serviceAccount = JSON.parse(readFileSync(keyFile, 'utf8'));
  console.log('[drive] Using key file:', keyFile);
  console.log('[drive] Target folder:', DRIVE_FOLDER_ID);
  console.log('[drive] Service account:', serviceAccount.client_email);
  const auth = new google.auth.JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  driveClient = google.drive({ version: 'v3', auth });
  return driveClient;
}

function sanitizeFolderName(name) {
  return String(name || '')
    .trim()
    .replace(/[\\/]+/g, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 200);
}

function ordinalDay(day) {
  const j = day % 10;
  const k = day % 100;
  if (k >= 11 && k <= 13) return `${day}th`;
  if (j === 1) return `${day}st`;
  if (j === 2) return `${day}nd`;
  if (j === 3) return `${day}rd`;
  return `${day}th`;
}

/**
 * Format a date as an IST folder name like "22nd July".
 */
export function formatIstDateFolder(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'long',
  }).formatToParts(date);

  const day = Number(parts.find((p) => p.type === 'day')?.value);
  const month = parts.find((p) => p.type === 'month')?.value || '';
  if (!day || !month) {
    throw new Error('Failed to format IST date folder name');
  }
  return `${ordinalDay(day)} ${month}`;
}

/**
 * Find a child folder by exact name under parentId, or create it.
 */
export async function findOrCreateFolder(parentId, name) {
  const drive = getDriveClient();
  const folderName = sanitizeFolderName(name);
  if (!folderName) {
    throw new Error('Folder name is required');
  }
  if (!parentId) {
    throw new Error('Parent folder ID is required');
  }

  const escaped = folderName.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const q = [
    `'${parentId}' in parents`,
    `name = '${escaped}'`,
    `mimeType = '${FOLDER_MIME}'`,
    'trashed = false',
  ].join(' and ');

  const listed = await drive.files.list({
    q,
    spaces: 'drive',
    corpora: 'allDrives',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    fields: 'files(id, name)',
    pageSize: 10,
  });

  const existing = listed.data.files?.[0];
  if (existing?.id) {
    console.log(`[drive] Reusing folder: ${folderName} (${existing.id})`);
    return existing.id;
  }

  const created = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name: folderName,
      mimeType: FOLDER_MIME,
      parents: [parentId],
    },
    fields: 'id, name',
  });

  console.log(`[drive] Created folder: ${folderName} (${created.data.id})`);
  return created.data.id;
}

/**
 * Resolve page → date (IST) → idea under the configured Drive root.
 * @returns {Promise<string>} leaf folder ID
 */
export async function ensureExportPath(pageName, ideaName, rootFolderId = DRIVE_FOLDER_ID) {
  const page = sanitizeFolderName(pageName) || 'unknown-page';
  const idea = sanitizeFolderName(ideaName) || 'untitled';
  const dateFolder = formatIstDateFolder();

  console.log(`[drive] Ensuring path: ${page} / ${dateFolder} / ${idea}`);

  const pageId = await findOrCreateFolder(rootFolderId, page);
  const dateId = await findOrCreateFolder(pageId, dateFolder);
  const ideaId = await findOrCreateFolder(dateId, idea);
  return ideaId;
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
 * Upload one export video into page / date(IST) / idea under the existing Drive root.
 */
export async function uploadExportToDrive(filePath, { pageName, ideaName, fileName } = {}) {
  const leafFolderId = await ensureExportPath(pageName, ideaName);
  return uploadToDrive(filePath, fileName || basename(filePath), leafFolderId);
}

/**
 * Upload multiple files to a subfolder in Drive.
 * Creates the subfolder if it doesn't exist.
 */
export async function uploadBatchToDrive(filePaths, subfolderName, parentFolderId) {
  const parent = parentFolderId || DRIVE_FOLDER_ID;
  const folderId = await findOrCreateFolder(parent, subfolderName);

  const results = [];
  for (const filePath of filePaths) {
    const result = await uploadToDrive(filePath, basename(filePath), folderId);
    results.push(result);
  }

  return { folderId, files: results };
}
