import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import { supabase } from '@/lib/supabase';

export type JobImageKind = 'before' | 'after';

export type JobImageRow = {
  id: string;
  job_id: string | null;
  user_id: string | null;
  kind: JobImageKind | null;
  image_url: string | null;
  storage_path: string | null;
  created_at: string | null;
};

const JOB_IMAGES_BUCKET = 'job-images';
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
  const response = await fetch(uri);
  return await response.arrayBuffer();
}

async function optimizeImage(uri: string): Promise<{ uri: string; ext: string; contentType: string }> {
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

export async function listJobImages(jobId: string): Promise<JobImageRow[]> {
  const { data, error } = await supabase
    .from('job_images')
    .select('id,job_id,user_id,kind,image_url,storage_path,created_at')
    .eq('job_id', jobId)
    .order('created_at', { ascending: true })
    .overrideTypes<JobImageRow[], { merge: false }>();

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function uploadJobImage(input: {
  userId: string;
  jobId: string;
  uri: string;
  kind: JobImageKind;
}): Promise<JobImageRow> {
  const optimized = await optimizeImage(input.uri);
  const ext = optimized.ext || getFileExtension(input.uri);
  const storagePath = `${input.userId}/${input.jobId}/${input.kind}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;
  const arrayBuffer = await fileToArrayBuffer(optimized.uri);

  const { error: uploadError } = await supabase.storage
    .from(JOB_IMAGES_BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: optimized.contentType,
      upsert: false,
    });

  if (uploadError) throw new Error(uploadError.message);

  const { data: publicData } = supabase.storage.from(JOB_IMAGES_BUCKET).getPublicUrl(storagePath);

  const { data, error } = await supabase
    .from('job_images')
    .insert({
      job_id: input.jobId,
      user_id: input.userId,
      kind: input.kind,
      image_url: publicData.publicUrl,
      storage_path: storagePath,
    })
    .select('id,job_id,user_id,kind,image_url,storage_path,created_at')
    .single()
    .overrideTypes<JobImageRow, { merge: false }>();

  if (error) {
    await supabase.storage.from(JOB_IMAGES_BUCKET).remove([storagePath]);
    throw new Error(error.message);
  }

  return data;
}

export async function deleteJobImage(id: string, storagePath: string | null): Promise<void> {
  if (storagePath) {
    const { error: storageError } = await supabase.storage.from(JOB_IMAGES_BUCKET).remove([storagePath]);
    if (storageError) throw new Error(storageError.message);
  }

  const { error } = await supabase.from('job_images').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
