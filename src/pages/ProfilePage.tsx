import React, { useEffect, useState } from 'react';
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

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading, error: profileError, setProfile } = useProfile();
  const [username, setUsername] = useState('');
  const [points, setPoints] = useState<PointRow[]>([]);
  const [stops, setStops] = useState<StopRow[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<number | ''>('');
  const [selectedStop, setSelectedStop] = useState<number | ''>('');
  const [displayPointNumber, setDisplayPointNumber] = useState<string>('');
  const [displayStopName, setDisplayStopName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !profile) return;

    async function load() {
      try {
        const supabase = getSupabaseClient();

        const [{ data: pointsData, error: pointsError }, { data: pointRow, error: pointError }, { data: stopRow, error: stopError }] = await Promise.all([
          supabase.from('points').select('id, number').order('number', { ascending: true }),
          supabase.from('points').select('id, number').eq('id', profile.point_id).single(),
          supabase.from('stops').select('id, name').eq('id', profile.stop_id).single(),
        ] as const);

        if (pointsError) throw pointsError;
        if (pointError) throw pointError;
        if (stopError) throw stopError;

        setPoints(pointsData as any);
        setUsername(profile.name);
        setSelectedPoint(profile.point_id);
        setSelectedStop(profile.stop_id);
        setDisplayPointNumber((pointRow as any).number);
        setDisplayStopName((stopRow as any).name);

        // Load stops for this point
        const { data: pointStops, error: psError } = await supabase
          .from('point_stops')
          .select('stop_id, stop:stops(id, name)')
          .eq('point_id', profile.point_id)
          .order('stop_order', { ascending: true });
        if (psError) throw psError;
        const stopsList: StopRow[] = (pointStops as any).map((row: any) => row.stop);
        setStops(stopsList);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || 'Failed to load profile details');
      }
    }

    void load();
  }, [user?.id, profile?.id]);

  async function handlePointChange(pointId: number) {
    setSelectedPoint(pointId);
    setSelectedStop('');
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const [{ data: pointRow, error: pointError }, { data: pointStops, error: psError }] =
        await Promise.all([
          supabase.from('points').select('id, number').eq('id', pointId).single(),
          supabase
            .from('point_stops')
            .select('stop_id, stop:stops(id, name)')
            .eq('point_id', pointId)
            .order('stop_order', { ascending: true }),
        ] as const);
      if (pointError) throw pointError;
      if (psError) throw psError;
      setDisplayPointNumber((pointRow as any).number);
      const stopsList: StopRow[] = (pointStops as any).map((row: any) => row.stop);
      setStops(stopsList);
      setDisplayStopName('');
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Failed to load stops for point');
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !profile) return;

    setError(null);
    if (!username || !selectedPoint || !selectedStop) {
      setError('Please fill in all fields.');
      return;
    }

    setSaving(true);
    try {
      const supabase = getSupabaseClient();

      // Verify stop belongs to point
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

      const { data, error } = await supabase
        .from('profiles')
        .update({ name: username, point_id: selectedPoint, stop_id: selectedStop })
        .eq('id', user.id)
        .select('id, name, point_id, stop_id')
        .single();
      if (error) throw error;
      setProfile(data as any);

      // Refresh display labels
      const [{ data: pointRow }, { data: stopRow }] = await Promise.all([
        supabase.from('points').select('id, number').eq('id', selectedPoint).single(),
        supabase.from('stops').select('id, name').eq('id', selectedStop).single(),
      ] as const);
      setDisplayPointNumber((pointRow as any).number);
      setDisplayStopName((stopRow as any).name);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return <div className="card">Please log in to view your profile.</div>;
  }

  if (profileLoading && !profile) {
    return <div className="loading">Loading your profile…</div>;
  }

  if (!profile) {
    return (
      <div className="card">
        <p className="page-intro">You have not set up your OnRoute profile yet.</p>
        <p className="helper">Use the onboarding flow to pick your point and stop.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h1 className="page-title">Your OnRoute profile</h1>
      {profileError && <div className="error">{profileError}</div>}
      {error && <div className="error">{error}</div>}
      <p className="helper" style={{ marginBottom: '0.75rem' }}>
        Email: <strong>{user.email}</strong>
      </p>
      <p className="helper" style={{ marginBottom: '0.75rem' }}>
        Current point: <strong>{displayPointNumber ? `Point ${displayPointNumber}` : '—'}</strong>
        <br />
        Boarding stop: <strong>{displayStopName || '—'}</strong>
      </p>

      <form onSubmit={handleSave}>
        <div className="field">
          <label className="label" htmlFor="username">Username</label>
          <input
            id="username"
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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
        </div>
        <button className="button" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
};

export default ProfilePage;
