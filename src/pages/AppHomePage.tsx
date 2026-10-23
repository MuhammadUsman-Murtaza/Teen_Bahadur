import React, { useEffect, useState } from 'react';
import { useProfile } from '../modules/profile/hooks';
import { getSupabaseClient } from '../lib/supabaseClient';
import { findRoute, getRouteStopTimes, stopPosition } from '../logic/engine';

interface PointInfo {
  number: string;
}
interface StopInfo {
  slug: string;
  name: string;
}

const badgeStyle = (demo: boolean): React.CSSProperties => ({
  fontSize: '0.65rem',
  padding: '0.1rem 0.4rem',
  borderRadius: 999,
  marginLeft: '0.4rem',
  background: demo ? '#facc15' : '#1f2937',
  color: demo ? '#422006' : '#e5e7eb',
  fontWeight: 600,
});

const AppHomePage: React.FC = () => {
  const { profile, loading } = useProfile();
  const [point, setPoint] = useState<PointInfo | null>(null);
  const [stop, setStop] = useState<StopInfo | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    let mounted = true;
    (async () => {
      try {
        const supabase = getSupabaseClient();
        const [p, s] = await Promise.all([
          supabase.from('points').select('number').eq('id', profile.point_id).maybeSingle(),
          supabase.from('stops').select('slug, name').eq('id', profile.stop_id).maybeSingle(),
        ]);
        if (!mounted) return;
        if (p.error) throw new Error(p.error.message);
        if (s.error) throw new Error(s.error.message);
        setPoint(p.data ? { number: String((p.data as any).number) } : null);
        setStop(s.data as StopInfo | null);
      } catch (e: any) {
        if (mounted) setLookupError(e?.message || 'Failed to load point and stop');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [profile?.point_id, profile?.stop_id]);

  const route = point ? findRoute(point.number) : undefined;
  const stopTimes = route ? getRouteStopTimes(route) : [];
  const myPos = route && stop ? stopPosition(route, stop.slug) : 0;

  return (
    <div>
      <div
        style={{
          background: '#facc15',
          color: '#422006',
          padding: '0.6rem 0.8rem',
          borderRadius: '0.5rem',
          fontWeight: 600,
          fontSize: '0.85rem',
          marginBottom: '0.75rem',
        }}
      >
        DEMO DATA: stop times are simulated, not official.
      </div>

      <div className="card">
        <h1 className="page-title">My point left my stop</h1>
        {loading && <div className="helper">Checking your profile…</div>}
        {lookupError && <div className="error">{lookupError}</div>}
        {!loading && !profile && (
          <p className="helper">
            You have not finished onboarding yet. Use the Profile or Onboarding page to set your
            usual point and stop.
          </p>
        )}
        {profile && point && stop && (
          <p>
            Your point:{' '}
            <strong>
              Route {point.number} at {stop.name}
            </strong>
          </p>
        )}
        {profile && !lookupError && (!point || !stop) && (
          <div className="helper">Loading your point and stop…</div>
        )}
        <p className="helper">Live arrival unknown (no reports yet).</p>
      </div>

      {point && !route && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <p className="helper">No supported option found in current data.</p>
        </div>
      )}

      {route && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h2 className="label" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
            Route {route.number} stops
          </h2>
          <ol style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.9rem' }}>
            {stopTimes.map((t) => (
              <li
                key={t.stopId + t.order}
                style={{
                  marginBottom: '0.4rem',
                  fontWeight: t.order === route.stops[myPos - 1]?.order ? 700 : 400,
                }}
              >
                {t.name} — {t.time}
                <span style={badgeStyle(t.label === 'DEMO DATA')}>{t.label}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};

export default AppHomePage;
