import type { CandidateSearchApplication } from "@/lib/api/recruitment-candidate-search";

export interface PostingStageLine {
  /** Candidacy uuid. */
  id: string;
  jobId: string;
  title: string;
  stageLabel: string | null;
  stageKey: string | null;
}

interface ResolvedLine extends PostingStageLine {
  stageId: number | null;
}

function toResolvedLines(
  applications: CandidateSearchApplication[],
  postingLabels: Record<string, string>,
  stageLabels: Record<number, { label: string; key: string }>
): ResolvedLine[] {
  const lines: ResolvedLine[] = [];
  for (const app of applications) {
    const title = postingLabels[app.jobId];
    if (!title) continue;
    const stage =
      app.stageId == null ? null : (stageLabels[app.stageId] ?? null);
    lines.push({
      id: app.id || app.jobId,
      jobId: app.jobId,
      stageId: app.stageId,
      title,
      stageLabel: stage?.label ?? null,
      stageKey: stage?.key ?? null,
    });
  }
  return lines;
}

/** Which application lines to show — filters hide non-matching pairs, not the row. */
export function resolveVisiblePostingStages(
  applications: CandidateSearchApplication[],
  postingLabels: Record<string, string>,
  stageLabels: Record<number, { label: string; key: string }>,
  filterJobIds: string[],
  filterStageIds: number[]
): PostingStageLine[] {
  const lines = toResolvedLines(applications, postingLabels, stageLabels);
  const hasJobFilter = filterJobIds.length > 0;
  const hasStageFilter = filterStageIds.length > 0;

  if (!hasJobFilter && !hasStageFilter) return lines;

  const matchesJob = (line: ResolvedLine) =>
    !hasJobFilter || filterJobIds.includes(line.jobId);
  const matchesStage = (line: ResolvedLine) =>
    !hasStageFilter ||
    (line.stageId != null && filterStageIds.includes(line.stageId));

  if (hasJobFilter && hasStageFilter) {
    const both = lines.filter((line) => matchesJob(line) && matchesStage(line));
    if (both.length > 0) return both;
    return lines.filter((line) => matchesJob(line) || matchesStage(line));
  }

  if (hasJobFilter) return lines.filter(matchesJob);
  return lines.filter(matchesStage);
}
