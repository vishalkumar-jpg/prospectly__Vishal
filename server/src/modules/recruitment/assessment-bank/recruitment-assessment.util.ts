import { BadRequestException } from "@nestjs/common";
import type {
  AssessmentOption,
  AssessmentCorrectAnswer,
  RecruitmentJobAssessmentQuestion,
} from "database/schema";
import type {
  AssessmentOptionDto,
  AssessmentCorrectAnswerDto,
} from "./recruitment-assessment-bank.dto";
import {
  DEFAULT_ASSESSMENT_OPTIONS,
  LEGACY_ASSESSMENT_OPTION_ID_MAP,
  MIN_OPTIONS_PER_CHOICE,
  MAX_QUESTIONS_PER_JOB,
  ASSESSMENT_BANK_MESSAGES,
  type AssessmentQuestionType,
} from "./recruitment-assessment-bank.constants";
import { assertNoDuplicateJobQuestionTexts } from "./assessment-question-text.util";

export interface NormalizedAssessmentQuestion {
  questionText: string;
  questionType: AssessmentQuestionType;
  options: AssessmentOption[] | null;
  correctAnswer: AssessmentCorrectAnswer | null;
  points: number | null;
}

/** Map legacy approve/decline (and Yes/No labels) onto canonical yes/no ids. */
export function normalizePhase1OptionId(optionId: string): string {
  const trimmed = optionId.trim();
  const legacy = LEGACY_ASSESSMENT_OPTION_ID_MAP[trimmed.toLowerCase()];
  if (legacy) return legacy;
  if (/^yes$/i.test(trimmed)) return "yes";
  if (/^no$/i.test(trimmed)) return "no";
  return trimmed;
}

/**
 * Phase-1 options always persist as `{ id: "yes"|"no", label: "Yes"|"No" }`.
 * Rewrites legacy approve/decline ids and Approve/Decline labels.
 */
export function normalizeAssessmentOptionLabels(
  options: AssessmentOption[] | null
): AssessmentOption[] | null {
  if (!options?.length) return options;
  return options.map((option) => {
    const id = normalizePhase1OptionId(option.id);
    const labelTrimmed = option.label.trim();

    if (
      id === "yes" ||
      option.id === "approve" ||
      /^approve$/i.test(labelTrimmed) ||
      /^yes$/i.test(labelTrimmed)
    ) {
      return { ...option, id: "yes", label: "Yes" };
    }

    if (
      id === "no" ||
      option.id === "decline" ||
      /^decline$/i.test(labelTrimmed) ||
      /^no$/i.test(labelTrimmed)
    ) {
      return { ...option, id: "no", label: "No" };
    }

    return { ...option, id };
  });
}

/** Remap correctAnswer.optionIds through the same Phase-1 id normalization. */
export function normalizeAssessmentCorrectAnswer(
  correctAnswer: AssessmentCorrectAnswer | null | undefined
): AssessmentCorrectAnswer | null {
  if (!correctAnswer) return null;
  if (correctAnswer.text != null) {
    const text = correctAnswer.text.trim();
    return text ? { text } : null;
  }
  if (!correctAnswer.optionIds?.length) return null;
  return {
    optionIds: correctAnswer.optionIds.map(normalizePhase1OptionId),
  };
}

/**
 * Resolve options for a question. Choice questions with no options get the
 * fixed Yes/No default (Phase 1). Text questions never have options.
 */
function resolveOptions(
  type: AssessmentQuestionType,
  raw?: AssessmentOptionDto[]
): AssessmentOption[] | null {
  if (type === "text") {
    if (raw && raw.length > 0) {
      throw new BadRequestException(
        ASSESSMENT_BANK_MESSAGES.ERROR.TEXT_HAS_OPTIONS
      );
    }
    return null;
  }

  if (!raw || raw.length === 0) {
    return DEFAULT_ASSESSMENT_OPTIONS.map((o) => ({ ...o }));
  }

  if (raw.length < MIN_OPTIONS_PER_CHOICE) {
    throw new BadRequestException(
      ASSESSMENT_BANK_MESSAGES.ERROR.CHOICE_NEEDS_OPTIONS
    );
  }

  return normalizeAssessmentOptionLabels(
    raw.map((o, i) => ({
      id: o.id?.trim() || `opt_${i}`,
      label: o.label,
      orderIndex: o.orderIndex ?? i,
      value: o.value,
    }))
  );
}

