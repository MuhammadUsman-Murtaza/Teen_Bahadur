import routesData from '../../data/Routes.json';
import { DEMO_MINUTES_PER_STOP } from './demoTiming';

export interface RouteStop {
  order: number;
  stop_id: string;
  raw_name: string;
}

export interface Route {
  number: string;
  first_stop_departure: string; // "HH:MM"
  stops: RouteStop[];
}

interface RoutesFile {
  routes: Route[];
  config: { catch_buffer_minutes: number };
}

const data = routesData as unknown as RoutesFile;

export const ROUTES: Route[] = data.routes;
export const CATCH_BUFFER_MINUTES: number = data.config.catch_buffer_minutes;

export type TimeLabel = 'Scheduled' | 'Estimated' | 'Entered by you' | 'Unknown' | 'DEMO DATA';

export interface StopTime {
  order: number;
  stopId: string;
  name: string;
  minutes: number; // minutes since midnight (may exceed 1439 if past midnight)
  time: string; // "HH:MM"
  label: TimeLabel;
}

/** "HH:MM" -> minutes since midnight, or null if invalid. */
export function parseTime(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** minutes since midnight -> "HH:MM" (wraps at 24h). */
export function formatTime(minutes: number): string {
  const total = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h = String(Math.floor(total / 60)).padStart(2, '0');
  const m = String(total % 60).padStart(2, '0');
  return `${h}:${m}`;
}

/** Route lookup by exact number string (matches points.number). */
export function findRoute(number: string): Route | undefined {
  return ROUTES.find((r) => r.number === number);
}

/**
 * Time at the k-th stop (1-based):
 * first_stop_departure + (k-1) * DEMO_MINUTES_PER_STOP.
 * Stop 1 is 'Scheduled'; every later stop is 'DEMO DATA'.
 */
export function timeAtStopIndex(route: Route, k: number): StopTime | null {
  const stop = route.stops[k - 1];
  const first = parseTime(route.first_stop_departure);
  if (!stop || first === null) return null;
  const minutes = first + (k - 1) * DEMO_MINUTES_PER_STOP;
  return {
    order: stop.order,
    stopId: stop.stop_id,
    name: stop.raw_name,
    minutes,
    time: formatTime(minutes),
    label: k === 1 ? 'Scheduled' : 'DEMO DATA',
  };
}

/** All stops of a route with their (simulated) times. */
export function getRouteStopTimes(route: Route): StopTime[] {
  const out: StopTime[] = [];
  for (let k = 1; k <= route.stops.length; k++) {
    const t = timeAtStopIndex(route, k);
    if (t) out.push(t);
  }
  return out;
}

/** 1-based position of a stop_id on a route, or 0 if absent. */
export function stopPosition(route: Route, stopId: string): number {
  const i = route.stops.findIndex((s) => s.stop_id === stopId);
  return i + 1;
}
