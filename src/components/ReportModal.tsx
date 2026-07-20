import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Flag, X } from 'lucide-react';
import { REPORT_REASONS } from '@/lib/constants';
import { cn } from '@/lib/utils';

type TargetType = 'profile' | 'message' | 'group_message' | 'salon_message' | 'forum_post' | 'forum_comment' | 'job_offer' | 'job_request' | 'activity' | 'feed_post' | 'feed_comment';

interface ReportModalProps {
  targetType: TargetType;
  targetId: string;
  targetUserId?: string | null;
  onClose: () => void;
}

/**
 * Fenêtre de signalement réutilisable pour tout type de contenu
 * (profil, message, post du forum, annonce, activité...).
 * S'utilise avec le composant ReportButton ci-dessous, ou directement.
 */
export function ReportModal({ targetType, targetId, targetUserId, onClose }: ReportModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [reason, setReason] = useState<string>('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!user || !reason) return;
    setSubmitting(true);
    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      target_user_id: targetUserId || null,
      reason: reason as any,
      details: details.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(t('reportModal.sendError'));
      return;
    }
    setDone(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-card rounded-3xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" /> {t('reportModal.title')}
          </h2>
          <button onClick={onClose} className="min-h-10 min-w-10 flex items-center justify-center -mr-2 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <div className="text-center py-4 space-y-2">
            <p className="text-2xl">✅</p>
            <p className="text-sm" style={{ fontFamily: 'Jost, sans-serif' }}>
              {t('reportModal.sentTitle')}
            </p>
            <button onClick={onClose} className="btn-ghost w-full mt-2">{t('reportModal.close')}</button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>
              {t('reportModal.why')}
            </p>
            <div className="space-y-2">
              {REPORT_REASONS.map(r => (
                <button key={r.value} onClick={() => setReason(r.value)}
                  className={cn(
                    'w-full text-left rounded-xl px-4 py-3 text-sm transition-all border',
                    reason === r.value ? 'border-destructive bg-destructive/10 text-destructive' : 'border-border bg-background hover:bg-secondary'
                  )}
                  style={{ fontFamily: 'Jost, sans-serif' }}>
                  {t(`reportReasons.${r.value}`)}
                </button>
              ))}
            </div>
            <textarea
              value={details}
              onChange={e => setDetails(e.target.value)}
              maxLength={500}
              placeholder={t('reportModal.detailsPlaceholder')}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              style={{ fontFamily: 'Jost, sans-serif' }}
            />
            <button onClick={handleSubmit} disabled={!reason || submitting}
              className="w-full rounded-full bg-destructive text-white py-3.5 font-semibold text-sm disabled:opacity-50">
              {submitting ? t('reportModal.sending') : t('reportModal.submit')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

interface ReportButtonProps {
  targetType: TargetType;
  targetId: string;
  targetUserId?: string | null;
  className?: string;
  label?: string;
}

/**
 * Petit bouton "drapeau" qui ouvre la fenêtre de signalement.
 * À placer sur n'importe quel contenu (profil, message, post...).
 */
export function ReportButton({ targetType, targetId, targetUserId, className, label }: ReportButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        title={t('reportModal.title')}
        className={className || 'min-h-10 min-w-10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors px-2.5 rounded-lg hover:bg-destructive/10'}>
        <Flag className="h-4 w-4" />
        {label && <span className="ml-1.5 text-xs">{label}</span>}
      </button>
      {open && (
        <ReportModal
          targetType={targetType}
          targetId={targetId}
          targetUserId={targetUserId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
