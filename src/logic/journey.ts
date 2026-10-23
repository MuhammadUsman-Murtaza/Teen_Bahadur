// NEW FILE: src/logic/journey.ts  (pure logic, no UI, no AI, no network)
import routesData from '../../data/Routes.json';
import { CATCH_BUFFER_MINUTES, ROUTES, findRoute, getRouteStopTimes, parseTime, formatTime, stopPosition, TimeLabel } from './engine';

export interface Quote { stopId: string; rs: number; minutes: number }
export interface JourneyInput {
  routeNumber: string; boardingStopId: string; nowMinutes: number; quote?: Quote | null;
}
export interface JourneyOption {
  id: string; kind: 'wait' | 'chase' | 'hop';
  routeNumber: string; stopId: string; stopName: string;
  passesAt: string; label: TimeLabel;
  maxMinutesToReach: number;
  verdict: 'feasible' | 'too_late' | 'needs_quote';
  costRs: number | null; note: string;
}
export interface JourneyResult { options: JourneyOption[]; reason: string | null }

const stopNames: Record<string, string> = {};
for (const s of ((routesData as any).stops || [])) stopNames[s.id] = s.canonical_name;
export function stopName(id: string) { return stopNames[id] || id; }

export function getJourneyOptions(i: JourneyInput): JourneyResult {
  const route = findRoute(i.routeNumber);
  if (!route) return { options: [], reason: 'No supported option found in current data (route unknown).' };
  const times = getRouteStopTimes(route);
  const myPos = stopPosition(route, i.boardingStopId);
  if (!myPos) return { options: [], reason: 'Your stop is not on this route in the data.' };
  const mine = times[myPos - 1];
  const options: JourneyOption[] = [];

  const judge = (stopId: string, at: number): Pick<JourneyOption, 'maxMinutesToReach' | 'verdict' | 'costRs' | 'note'> => {
    const slack = at - i.nowMinutes - CATCH_BUFFER_MINUTES;
    const q = i.quote && i.quote.stopId === stopId ? i.quote : null;
    if (!q) return { maxMinutesToReach: slack, verdict: slack > 0 ? 'needs_quote' : 'too_late', costRs: null,
      note: slack > 0 ? `You must reach this stop within ${slack} min. Enter a ride quote for it to check.` : 'Already passed or too close.' };
    const ok = q.minutes <= slack;
    return { maxMinutesToReach: slack, verdict: ok ? 'feasible' : 'too_late', costRs: q.rs,
      note: ok ? `Your quote (${q.minutes} min, Rs ${q.rs}) fits with ${slack - q.minutes} min spare.` : `Your quote of ${q.minutes} min is ${q.minutes - slack} min too slow.` };
  };

  if (i.nowMinutes + CATCH_BUFFER_MINUTES <= mine.minutes) {
    options.push({ id: 'wait', kind: 'wait', routeNumber: route.number, stopId: mine.stopId, stopName: mine.name,
      passesAt: mine.time, label: mine.label, maxMinutesToReach: mine.minutes - i.nowMinutes, verdict: 'feasible', costRs: 0,
      note: 'Scheduled departure is still ahead. Be at the stop early; real arrival is unknown.' });
  }
  for (let k = myPos + 1; k <= times.length; k++) {
    const t = times[k - 1];
    options.push({ id: `chase-${t.stopId}`, kind: 'chase', routeNumber: route.number, stopId: t.stopId, stopName: t.name,
      passesAt: t.time, label: t.label, ...judge(t.stopId, t.minutes) });
  }
  const mineStops = new Set(route.stops.map((s) => s.stop_id));
  for (const r of ROUTES) {
    if (r.number === route.number) continue;
    for (const t of getRouteStopTimes(r)) {
      if (!mineStops.has(t.stopId)) continue;
      const jr = judge(t.stopId, t.minutes);
      if (jr.verdict === 'too_late') continue;
      options.push({ id: `hop-${r.number}-${t.stopId}`, kind: 'hop', routeNumber: r.number, stopId: t.stopId, stopName: t.name,
        passesAt: t.time, label: t.label, ...jr, note: `Hop on Route ${r.number}. ` + jr.note });
    }
  }
  const rank = { feasible: 0, needs_quote: 1, too_late: 2 } as const;
  const visible = options.filter((o) => o.verdict !== 'too_late' || o.kind === 'chase')
    .sort((a, b) => rank[a.verdict] - rank[b.verdict] || (parseTime(a.passesAt)! - parseTime(b.passesAt)!)).slice(0, 8);
  const anyOk = visible.some((o) => o.verdict !== 'too_late');
  return { options: visible, reason: anyOk ? null : 'No catchable option in current data. Try a later time or a faster ride quote.' };
}

export interface Report { route_number: string; stop_id: string; status: 'seen' | 'departed' | 'not_here'; created_at: string }
export function upstreamEta(routeNumber: string, myStopId: string, reports: Report[], nowMs = Date.now(), freshMin = 20, band = 4) {
  const route = findRoute(routeNumber); if (!route) return null;
  const times = getRouteStopTimes(route); const myPos = stopPosition(route, myStopId);
  if (!myPos) return null;
  const fresh = reports.filter((r) => r.route_number === routeNumber && r.status !== 'not_here' &&
      (nowMs - new Date(r.created_at).getTime()) / 60000 <= freshMin && stopPosition(route, r.stop_id) > 0 && stopPosition(route, r.stop_id) < myPos)
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  if (!fresh.length) return null;
  const r = fresh[0]; const gap = times[myPos - 1].minutes - times[stopPosition(route, r.stop_id) - 1].minutes;
  const d = new Date(r.created_at); const base = d.getHours() * 60 + d.getMinutes() + gap;
  return { label: 'Estimated' as TimeLabel, from: formatTime(base - band), to: formatTime(base + band),
    text: `Reported at ${stopName(r.stop_id)}. Estimated ${formatTime(base - band)} to ${formatTime(base + band)} at your stop (not live).` };
}