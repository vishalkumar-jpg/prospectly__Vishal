import { BadRequestException } from "@nestjs/common";
import { toUTC } from "utils/dayjs";
import { RECRUITMENT_JOBS_MESSAGES } from "../recruitment-jobs.constants";
import { UpdateRecruitmentJobDto } from "../recruitment-jobs.dto";

export function normalizeSkillList(
  skills: string[] | null | undefined
): string[] {
  return (skills ?? []).map((s) => s.trim().toLowerCase()).filter(Boolean);
}

export function skillListsEqual(
  a: string[] | null | undefined,
  b: string[] | null | undefined
): boolean {
  const left = normalizeSkillList(a).sort();
  const right = normalizeSkillList(b).sort();
  if (left.length !== right.length) return false;
  return left.every((skill, i) => skill === right[i]);
}

export function assertValidSalaryBounds(dto: UpdateRecruitmentJobDto): void {
  const hasMin = dto.salaryRangeMin !== undefined;
  const hasMax = dto.salaryRangeMax !== undefined;
  if (!hasMin && !hasMax) return;

  // One-sided patches cannot be validated against the other bound — reject.
  if (hasMin !== hasMax) {
    throw new BadRequestException(
      RECRUITMENT_JOBS_MESSAGES.ERROR.SALARY_RANGE_INCOMPLETE
    );
  }

  const min = dto.salaryRangeMin ?? 0;
  const max = dto.salaryRangeMax ?? 0;
  const minPositive = min > 0;
  const maxPositive = max > 0;
  if (minPositive !== maxPositive) {
    throw new BadRequestException(
      RECRUITMENT_JOBS_MESSAGES.ERROR.SALARY_RANGE_INCOMPLETE
    );
  }
  if (minPositive && maxPositive && max <= min) {
    throw new BadRequestException(
      RECRUITMENT_JOBS_MESSAGES.ERROR.SALARY_RANGE_INVALID
    );
  }
}

export function buildSalaryPatch(
  dto: UpdateRecruitmentJobDto,
  userId: string
): Record<string, unknown> | null {
  const patch: Record<string, unknown> = {
    updatedAt: toUTC(),
    updatedBy: userId,
  };
  let touched = false;

  if (dto.salaryRangeMin !== undefined) {
    patch.salaryRangeMin = String(dto.salaryRangeMin);
    touched = true;
  }
  if (dto.salaryRangeMax !== undefined) {
    patch.salaryRangeMax = String(dto.salaryRangeMax);
    touched = true;
  }
  if (dto.salaryCurrency !== undefined) {
    patch.salaryCurrency = dto.salaryCurrency;
    touched = true;
  }
  if (dto.salaryPeriod !== undefined) {
    patch.salaryPeriod = dto.salaryPeriod;
    touched = true;
  }
  if (dto.salaryRangeNotes !== undefined) {
    patch.salaryRangeNotes = dto.salaryRangeNotes || null;
    touched = true;
  }

  return touched ? patch : null;
}

export function shouldRematchQualifiedPool(
  existing: {
    title: string;
    experienceLevel: string | null;
    requiredSkills: unknown;
    preferredSkills: unknown;
  },
  dto: UpdateRecruitmentJobDto
): boolean {
  if (dto.title !== undefined && dto.title.trim() !== existing.title.trim()) {
    return true;
  }

  if (
    dto.experienceLevel !== undefined &&
    dto.experienceLevel.trim() !== (existing.experienceLevel ?? "").trim()
  ) {
    return true;
  }

  if (
    dto.requiredSkills !== undefined &&
    !skillListsEqual(
      existing.requiredSkills as string[] | null,
      dto.requiredSkills
    )
  ) {
    return true;
  }

  if (
    dto.preferredSkills !== undefined &&
    !skillListsEqual(
      existing.preferredSkills as string[] | null,
      dto.preferredSkills
    )
  ) {
    return true;
  }

  return false;
}
