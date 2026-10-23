import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useAuth } from '../auth/AuthContext';

export interface ProfileRow {
  id: string;
  name: string;
  point_id: number;
  stop_id: number;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let mounted = true;

    async function load() {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, point_id, stop_id')
          .eq('id', user.id)
          .maybeSingle();
        if (!mounted) return;
        if (error) {
          if (error.code === 'PGRST116') {
            // not found is fine
            setProfile(null);
          } else {
            setError(error.message);
          }
        } else {
          setProfile(data as any);
        }
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load profile');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  return { profile, loading, error, setProfile } as const;
}
