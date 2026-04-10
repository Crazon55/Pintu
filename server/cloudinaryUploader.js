import { v2 as cloudinary } from 'cloudinary';
import { basename } from 'path';

cloudinary.config({
  cloud_name: 'dnimyimen',
  api_key: '723568359688272',
  api_secret: 'mXrt1Pu36fg3q_oIA12-jqsYz_Q',
});

/**
 * Upload a video to Cloudinary.
 * @param {string} filePath - Local file path
 * @param {string} fileName - Display name
 * @returns {Object} { url, publicId }
 */
export async function uploadToCloudinary(filePath, fileName) {
  const name = (fileName || basename(filePath)).replace(/\.[^.]+$/, '');
  console.log(`[cloudinary] Uploading: ${name}`);

  const result = await cloudinary.uploader.upload(filePath, {
    resource_type: 'video',
    folder: 'pintu-exports',
    public_id: name,
    overwrite: true,
  });

  console.log(`[cloudinary] Done: ${result.secure_url}`);
  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}
