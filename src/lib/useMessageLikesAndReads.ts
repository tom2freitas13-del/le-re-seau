import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';

/**
 * Likes (petit cœur) + accusés de lecture par message, partagés entre les
 * discussions de groupe et les salons thématiques — même principe que
 * story_views pour les stories : une ligne par (message, personne).
 *
 * Le composant appelant garde son propre channel realtime (il a déjà les
 * messages et le "typing" dessus) et relaie juste les events likes/reads
 * vers `applyLikeInsert` / `applyLikeDelete` / `applyReadInsert`.
 */
export function useMessageLikesAndReads(likesTable: string, readsTable: string) {
  const { user } = useAuth();
  const [likesByMessage, setLikesByMessage] = useState<Record<string, string[]>>({});
  const [readsByMessage, setReadsByMessage] = useState<Record<string, string[]>>({});
  const readMarkedRef = useRef<Set<string>>(new Set());

  const loadForMessages = useCallback(async (messageIds: string[]) => {
    if (messageIds.length === 0) { setLikesByMessage({}); setReadsByMessage({}); return; }
    const [{ data: likes }, { data: reads }] = await Promise.all([
      supabase.from(likesTable).select('message_id, user_id').in('message_id', messageIds),
      supabase.from(readsTable).select('message_id, viewer_id').in('message_id', messageIds),
    ]);
    const likeMap: Record<string, string[]> = {};
    (likes || []).forEach((l: any) => { (likeMap[l.message_id] ||= []).push(l.user_id); });
    setLikesByMessage(likeMap);
    const readMap: Record<string, string[]> = {};
    (reads || []).forEach((r: any) => { (readMap[r.message_id] ||= []).push(r.viewer_id); });
    setReadsByMessage(readMap);
  }, [likesTable, readsTable]);

  // Enregistre "vu" pour des messages reçus (pas les nôtres), une seule fois
  // par message.
  const markMessagesRead = useCallback((messageIds: string[]) => {
    if (!user) return;
    const toMark = messageIds.filter(id => !readMarkedRef.current.has(id));
    if (toMark.length === 0) return;
    toMark.forEach(id => readMarkedRef.current.add(id));
    supabase.from(readsTable)
      .upsert(toMark.map(message_id => ({ message_id, viewer_id: user.id })), { onConflict: 'message_id,viewer_id', ignoreDuplicates: true })
      .then();
  }, [user, readsTable]);

  const toggleLike = useCallback(async (messageId: string) => {
    if (!user) return;
    const likedByMe = (likesByMessage[messageId] || []).includes(user.id);
    if (likedByMe) {
      setLikesByMessage(prev => ({ ...prev, [messageId]: (prev[messageId] || []).filter(id => id !== user.id) }));
      await supabase.from(likesTable).delete().eq('message_id', messageId).eq('user_id', user.id);
    } else {
      setLikesByMessage(prev => ({ ...prev, [messageId]: [...(prev[messageId] || []), user.id] }));
      await supabase.from(likesTable).insert({ message_id: messageId, user_id: user.id });
    }
  }, [user, likesTable, likesByMessage]);

  const applyLikeInsert = useCallback((messageId: string, userId: string) => {
    setLikesByMessage(prev => {
      const existing = prev[messageId] || [];
      if (existing.includes(userId)) return prev;
      return { ...prev, [messageId]: [...existing, userId] };
    });
  }, []);

  const applyLikeDelete = useCallback((messageId: string, userId: string) => {
    setLikesByMessage(prev => {
      if (!(messageId in prev)) return prev;
      return { ...prev, [messageId]: (prev[messageId] || []).filter(id => id !== userId) };
    });
  }, []);

  const applyReadInsert = useCallback((messageId: string, viewerId: string) => {
    setReadsByMessage(prev => {
      const existing = prev[messageId] || [];
      if (existing.includes(viewerId)) return prev;
      return { ...prev, [messageId]: [...existing, viewerId] };
    });
  }, []);

  return {
    likesByMessage, readsByMessage,
    loadForMessages, markMessagesRead, toggleLike,
    applyLikeInsert, applyLikeDelete, applyReadInsert,
  };
}
