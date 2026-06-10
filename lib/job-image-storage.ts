import { File } from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import { supabase } from '@/lib/supabase';

export const JOB_IMAGES_BUCKET = 'job-images';

const MAX_IMAGE_DIMENSION = 1600;
const IMAGE_COMPRESS_QUALITY = 0.72;

function getFileExtension(uri: string): string {
  const normalized = uri.split('?')[0] ?? uri;
  const parts = normalized.split('.');
  const ext = parts[parts.length - 1]?.toLowerCase();
  if (!ext || ext.length > 5) return 'jpg';
  return ext;
}

async function fileToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  if (uri.startsWith('file://')) {
    return await new File(uri).arrayBuffer();
  }

  const response = await fetch(uri);
  return await response.arrayBuffer();
}

export async function prepareJobImage(uri: string): Promise<{ uri: string; ext: string; contentType: string }> {
  const optimized = await manipulateAsync(
    uri,
    [{ resize: { width: MAX_IMAGE_DIMENSION } }],
    {
      compress: IMAGE_COMPRESS_QUALITY,
      format: SaveFormat.JPEG,
    }
  );

  return {
    uri: optimized.uri,
    ext: 'jpg',
    contentType: 'image/jpeg',
  };
}

export function createJobImageStoragePath(input: { userId: string; jobId: string; kind: string; uri: string; ext?: string }) {
  const ext = input.ext || getFileExtension(input.uri);
  return `${input.userId}/${input.jobId}/${input.kind}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
}

export async function uploadPreparedJobImage(input: { storagePath: string; uri: string; contentType: string }) {
  const arrayBuffer = await fileToArrayBuffer(input.uri);
  const { error } = await supabase.storage.from(JOB_IMAGES_BUCKET).upload(input.storagePath, arrayBuffer, {
    contentType: input.contentType,
    upsert: false,
  });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(JOB_IMAGES_BUCKET).getPublicUrl(input.storagePath);
  return data.publicUrl;
}

export async function removeStoredJobImage(storagePath: string) {
  const { error } = await supabase.storage.from(JOB_IMAGES_BUCKET).remove([storagePath]);
  if (error) throw new Error(error.message);
}
