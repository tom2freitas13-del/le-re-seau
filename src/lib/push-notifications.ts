import { supabase } from '@/integrations/supabase/client';

const VAPID_PUBLIC_KEY = 'BGXjeQ8KDjk70GwNn5LqD82iPCeDBmh_miSxUeBmhfxTT5bj9ERTesX80grZHbzX5uCZnP44MlYkPZhiYHEPAIs';

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
