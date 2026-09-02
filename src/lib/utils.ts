import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Valide qu'une chaîne est bien un UUID. Utile avant d'injecter un
// identifiant venu de l'URL (ex: /chat/:partnerId) dans un filtre PostgREST
// `.or("and(sender_id.eq.<id>,...)")` : sans ça, une valeur contenant `,`
// ou `)` pourrait altérer la structure du filtre.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | undefined | null): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}
