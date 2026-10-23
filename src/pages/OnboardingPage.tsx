import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '../lib/supabaseClient';
import { useAuth } from '../modules/auth/AuthContext';
import { useProfile } from '../modules/profile/hooks';

interface PointRow {
  id: number;
  number: string;
}

interface StopRow {
  id: number;
  name: string;
}

const OnboardingPage: React.FC = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading, setProfile } = useProfile();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [points, setPoints] = useState<PointRow[]>([]);
  const [stops, setStops] = useState<StopRow[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<number | ''>('');
  const [selectedStop, setSelectedStop] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;

    async function load() {
      setLoading(true);
      try {
        const supabase = getSupabaseClient();

        // Load all points
        const { data: pointsData, error: pointsError } = await supabase
          .from('points')
          .select('id, number')
          .order('number', { ascending: true });
        if (pointsError) throw pointsError;
        setPoints(pointsData as any);

        if (profile) {
          setUsername(profile.name);
          setSelectedPoint(profile.point_id);

          // Load stops for existing point
          const { data: pointStops, error: psError } = await supabase
            .from('point_stops')
            .select('stop_id, stop:stops(id, name)')
            .eq('point_id', profile.point_id)
            .order('stop_order', { ascending: true });
          if (psError) throw psError;
          const stopsList: StopRow[] = (pointStops as any).map((row: any) => row.stop);
          setStops(stopsList);
          setSelectedStop(profile.stop_id);
        }
      } catch (e: any) {
        console.error(e);
        setError(e?.message || 'Failed to load onboarding data');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [user?.id, profileLoading]);

  async function handlePointChange(pointId: number) {
    setSelectedPoint(pointId);
    setSelectedStop('');
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('point_stops')
        .select('stop_id, stop:stops(id, name)')
        .eq('point_id', pointId)
        .order('stop_order', { ascending: true });
      if (error) throw error;
      const stopsList: StopRow[] = (data as any).map((row: any) => row.stop);
      setStops(stopsList);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Failed to load stops for point');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setError(null);
    if (!username || !selectedPoint || !selectedStop) {
      setError('Please choose a username, point, and boarding stop.');
      return;
    }

    setSaving(true);
    try {
      const supabase = getSupabaseClient();

      // Verify that selected stop belongs to the selected point
      const { data: match, error: matchError } = await supabase
        .from('point_stops')
        .select('point_id, stop_id')
        .eq('point_id', selectedPoint)
        .eq('stop_id', selectedStop)
        .maybeSingle();
      if (matchError) throw matchError;
      if (!match) {
        setError('Selected stop is not valid for the chosen point.');
        return;
      }

      const payload = {
        id: user.id,
        name: username,
        point_id: selectedPoint,
        stop_id: selectedStop,
      };

      const { data, error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' })
        .select('id, name, point_id, stop_id')
        .single();
      if (error) throw error;
      setProfile(data as any);
      navigate('/app');
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Failed to save your profile');
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return <div className="card">Please log in to set up your profile.</div>;
  }

  if (loading) {
    return <div className="loading">Loading your options…</div>;
  }

  return (
    <div className="card">
      <h1 className="page-title">Set up your OnRoute profile</h1>
      <p className="page-intro">
        Choose the NED point and boarding stop you usually use. You can change this later in
        your profile.
      </p>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label className="label" htmlFor="username">Username</label>
          <input
            id="username"
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="point">Point</label>
          <select
            id="point"
            className="select"
            value={selectedPoint}
            onChange={(e) => handlePointChange(Number(e.target.value))}
          >
            <option value="">Select your point</option>
            {points.map((p) => (
              <option key={p.id} value={p.id}>
                Point {p.number}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="stop">Boarding stop</label>
          <select
            id="stop"
            className="select"
            value={selectedStop}
            onChange={(e) => setSelectedStop(Number(e.target.value))}
            disabled={!selectedPoint || stops.length === 0}
          >
            <option value="">Select your stop</option>
            {stops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <p className="helper">
            Only stops served by your chosen point are shown, in route order.
          </p>
        </div>
        <button className="button" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save and continue'}
        </button>
      </form>
    </div>
  );
};

export default OnboardingPage;
