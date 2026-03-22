import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import { supabase } from '@/lib/supabase';

export const PROFILE_ASSETS_BUCKET = 'profile-assets';
const MAX_LOGO_DIMENSION = 1200;

async function fileToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const response = await fetch(uri);
  return await response.arrayBuffer();
}

async function optimizeLogo(uri: string): Promise<{ uri: string; contentType: string; ext: string }> {
  const optimized = await manipulateAsync(
    uri,
    [{ resize: { width: MAX_LOGO_DIMENSION } }],
    {
      format: SaveFormat.PNG,
    }
  );

  return {
    uri: optimized.uri,
    contentType: 'image/png',
    ext: 'png',
  };
}

export async function uploadCompanyLogo(input: {
  userId: string;
  uri: string;
}): Promise<{ path: string; url: string }> {
  const optimized = await optimizeLogo(input.uri);
  const storagePath = `${input.userId}/logos/${Date.now()}-${Math.random().toString(36).slice(2)}.${optimized.ext}`;
  const arrayBuffer = await fileToArrayBuffer(optimized.uri);

  const { error: uploadError } = await supabase.storage
    .from(PROFILE_ASSETS_BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: optimized.contentType,
      upsert: false,
    });

  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from(PROFILE_ASSETS_BUCKET).getPublicUrl(storagePath);
  return { path: storagePath, url: data.publicUrl };
}

export async function deleteProfileAsset(path: string): Promise<void> {
  const { error } = await supabase.storage.from(PROFILE_ASSETS_BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}
