import { supabase } from '@/integrations/supabase/client';

export const MAX_PHOTO_SIZE_MB = 5;

// Le format réellement produit par MediaRecorder dépend de l'appareil
// (webm/opus sur desktop et Android, mp4/aac sur iOS Safari) — on ne peut
// pas le figer, sous peine d'uploader un fichier dont l'extension/Content-Type
// mentent sur son contenu réel et cassent la lecture côté récepteur.
export function pickAudioMimeType(): string | undefined {
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(t => MediaRecorder.isTypeSupported(t));
}

function audioExtension(mimeType: string): string {
  return mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : 'webm';
}

export async function uploadVoiceMessage(bucket: string, userId: string, blob: Blob, mimeType: string): Promise<string | null> {
  const path = `${userId}/${Date.now()}.${audioExtension(mimeType)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType: mimeType });
  if (error) return null;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function uploadPhoto(bucket: string, userId: string, file: File): Promise<string | null> {
  const ext = file.name.split('.').pop();
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type });
  if (error) return null;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
