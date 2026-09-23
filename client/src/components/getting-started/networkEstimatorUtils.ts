/** Matches getting_started_v4.html updateEstimate() */

export const AVG_PAYOUT = 75;
export const MIN_CONNECTIONS = 50;
export const MAX_CONNECTIONS = 5000;
export const SLIDER_STEP = 50;
export const BUTTON_STEP = 100;

export function estimateYearlyUsd(connections: number): number {
  return Math.round(connections * AVG_PAYOUT);
}

export function estimateMatchable(connections: number): number {
  const r = 0.08 + (connections / MAX_CONNECTIONS) * 0.06;
  return Math.round(connections * r);
}

export function sliderFillPercent(connections: number): number {
  return ((connections - MIN_CONNECTIONS) / (MAX_CONNECTIONS - MIN_CONNECTIONS)) * 100;
}

export function clampConnections(value: number): number {
  return Math.min(
    MAX_CONNECTIONS,
    Math.max(MIN_CONNECTIONS, Math.round(value / SLIDER_STEP) * SLIDER_STEP)
  );
}

export function formatHeroAmountPlus(connections: number): string {
  return `$${estimateYearlyUsd(connections).toLocaleString()}+`;
}
