/**
 * Cloudinary Service for Client-Side Image Uploads
 * 
 * This module handles uploading images directly to Cloudinary from the client.
 * Uses unsigned upload with upload preset for security.
 */

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dq9yrj7c9';
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'kyc_uploads';

export interface CloudinaryUploadResult {
  success: boolean;
  url?: string;
  publicId?: string;
  error?: string;
}

/**
 * Convert base64 data URL to File object
 */
function base64ToFile(base64String: string, filename: string): File {
  const arr = base64String.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

/**
 * Upload an image to Cloudinary
 * @param imageData - Base64 data URL or File object
 * @param folder - Folder name in Cloudinary (e.g., 'kyc/id-front')
 * @returns Upload result with URL or error
 */
export async function uploadToCloudinary(
  imageData: string | File,
  folder: string = 'kyc'
): Promise<CloudinaryUploadResult> {
  try {
    const formData = new FormData();
    
    // Handle base64 string or File
    if (typeof imageData === 'string') {
      const file = base64ToFile(imageData, `upload-${Date.now()}.jpg`);
      formData.append('file', file);
    } else {
      formData.append('file', imageData);
    }
    
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);
    
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Upload failed');
    }
    
    const data = await response.json();
    
    return {
      success: true,
      url: data.secure_url,
      publicId: data.public_id,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload image',
    };
  }
}

/**
 * Upload multiple images to Cloudinary
 * @param images - Array of {data, folder} objects
 * @returns Array of upload results
 */
export async function uploadMultipleToCloudinary(
  images: Array<{ data: string | File; folder: string }>
): Promise<CloudinaryUploadResult[]> {
  const uploadPromises = images.map(({ data, folder }) => 
    uploadToCloudinary(data, folder)
  );
  return Promise.all(uploadPromises);
}
