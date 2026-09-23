export interface BackfillEducationLevelJobData {
  /**
   * Recompute rows that already have a level, not just the empty ones. What a
   * change to the normaliser's degree patterns calls for.
   */
  force: boolean;
}
