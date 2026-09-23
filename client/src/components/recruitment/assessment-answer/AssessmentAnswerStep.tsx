import { ClipboardList } from "lucide-react";
import type { CandidateAssessmentQuestion } from "@/lib/api/recruitment";
import type {
  AssessmentAnswerState,
  AssessmentAnswerValue,
} from "@/schemas/recruitment-assessment-answer";
import { AssessmentQuestionField } from "./AssessmentQuestionField";

interface AssessmentAnswerStepProps {
  questions: CandidateAssessmentQuestion[];
  answers: AssessmentAnswerState;
  onChange: (answers: AssessmentAnswerState) => void;
}

/**
 * Assessment step body: renders every question and collects the candidate's
 * answers into a `jobQuestionId → answer` map owned by the parent modal.
 */
export function AssessmentAnswerStep({
  questions,
  answers,
  onChange,
}: AssessmentAnswerStepProps) {
  const setAnswer = (questionId: string, value: AssessmentAnswerValue) => {
    onChange({ ...answers, [questionId]: value });
  };

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
        <ClipboardList className="h-6 w-6" />
        No screening questions for this role.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Answer the screening questions below to complete your application.
      </p>
      {questions.map((question, index) => (
        <AssessmentQuestionField
          key={question.id}
          index={index}
          question={question}
          value={answers[question.id]}
          onChange={(value) => setAnswer(question.id, value)}
        />
      ))}
    </div>
  );
}
