export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          name: string | null;
          age: number | null;
          bio: string | null;
          photo_url: string | null;
          status: 'resident' | 'frequent' | 'vacation' | null;
          availability: 'weekend' | 'week' | 'summer' | 'year' | null;
          interests: string[] | null;
          instagram: string | null;
          linkedin: string | null;
          is_admin: boolean;
          is_banned: boolean;
          last_seen: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name?: string | null;
          age?: number | null;
          bio?: string | null;
          photo_url?: string | null;
          status?: 'resident' | 'frequent' | 'vacation' | null;
          availability?: 'weekend' | 'week' | 'summer' | 'year' | null;
          interests?: string[] | null;
          instagram?: string | null;
          linkedin?: string | null;
          is_admin?: boolean;
          is_banned?: boolean;
          last_seen?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          content: string;
          read: boolean;
          attachment_url: string | null;
          attachment_type: 'audio' | 'image' | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          receiver_id: string;
          content: string;
          read?: boolean;
          attachment_url?: string | null;
          attachment_type?: 'audio' | 'image' | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
        Relationships: [];
      };
      chat_groups: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          emoji: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          emoji?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['chat_groups']['Insert']>;
        Relationships: [];
      };
      chat_group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: Partial<Database['public']['Tables']['chat_group_members']['Insert']>;
        Relationships: [];
      };
      chat_group_messages: {
        Row: {
          id: string;
          group_id: string;
          sender_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          sender_id: string;
          content: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['chat_group_messages']['Insert']>;
        Relationships: [];
      };
      salon_messages: {
        Row: {
          id: string;
          salon: string;
          user_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          salon: string;
          user_id: string;
          content: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['salon_messages']['Insert']>;
        Relationships: [];
      };
      forum_posts: {
        Row: {
          id: string;
          author_id: string;
          content: string;
          tag: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          content: string;
          tag?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['forum_posts']['Insert']>;
        Relationships: [];
      };
      forum_likes: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['forum_likes']['Insert']>;
        Relationships: [];
      };
      forum_comments: {
        Row: {
          id: string;
          post_id: string;
          author_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          author_id: string;
          content: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['forum_comments']['Insert']>;
        Relationships: [];
      };
      job_offers: {
        Row: {
          id: string;
          author_id: string;
          title: string;
          description: string | null;
          location: string | null;
          date: string | null;
          pay: string | null;
          category: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          title: string;
          description?: string | null;
          location?: string | null;
          date?: string | null;
          pay?: string | null;
          category?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['job_offers']['Insert']>;
        Relationships: [];
      };
      job_requests: {
        Row: {
          id: string;
          author_id: string;
          title: string;
          description: string | null;
          availability: string | null;
          category: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          title: string;
          description?: string | null;
          availability?: string | null;
          category?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['job_requests']['Insert']>;
        Relationships: [];
      };
      activities: {
        Row: {
          id: string;
          author_id: string;
          title: string;
          description: string | null;
          category: string | null;
          location: string | null;
          latitude: number | null;
          longitude: number | null;
          activity_date: string | null;
          activity_time: string | null;
          min_age: number | null;
          max_participants: number | null;
          photo_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          title: string;
          description?: string | null;
          category?: string | null;
          location?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          activity_date?: string | null;
          activity_time?: string | null;
          min_age?: number | null;
          max_participants?: number | null;
          photo_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['activities']['Insert']>;
        Relationships: [];
      };
      activity_participants: {
        Row: {
          id: string;
          activity_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          activity_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: Partial<Database['public']['Tables']['activity_participants']['Insert']>;
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: 'profile' | 'message' | 'group_message' | 'salon_message' | 'forum_post' | 'forum_comment' | 'job_offer' | 'job_request' | 'activity';
          target_id: string;
          target_user_id: string | null;
          reason: 'spam' | 'harcelement' | 'contenu_inapproprie' | 'arnaque' | 'faux_profil' | 'autre';
          details: string | null;
          status: 'pending' | 'reviewed' | 'dismissed';
          created_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          target_type: 'profile' | 'message' | 'group_message' | 'salon_message' | 'forum_post' | 'forum_comment' | 'job_offer' | 'job_request' | 'activity';
          target_id: string;
          target_user_id?: string | null;
          reason: 'spam' | 'harcelement' | 'contenu_inapproprie' | 'arnaque' | 'faux_profil' | 'autre';
          details?: string | null;
          status?: 'pending' | 'reviewed' | 'dismissed';
          created_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
        Update: Partial<Database['public']['Tables']['reports']['Insert']>;
        Relationships: [];
      };
      blocked_users: {
        Row: {
          id: string;
          blocker_id: string;
          blocked_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          blocker_id: string;
          blocked_id: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['blocked_users']['Insert']>;
        Relationships: [];
      };
      message_reactions: {
        Row: {
          id: string;
          message_id: string;
          user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          user_id: string;
          emoji: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['message_reactions']['Insert']>;
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['push_subscriptions']['Insert']>;
        Relationships: [];
      };
    };
    Views: {
      site_stats: {
        Row: {
          total_members: number;
          available_today: number;
          total_discussions: number;
          total_services: number;
          total_activities: number;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
