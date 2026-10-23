// NEW FILE: src/pages/JourneyPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useProfile } from '../modules/profile/hooks';
import { getSupabaseClient } from '../lib/supabaseClient';
import { findRoute, formatTime, parseTime } from '../logic/engine';
import { getJourneyOptions, upstreamEta, stopName, Report } from '../logic/journey';

const JourneyPage: React.FC = () => {
  const { profile } = useProfile();
  const [routeNo, setRouteNo] = useState<string>('');
  const [stopId, setStopId] = useState<string>('');
  const now = new Date();
  const [clock, setClock] = useState(formatTime(now.getHours() * 60 + now.getMinutes()));
  const [qStop, setQStop] = useState('');
  const [qRs, setQRs] = useState('');
  const [qMin, setQMin] = useState('');
  const [reports, setReports] = useState<Report[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [ai, setAi] = useState<{ text: string; source: string; checked: boolean } | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const sb = getSupabaseClient();
      const [p, s] = await Promise.all([
        sb.from('points').select('number').eq('id', profile.point_id).maybeSingle(),
        sb.from('stops').select('slug').eq('id', profile.stop_id).maybeSingle(),
      ]);
      setRouteNo(String((p.data as any)?.number ?? ''));
      setStopId(String((s.data as any)?.slug ?? ''));
    })();
  }, [profile?.point_id, profile?.stop_id]);

  async function loadReports() {
    try {
      const { data } = await getSupabaseClient().from('reports').select('route_number, stop_id, status, created_at')
        .gte('created_at', new Date(Date.now() - 60 * 60000).toISOString()).order('created_at', { ascending: false }).limit(50);
      setReports((data as Report[]) || []);
    } catch { setReports([]); }
  }
  useEffect(() => { void loadReports(); const t = setInterval(loadReports, 30000); return () => clearInterval(t); }, []);

  const route = routeNo ? findRoute(routeNo) : undefined;
  const result = useMemo(() => {
    if (!route || !stopId) return null;
    const m = parseTime(clock) ?? 0; const rs = Number(qRs); const mins = Number(qMin);
    return getJourneyOptions({ routeNumber: routeNo, boardingStopId: stopId, nowMinutes: m,
      quote: qStop && rs >= 0 && mins > 0 ? { stopId: qStop, rs, minutes: mins } : null });
  }, [route, routeNo, stopId, clock, qStop, qRs, qMin]);
  const eta = useMemo(() => (routeNo && stopId ? upstreamEta(routeNo, stopId, reports) : null), [routeNo, stopId, reports]);

  async function report(status: 'seen' | 'departed' | 'not_here') {
    setMsg(null);
    const { error } = await getSupabaseClient().from('reports').insert({ route_number: routeNo, stop_id: stopId, status });
    setMsg(error ? error.message : 'Thanks! Report sent.');
    void loadReports();
  }
  async function explain() {
    setAiBusy(true); setAi(null);
    const { data, error } = await getSupabaseClient().functions.invoke('explain', { body: { options: result?.options ?? [], eta } });
setAi(error ? { text: 'AI unavailable: ' + error.message, source: 'rule-based', checked: false } : { ...data, text: data.text + (data.error ? ` [${data.error}]` : '') });
    setAiBusy(false);
  }
  const lastHere = reports.find((r) => r.route_number === routeNo);
  const ago = lastHere ? Math.round((Date.now() - new Date(lastHere.created_at).getTime()) / 60000) : 0;

  return (
    <div>
      <div className="card" style={{ background: '#facc15', color: '#422006', fontWeight: 600, fontSize: '0.85rem' }}>
        DEMO DATA: stop times are simulated. Nothing here is live tracking.
      </div>
      <div className="card" style={{ marginTop: '1rem' }}>
        <h1 className="page-title">Missed my point?</h1>
        {route ? <p>Route {routeNo} at <strong>{stopName(stopId)}</strong></p> : <p className="helper">Finish onboarding first.</p>}
        <label className="label">Simulate current time (HH:MM)</label>
        <input className="input" value={clock} onChange={(e) => setClock(e.target.value)} />
        <label className="label">Optional: Bykea/inDrive/rickshaw quote to reach a stop</label>
        <select className="input" value={qStop} onChange={(e) => setQStop(e.target.value)}>
          <option value="">No quote</option>
          {route?.stops.map((s) => <option key={s.stop_id} value={s.stop_id}>{s.raw_name}</option>)}
        </select>
        <input className="input" placeholder="Price in Rs" inputMode="numeric" value={qRs} onChange={(e) => setQRs(e.target.value)} />
        <input className="input" placeholder="Ride minutes" inputMode="numeric" value={qMin} onChange={(e) => setQMin(e.target.value)} />
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <h2 className="label">One-tap report (helps everyone on Route {routeNo})</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="button" onClick={() => report('seen')}>Point seen here</button>
          <button className="button secondary" onClick={() => report('departed')}>Point departed</button>
          <button className="button secondary" onClick={() => report('not_here')}>Point not here</button>
        </div>
        {msg && <div className="helper">{msg}</div>}
        <p className="helper">
          {lastHere ? `Last report on this route: ${lastHere.status.replace('_', ' ')} at ${stopName(lastHere.stop_id)}, ${ago} min ago${ago > 20 ? ' (stale)' : ''}.` : 'No reports yet. The app works fine without them.'}
        </p>
        {eta ? <p><strong>{eta.text}</strong></p> : <p className="helper">Live arrival unknown (no fresh upstream report).</p>}
      </div>

      {result?.options.map((o) => (
        <div className="card" key={o.id} style={{ marginTop: '1rem', opacity: o.verdict === 'too_late' ? 0.5 : 1 }}>
          <strong>{o.kind === 'wait' ? 'Wait at your stop' : o.kind === 'chase' ? 'Catch the same point at' : `Hop on Route ${o.routeNumber} at`} {o.stopName}</strong>
          <div>Passes ~{o.passesAt} <span className="helper">[{o.label}]</span></div>
          <div className="helper">{o.verdict === 'feasible' ? 'Feasible' : o.verdict === 'needs_quote' ? 'Needs a quote' : 'Too late'}{o.costRs !== null ? ` · Rs ${o.costRs}` : ''}</div>
          <div className="helper">{o.note}</div>
        </div>
      ))}
      {result?.reason && <div className="card" style={{ marginTop: '1rem' }}><p className="helper">{result.reason}</p></div>}

      {result && result.options.length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <button className="button" onClick={explain} disabled={aiBusy}>{aiBusy ? 'Thinking…' : 'Explain these options'}</button>
          {ai && <p><strong>{ai.source === 'ai' ? 'AI explanation (checked against data)' : 'Rule-based summary'}</strong><br />{ai.text}</p>}
        </div>
      )}
    </div>
  );
};
export default JourneyPage;