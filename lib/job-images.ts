import { createJobImageStoragePath, prepareJobImage } from '@/lib/job-image-storage';
import { createLocalJobImage, deleteLocalJobImage, listLocalJobImages, upsertRemoteJobImages } from '@/lib/offline/core-data';
import { supabase } from '@/lib/supabase';

export type JobImageKind = 'before' | 'after';

export type JobImageRow = {
  id: string;
  job_id: string | null;
  user_id: string | null;
  kind: JobImageKind | null;
  image_url: string | null;
  storage_path: string | null;
  local_uri?: string | null;
  upload_status?: string | null;
  created_at: string | null;
};

function mergeImages(remoteRows: JobImageRow[], localRows: JobImageRow[]) {
  const merged = new Map<string, JobImageRow>();
  remoteRows.forEach((row) => {
    merged.set(row.id, row);
  });
  localRows.forEach((row) => {
    merged.set(row.id, row);
  });
  return [...merged.values()].sort(
    (a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
  );
}

export async function listJobImages(jobId: string): Promise<JobImageRow[]> {
  const localRows = await listLocalJobImages(jobId);

  const { data, error } = await supabase
    .from('job_images')
    .select('id,job_id,user_id,kind,image_url,storage_path,local_uri,upload_status,created_at')
    .eq('job_id', jobId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .overrideTypes<JobImageRow[], { merge: false }>();

  if (error) return localRows;
  await upsertRemoteJobImages(data ?? []);
  return mergeImages(data ?? [], localRows);
}

export async function uploadJobImage(input: {
  userId: string;
  jobId: string;
  uri: string;
  kind: JobImageKind;
}): Promise<JobImageRow> {
  const optimized = await prepareJobImage(input.uri);
  const storagePath = createJobImageStoragePath({
    userId: input.userId,
    jobId: input.jobId,
    kind: input.kind,
    uri: input.uri,
    ext: optimized.ext,
  });

  return createLocalJobImage({
    userId: input.userId,
    jobId: input.jobId,
    localUri: optimized.uri,
    kind: input.kind,
    storagePath,
    contentType: optimized.contentType,
  });
}

export async function deleteJobImage(id: string, storagePath: string | null): Promise<void> {
  await deleteLocalJobImage(id, storagePath);
}
