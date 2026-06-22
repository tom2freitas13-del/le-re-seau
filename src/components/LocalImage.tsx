import { useState } from 'react';

interface LocalImageProps {
  src: string;
  alt: string;
  fallbackEmoji: string;
  fallbackLabel?: string;
  fallbackBg?: string;
  className?: string;
}

/**
 * Affiche une photo locale (depuis /public/images/...).
 * Si le fichier n'existe pas encore, affiche un emoji + label à la place
 * plutôt qu'une image cassée. Permet d'ajouter ses propres photos
 * progressivement sans jamais rien casser visuellement.
 */
export default function LocalImage({ src, alt, fallbackEmoji, fallbackLabel, fallbackBg = 'bg-ocean-light', className = '' }: LocalImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 ${fallbackBg} ${className}`}>
        <span className="text-4xl">{fallbackEmoji}</span>
        {fallbackLabel && (
          <span className="text-xs font-medium text-foreground/70" style={{ fontFamily: 'Jost, sans-serif' }}>
            {fallbackLabel}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`object-cover ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
