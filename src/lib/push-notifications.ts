import { supabase } from '@/integrations/supabase/client';

// Clé publique VAPID — sa clé privée correspondante vit uniquement comme secret
// de l'Edge Function `send-push` (jamais commitée). L'ancienne clé publique n'avait
// pas de clé privée connue nulle part, donc paire régénérée en entier.
const VAPID_PUBLIC_KEY = 'BOoO8DxlbWgvAdNHTwpKMsxscmE97ps5pXjzyPFpgtRWjFP_Vvc-dxirZ_QE_cX7QQm6dsDH2gAjpCK5TTbeBGQ';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export async function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

export async function getPushPermissionState(): Promise<NotificationPermission | 'unsupported'> {
  if (!(await isPushSupported())) return 'unsupported';
  return Notification.permission;
}

export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!(await isPushSupported())) return false;

  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const raw = subscription.toJSON();
  if (!raw.endpoint || !raw.keys) return false;

  await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: raw.endpoint,
    p256dh: raw.keys.p256dh,
    auth: raw.keys.auth,
  }, { onConflict: 'endpoint' });

  return true;
}

export async function unsubscribeFromPush(userId: string): Promise<void> {
  if (!(await isPushSupported())) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
    await subscription.unsubscribe();
  } else {
    // Au cas où l'abonnement navigateur a déjà disparu mais pas la ligne en base.
    await supabase.from('push_subscriptions').delete().eq('user_id', userId);
  }
}

// iOS/iPadOS Safari ne délivre les notifications push que si le site a été
// ajouté à l'écran d'accueil — impossible de le savoir via une permission,
// il faut détecter la plateforme et le mode d'affichage.
export function isIosSafari(): boolean {
  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  return isIos;
}

export function isStandalonePwa(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
}
