export type MetricDirection = "up" | "down" | "flat";

export type MetricWithChange = {
  value: number;
  changePct: number | null;
  direction: MetricDirection;
};

export function buildMetricWithChange(
  current: number,
  previous: number
): MetricWithChange {
  if (previous === 0) {
    return {
      value: current,
      changePct: null,
      direction: current > 0 ? "up" : "flat",
    };
  }

  const changePct = Math.round(((current - previous) / previous) * 100);
  return {
    value: current,
    changePct,
    // eslint-disable-next-line no-nested-ternary
    direction: changePct > 0 ? "up" : changePct < 0 ? "down" : "flat",
  };
}
