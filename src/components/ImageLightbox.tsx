import { X } from 'lucide-react';

interface ImageLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

/**
 * Agrandit une image de post en la centrant sur un fond sombre, sans passer
 * en plein écran bord à bord (marge visible autour, comme un lightbox photo
 * classique) — évite aussi d'ouvrir l'image dans un nouvel onglet du
 * navigateur, ce qui sortait de l'appli.
 */
export default function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-6" onClick={onClose}>
      <button onClick={onClose}
        className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
        <X className="h-5 w-5" />
      </button>
      <img src={src} alt={alt} className="max-w-full max-h-full object-contain rounded-2xl" onClick={e => e.stopPropagation()} />
    </div>
  );
}
