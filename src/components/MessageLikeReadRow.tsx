import { Heart, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageLikeReadRowProps {
  likedByMe: boolean;
  likeCount: number;
  readCount: number;
  onToggleLike: () => void;
  onShowLikers: () => void;
  onShowViewers: () => void;
}

/** Petit cœur (like) + compteur de vues, affiché sous un message de groupe ou de salon. */
export default function MessageLikeReadRow({ likedByMe, likeCount, readCount, onToggleLike, onShowLikers, onShowViewers }: MessageLikeReadRowProps) {
  return (
    <div className="flex items-center gap-2.5 mt-1 px-1">
      <button onClick={onToggleLike} className="flex items-center gap-1 text-muted-foreground hover:text-destructive transition-colors">
        <Heart className={cn('h-3.5 w-3.5', likedByMe && 'fill-destructive text-destructive')} />
      </button>
      {likeCount > 0 && (
        <button onClick={onShowLikers} className="text-xs text-muted-foreground hover:underline" style={{ fontFamily: 'Jost, sans-serif' }}>
          {likeCount}
        </button>
      )}
      {readCount > 0 && (
        <button onClick={onShowViewers} className="flex items-center gap-1 text-xs text-muted-foreground hover:underline" style={{ fontFamily: 'Jost, sans-serif' }}>
          <Eye className="h-3.5 w-3.5" /> {readCount}
        </button>
      )}
    </div>
  );
}
