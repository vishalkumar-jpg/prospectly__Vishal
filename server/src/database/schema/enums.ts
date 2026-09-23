import { prospectlySchema } from "./schema-definition";

export const appRoleEnum = prospectlySchema.enum("app_role", [
  "admin",
  "user",
  "moderator",
  "super_admin",
]);

export const userModuleEnum = prospectlySchema.enum("user_module", [
  "recruiting",
]);

export const panelEnum = prospectlySchema.enum("panel", ["admin", "user"]);

export const assessmentQuestionTypeEnum = prospectlySchema.enum(
  "assessment_question_type",
  ["single_choice", "multi_choice", "text"]
);