/** Validate that a correctAnswer's optionIds all reference real options. */
function resolveCorrectAnswer(
  type: AssessmentQuestionType,
  options: AssessmentOption[] | null,
  raw?: AssessmentCorrectAnswerDto
): AssessmentCorrectAnswer | null {
  if (!raw) return null;

  if (type === "text") {
    const text = raw.text?.trim();
    return text ? { text } : null;
  }

  const optionIds = (raw.optionIds ?? []).map(normalizePhase1OptionId);
  if (optionIds.length === 0) return null;

  const validIds = new Set((options ?? []).map((o) => o.id));
  for (const id of optionIds) {
    if (!validIds.has(id)) {
      throw new BadRequestException(
        ASSESSMENT_BANK_MESSAGES.ERROR.CORRECT_OPTION_UNKNOWN
      );
    }
  }
  return { optionIds };
}

/**
 * Phase-1 default answer key: "Yes" (`id: yes`, or value 1).
 */
function defaultCorrectAnswer(
  options: AssessmentOption[] | null
): AssessmentCorrectAnswer | null {
  if (!options || options.length === 0) return null;
  const yes =
    options.find((o) => o.id === "yes") ?? options.find((o) => o.value === 1);
  return yes ? { optionIds: [yes.id] } : null;
}

/** Normalize a single question's shared fields (used by the bank + jobs). */
export function normalizeAssessmentQuestion(input: {
  questionText: string;
  questionType?: AssessmentQuestionType;
  options?: AssessmentOptionDto[];
  correctAnswer?: AssessmentCorrectAnswerDto;
  points?: number;
}): NormalizedAssessmentQuestion {
  const questionType: AssessmentQuestionType =
    input.questionType ?? "single_choice";
  const options = resolveOptions(questionType, input.options);
  const correctAnswer =
    resolveCorrectAnswer(questionType, options, input.correctAnswer) ??
    (input.correctAnswer === undefined ? defaultCorrectAnswer(options) : null);

  if (questionType !== "text" && !correctAnswer?.optionIds?.length) {
    throw new BadRequestException(
      ASSESSMENT_BANK_MESSAGES.ERROR.CHOICE_NEEDS_CORRECT_ANSWER
    );
  }

  return {
    questionText: input.questionText,
    questionType,
    options,
    correctAnswer,
    points: input.points ?? null,
  };
}

export interface NormalizedJobAssessmentQuestion extends NormalizedAssessmentQuestion {
  id: string | null;
  orderIndex: number;
  isRequired: boolean;
  sourceBankQuestionId: string | null;
  saveToBank: boolean;
}

/**
 * Normalize the full ordered list of per-job questions. Caps the count and
 * re-sequences `orderIndex` 0..n by the client-provided order (falling back to
 * array position) so drag order is authoritative and gap-free.
 */
export function normalizeJobAssessmentQuestions(
  questions: Array<{
    id?: string;
    questionText: string;
    questionType?: AssessmentQuestionType;
    options?: AssessmentOptionDto[];
    correctAnswer?: AssessmentCorrectAnswerDto;
    points?: number;
    orderIndex?: number;
    isRequired?: boolean;
    sourceBankQuestionId?: string;
    saveToBank?: boolean;
  }>
): NormalizedJobAssessmentQuestion[] {
  if (questions.length > MAX_QUESTIONS_PER_JOB) {
    throw new BadRequestException(
      ASSESSMENT_BANK_MESSAGES.ERROR.TOO_MANY_QUESTIONS
    );
  }

  assertNoDuplicateJobQuestionTexts(questions);

  return [...questions]
    .map((q, i) => ({ q, order: q.orderIndex ?? i, i }))
    .sort((a, b) => a.order - b.order || a.i - b.i)
    .map(({ q }, index) => ({
      ...normalizeAssessmentQuestion(q),
      id: q.id ?? null,
      orderIndex: index,
      // Phase-1 screening questions are always required.
      isRequired: q.isRequired ?? true,
      sourceBankQuestionId: q.sourceBankQuestionId ?? null,
      saveToBank: q.saveToBank === true,
    }));
}

/**
 * Candidate-safe view of a job assessment question. The answer key
 * (`correctAnswer`) is intentionally omitted so it is never sent to a candidate.
 */
export interface CandidateAssessmentQuestion {
  id: string;
  questionText: string;
  questionType: AssessmentQuestionType;
  options: AssessmentOption[] | null;
  points: number | null;
  orderIndex: number;
  isRequired: boolean;
}

/** Map a stored job question to its candidate-facing shape (strips the key). */
export function toCandidateAssessmentQuestion(
  q: RecruitmentJobAssessmentQuestion
): CandidateAssessmentQuestion {
  return {
    id: q.id,
    questionText: q.questionText,
    questionType: q.questionType,
    options: normalizeAssessmentOptionLabels(q.options ?? null),
    points: q.points ?? null,
    orderIndex: q.orderIndex,
    isRequired: q.isRequired,
  };
}
