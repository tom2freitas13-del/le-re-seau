import { useState } from 'react';
import { UserX, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BlockButtonProps {
  isBlocked: boolean;
  onBlock: () => void;
  onUnblock: () => void;
  className?: string;
}

/**
 * Bouton bloquer/débloquer un utilisateur. Demande une confirmation
 * avant de bloquer pour éviter les clics accidentels.
 */
export default function BlockButton({ isBlocked, onBlock, onUnblock, className }: BlockButtonProps) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onBlock(); setConfirming(false); }}
          className="text-xs font-medium text-destructive px-3 py-1.5 rounded-full bg-destructive/10">
          Confirmer le blocage
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setConfirming(false); }}
          className="text-xs text-muted-foreground px-3 py-1.5">
          Annuler
        </button>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onUnblock(); }}
        className={cn('flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-secondary', className)}>
        <UserCheck className="h-4 w-4" />
        Débloquer
      </button>
    );
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
      title="Bloquer cet utilisateur"
      className={cn('text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-destructive/10', className)}>
      <UserX className="h-4 w-4" />
    </button>
  );
}
