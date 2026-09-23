export const STAGE_HISTORY_NOTE_MAX_LENGTH = 500;

/** recruitment_candidate_stage_history.note is varchar(500). */
export function truncateStageHistoryNote(note: string): string {
  const trimmed = note.trim();
  if (trimmed.length <= STAGE_HISTORY_NOTE_MAX_LENGTH) {
    return trimmed;
  }
  return `${trimmed.slice(0, STAGE_HISTORY_NOTE_MAX_LENGTH - 1)}…`;
}
