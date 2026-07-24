// Partage direct vers WhatsApp (wa.me), plutôt que la feuille de partage
// générique du navigateur — sur l'Île de Ré, la coordination locale passe
// beaucoup par des groupes WhatsApp familiaux/de voisinage.
export function shareToWhatsApp(text: string): void {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
}
