import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { ArrowLeft, Briefcase } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { cn } from '@/lib/utils';
import LocationPicker from '@/components/LocationPicker';

export default function NewJob() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('offer');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [pay, setPay] = useState('');
  const [availability, setAvailability] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/jobs'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim()) { toast.error('Le titre est obligatoire.'); return; }

    setLoading(true);
    try {
      if (tab === 'offer') {
        const { error } = await supabase.from('job_offers').insert({
          title: title.trim(), description: description.trim() || null,
          location: location.trim() || null, date: date.trim() || null,
          pay: pay.trim() || null, author_id: user.id,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('job_requests').insert({
          title: title.trim(), description: description.trim() || null,
          availability: availability.trim() || null, author_id: user.id,
        });
        if (error) throw error;
      }
      toast.success('Annonce publiée ! 🎉');
      navigate('/jobs');
    } catch (error: any) {
      toast.error(error.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all";

  return (
    <div className="min-h-screen pb-28 bg-background">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={handleBack} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-gold" strokeWidth={1.5} />
            <h1 className="font-display text-2xl font-semibold">Publier une annonce</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-secondary rounded-2xl">
          {[
            { id: 'offer', label: '💼 Je propose' },
            { id: 'request', label: '🙋 Je cherche' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(
                'flex-1 rounded-xl py-2.5 text-sm font-medium transition-all',
                tab === t.id ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
              style={{ fontFamily: 'Jost, sans-serif' }}>
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="card-premium p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block" style={{ fontFamily: 'Jost, sans-serif' }}>Titre de l'annonce *</label>
              <input className={inputClass} style={{ fontFamily: 'Jost, sans-serif' }} maxLength={100}
                placeholder={tab === 'offer' ? "Ex: Je propose du jardinage" : "Ex: Cherche aide déménagement"}
                value={title} onChange={e => setTitle(e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block" style={{ fontFamily: 'Jost, sans-serif' }}>Description</label>
              <textarea className={`${inputClass} resize-none`} style={{ fontFamily: 'Jost, sans-serif' }} maxLength={1000}
                placeholder="Décrivez votre annonce..." rows={4} value={description} onChange={e => setDescription(e.target.value)} />
            </div>
          </div>

          <div className="card-premium p-5 space-y-4">
            {tab === 'offer' ? (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block" style={{ fontFamily: 'Jost, sans-serif' }}>📍 Lieu</label>
                  <LocationPicker
                    value={location}
                    onChange={(label) => setLocation(label)}
                    placeholder="Ex: Saint-Martin-de-Ré..."
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block" style={{ fontFamily: 'Jost, sans-serif' }}>🕐 Disponibilité</label>
                  <input className={inputClass} style={{ fontFamily: 'Jost, sans-serif' }} placeholder="Ex: Ce week-end, Lundi matin..." value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block" style={{ fontFamily: 'Jost, sans-serif' }}>💶 Rémunération</label>
                  <input className={inputClass} style={{ fontFamily: 'Jost, sans-serif' }} placeholder="Ex: 15€/h, À négocier, Bénévole..." value={pay} onChange={e => setPay(e.target.value)} />
                </div>
              </>
            ) : (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block" style={{ fontFamily: 'Jost, sans-serif' }}>🕐 Quand ?</label>
                <input className={inputClass} style={{ fontFamily: 'Jost, sans-serif' }} placeholder="Ex: Ce week-end, Cette semaine..." value={availability} onChange={e => setAvailability(e.target.value)} />
              </div>
            )}
          </div>

          <button type="submit" disabled={loading || !title.trim()}
            className="btn-ocean w-full py-4 text-base font-semibold disabled:opacity-50">
            {loading ? 'Publication...' : "🚀 Publier l'annonce"}
          </button>
        </form>
      </div>
      <BottomNav />
    </div>
  );
}
