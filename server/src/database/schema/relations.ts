import { relations } from "drizzle-orm/relations";
import { users } from "./users";
import { calendarIntegrations } from "./calendar-integrations";
import { introductionRequests } from "./introduction-requests";
import { introductionRequestPricesSchema } from "./introduction-request-prices";
import { introductionEmailLogs } from "./introduction-email-logs";
import { introductionFeedback } from "./introduction-feedback";
import { contacts } from "./contacts";
import { contactSensitiveData } from "./contact-sensitive-data";
import { contactRelationships } from "./contact-relationships";
import { contactEnrichments } from "./contact-enrichments";
import { contactImportSnapshots } from "./contact-import-snapshots";
import { scheduledMeetings } from "./scheduled-meetings";
import { introductionTransactions } from "./introduction-transactions";
import { paymentStages } from "./payment-stages";
import { introductionPotentialConnectors } from "./introduction-potential-connectors";
import { introductionPrivacy } from "./introduction-privacy";
import { contactsImports } from "./contacts-imports";
import { contactsProviderTokens } from "./contacts-provider-tokens";
import { linkedinImports } from "./linkedin-imports";
import { subscriptionPlan } from "./subscription-plan";
import { subscriptionPlanPrice } from "./subscription-plan-price";
import { userSubscription } from "./user-subscription";
import { subscriptionTransactions } from "./subscription-transactions.schema";
import { inviteVerificationLogs } from "./invite-verification-logs.schema";
import { referralAuditLog } from "./referral-audit-log.schema";
import { userInvites } from "./user-invites.schema";
import { referralProgress } from "./referral-progress.schema";
import { organisationLeaderPermissions } from "./organisation-leader-permissions.schema";
import { trustScoreRules } from "./trust-score-rules.schema";
import { userTrustScoreHistory } from "./user-trust-score-history.schema";
import { organisationMemberSchema } from "./organisation.member.schema";
import { organisation } from "./organisation.schema";
import { userRolesSchema } from "./users.role.schema";
import { rolesSchema } from "./role.schema";
import { organisationInviteSchema } from "./organisation.invite.schema";
import { rolePermissionSchema } from "./role-permission.schema";
import { emailEventsSchema } from "./email-events.schema";
import { paymentRefunds } from "./payment-refunds";
import { introductionFulfillmentAttempts } from "./introduction-fulfillment-attempts";
import { userConfigurations } from "./user-configurations";
import { marketplaceShares } from "./marketplace-shares";
import { marketplaceClaims } from "./marketplace-claims";
import { marketplaceShareEvents } from "./marketplace-share-events";
import { recruitmentJobCandidates } from "./recruitment-job-candidates";
import { contactResumes } from "./contact-resumes";
import { contactResumeSearch } from "./contact-resume-search";
import { recruitmentJobsSchema } from "./recruitment-jobs";
import { recruitmentAssessmentQuestionBankSchema } from "./recruitment-assessment-question-bank";
import { recruitmentJobAssessmentQuestionsSchema } from "./recruitment-job-assessment-questions";
import { recruitmentCandidateAssessmentResponsesSchema } from "./recruitment-candidate-assessment-responses";
import { mediaSchema } from "./media.schema";
import { contactFileImports } from "./contact-file-imports";
import { contactFileImportItems } from "./contact-file-import-items";
import { organisationModuleAccess } from "./organisation-module-access.schema";

export const usersRelations = relations(users, ({ many, one }) => ({
  calendarIntegrations: many(calendarIntegrations),
  introductionEmailLogs: many(introductionEmailLogs),
  introductionPotentialConnectors: many(introductionPotentialConnectors),
  contacts: many(contacts),
  contactRelationships: many(contactRelationships),
  introductionRequests_requesterId: many(introductionRequests, {
    relationName: "introductionRequests_requesterId_users_id",
  }),
  introductionRequests_acceptedBy: many(introductionRequests, {
    relationName: "introductionRequests_acceptedBy_users_id",
  }),
  scheduledMeetings: many(scheduledMeetings),
  contactsImports: many(contactsImports),
  contactFileImports: many(contactFileImports),
  contactsProviderTokens: many(contactsProviderTokens),
  linkedinImports: many(linkedinImports),
  userSubscriptions: many(userSubscription),
  trustScoreHistory: many(userTrustScoreHistory),
  userRoles: many(userRolesSchema),
  invitesSent: many(userInvites, { relationName: "invitedByUser" }),
  invitesAccepted: many(userInvites, { relationName: "acceptedUser" }),
  referralCredits: many(userInvites, { relationName: "referralCreditedTo" }),
  referralProgress: one(referralProgress),
  userConfiguration: one(userConfigurations),
  marketplaceShares: many(marketplaceShares),
  marketplaceClaims_claimer: many(marketplaceClaims, {
    relationName: "marketplace_claims_claimer",
  }),
  marketplaceClaims_sharer: many(marketplaceClaims, {
    relationName: "marketplace_claims_sharer",
  }),
}));

export const contactFileImportsRelations = relations(
  contactFileImports,
  ({ one, many }) => ({
    createdByUser: one(users, {
      fields: [contactFileImports.createdBy],
      references: [users.id],
    }),
    items: many(contactFileImportItems),
  })
);

export const contactFileImportItemsRelations = relations(
  contactFileImportItems,
  ({ one }) => ({
    import: one(contactFileImports, {
      fields: [contactFileImportItems.importId],
      references: [contactFileImports.id],
    }),
  })
);

export const rolesRelations = relations(rolesSchema, ({ many }) => ({
  userRoles: many(userRolesSchema),
}));

export const userRolesRelations = relations(userRolesSchema, ({ one }) => ({
  user: one(users, {
    fields: [userRolesSchema.userId],
    references: [users.id],
  }),
  role: one(rolesSchema, {
    fields: [userRolesSchema.roleId],
    references: [rolesSchema.id],
  }),
}));

// Backward compatibility export
export const profilesRelations = usersRelations;

export const calendarIntegrationsRelations = relations(
  calendarIntegrations,
  ({ one, many }) => ({
    profile: one(users, {
      fields: [calendarIntegrations.userId],
      references: [users.id],
    }),
    contactsImports: many(contactsImports),
  })
);

export const introductionRequestsRelations = relations(
  introductionRequests,
  ({ one, many }) => ({
    pricing: one(introductionRequestPricesSchema, {
      fields: [introductionRequests.id],
      references: [introductionRequestPricesSchema.introductionRequestId],
    }),
    introductionPrivacy: many(introductionPrivacy),
    introductionEmailLogs: many(introductionEmailLogs),
    introductionFeedbacks: many(introductionFeedback),
    introductionTransactions: many(introductionTransactions),
    introductionPotentialConnectors: many(introductionPotentialConnectors),
    scheduledMeetings: many(scheduledMeetings),
    marketplaceShares: many(marketplaceShares),
    marketplaceClaims: many(marketplaceClaims),
    profile_requesterId: one(users, {
      fields: [introductionRequests.requesterId],
      references: [users.id],
      relationName: "introductionRequests_requesterId_users_id",
    }),
    contact: one(contacts, {
      fields: [introductionRequests.contactId],
      references: [contacts.id],
    }),
    profile_acceptedBy: one(users, {
      fields: [introductionRequests.acceptedBy],
      references: [users.id],
      relationName: "introductionRequests_acceptedBy_users_id",
    }),
  })
);

export const introductionRequestPricesRelations = relations(
  introductionRequestPricesSchema,
  ({ one }) => ({
    introductionRequest: one(introductionRequests, {
      fields: [introductionRequestPricesSchema.introductionRequestId],
      references: [introductionRequests.id],
    }),
  })
);

export const introductionTransactionsRelations = relations(
  introductionTransactions,
  ({ one, many }) => ({
    introductionRequest: one(introductionRequests, {
      fields: [introductionTransactions.introductionRequestId],
      references: [introductionRequests.id],
    }),
    paymentStages: many(paymentStages),
  })
);

export const paymentStagesRelations = relations(paymentStages, ({ one }) => ({
  transaction: one(introductionTransactions, {
    fields: [paymentStages.transactionId],
    references: [introductionTransactions.id],
  }),
  refund: one(paymentRefunds),
}));

export const paymentRefundsRelations = relations(paymentRefunds, ({ one }) => ({
  introductionRequest: one(introductionRequests, {
    fields: [paymentRefunds.introductionRequestId],
    references: [introductionRequests.id],
  }),
  introductionTransaction: one(introductionTransactions, {
    fields: [paymentRefunds.introductionTransactionId],
    references: [introductionTransactions.id],
  }),
  paymentStage: one(paymentStages, {
    fields: [paymentRefunds.paymentStageId],
    references: [paymentStages.id],
  }),
  initiatedByUser: one(users, {
    fields: [paymentRefunds.initiatedByUserId],
    references: [users.id],
  }),
}));

export const introductionFulfillmentAttemptsRelations = relations(
  introductionFulfillmentAttempts,
  ({ one }) => ({
    introductionRequest: one(introductionRequests, {
      fields: [introductionFulfillmentAttempts.introductionRequestId],
      references: [introductionRequests.id],
    }),
    connector: one(users, {
      fields: [introductionFulfillmentAttempts.connectorId],
      references: [users.id],
    }),
  })
);

export const introductionEmailLogsRelations = relations(
  introductionEmailLogs,
  ({ one }) => ({
    introductionRequest: one(introductionRequests, {
      fields: [introductionEmailLogs.introductionRequestId],
      references: [introductionRequests.id],
    }),
    profile: one(users, {
      fields: [introductionEmailLogs.connectorId],
      references: [users.id],
    }),
  })
);

export const introductionFeedbackRelations = relations(
  introductionFeedback,
  ({ one }) => ({
    introductionRequest: one(introductionRequests, {
      fields: [introductionFeedback.introductionId],
      references: [introductionRequests.id],
    }),
    profile_feedbackFromUserId: one(users, {
      fields: [introductionFeedback.feedbackFromUserId],
      references: [users.id],
      relationName: "introductionFeedback_feedbackFromUserId_users_id",
    }),
    profile_feedbackToUserId: one(users, {
      fields: [introductionFeedback.feedbackToUserId],
      references: [users.id],
      relationName: "introductionFeedback_feedbackToUserId_users_id",
    }),
  })
);

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  originalImporter: one(users, {
    fields: [contacts.originalImporterId],
    references: [users.id],
  }),
  contactSensitiveData: many(contactSensitiveData),
  contactRelationships: many(contactRelationships),
  contactEnrichments: many(contactEnrichments),
  introductionRequests: many(introductionRequests),
  recruitmentJobCandidates: many(recruitmentJobCandidates),
  contactResumes: many(contactResumes),
}));

export const contactRelationshipsRelations = relations(
  contactRelationships,
  ({ one, many }) => ({
    contact: one(contacts, {
      fields: [contactRelationships.contactId],
      references: [contacts.id],
    }),
    user: one(users, {
      fields: [contactRelationships.userId],
      references: [users.id],
    }),
    contactImportSnapshots: many(contactImportSnapshots),
  })
);

export const contactSensitiveDataRelations = relations(
  contactSensitiveData,
  ({ one }) => ({
    contact: one(contacts, {
      fields: [contactSensitiveData.contactId],
      references: [contacts.id],
    }),
  })
);

export const contactEnrichmentsRelations = relations(
  contactEnrichments,
  ({ one }) => ({
    contact: one(contacts, {
      fields: [contactEnrichments.contactId],
      references: [contacts.id],
    }),
  })
);

export const scheduledMeetingsRelations = relations(
  scheduledMeetings,
  ({ one }) => ({
    introductionRequest: one(introductionRequests, {
      fields: [scheduledMeetings.introductionRequestId],
      references: [introductionRequests.id],
    }),
    profile: one(users, {
      fields: [scheduledMeetings.requesterId],
      references: [users.id],
    }),
  })
);

export const introductionPotentialConnectorsRelations = relations(
  introductionPotentialConnectors,
  ({ one }) => ({
    introductionRequest: one(introductionRequests, {
      fields: [introductionPotentialConnectors.requestId],
      references: [introductionRequests.id],
    }),
    potentialConnector: one(users, {
      fields: [introductionPotentialConnectors.potentialConnectorId],
      references: [users.id],
    }),
  })
);

export const introductionPrivacyRelations = relations(
  introductionPrivacy,
  ({ one }) => ({
    introductionRequest: one(introductionRequests, {
      fields: [introductionPrivacy.introductionRequestId],
      references: [introductionRequests.id],
    }),
  })
);

export const contactsImportsRelations = relations(
  contactsImports,
  ({ one, many }) => ({
    profile: one(users, {
      fields: [contactsImports.userId],
      references: [users.id],
    }),
    calendarIntegration: one(calendarIntegrations, {
      fields: [contactsImports.integrationId],
      references: [calendarIntegrations.id],
    }),
    providerToken: one(contactsProviderTokens, {
      fields: [contactsImports.tokenId],
      references: [contactsProviderTokens.id],
    }),
    linkedinImports: many(linkedinImports),
  })
);

export const linkedinImportsRelations = relations(
  linkedinImports,
  ({ one }) => ({
    profile: one(users, {
      fields: [linkedinImports.userId],
      references: [users.id],
    }),
    importRecord: one(contactsImports, {
      fields: [linkedinImports.importRecordId],
      references: [contactsImports.id],
    }),
  })
);

export const contactsProviderTokensRelations = relations(
  contactsProviderTokens,
  ({ one, many }) => ({
    profile: one(users, {
      fields: [contactsProviderTokens.userId],
      references: [users.id],
    }),
    contactsImports: many(contactsImports),
  })
);

export const contactImportSnapshotsRelations = relations(
  contactImportSnapshots,
  ({ one }) => ({
    relationship: one(contactRelationships, {
      fields: [contactImportSnapshots.relationshipId],
      references: [contactRelationships.id],
    }),
  })
);

export const subscriptionPlanRelations = relations(
  subscriptionPlan,
  ({ many }) => ({
    prices: many(subscriptionPlanPrice),
    userSubscriptions: many(userSubscription),
  })
);

export const subscriptionPlanPriceRelations = relations(
  subscriptionPlanPrice,
  ({ one }) => ({
    subscriptionPlan: one(subscriptionPlan, {
      fields: [subscriptionPlanPrice.subscriptionPlanId],
      references: [subscriptionPlan.id],
    }),
  })
);

export const userSubscriptionRelations = relations(
  userSubscription,
  ({ one, many }) => ({
    user: one(users, {
      fields: [userSubscription.userId],
      references: [users.id],
    }),
    subscriptionPlan: one(subscriptionPlan, {
      fields: [userSubscription.subscriptionPlanId],
      references: [subscriptionPlan.id],
    }),
    transactions: many(subscriptionTransactions),
  })
);

export const subscriptionTransactionsRelations = relations(
  subscriptionTransactions,
  ({ one }) => ({
    user: one(users, {
      fields: [subscriptionTransactions.userId],
      references: [users.id],
    }),
    subscription: one(userSubscription, {
      fields: [subscriptionTransactions.subscriptionId],
      references: [userSubscription.id],
    }),
    fromPlan: one(subscriptionPlan, {
      fields: [subscriptionTransactions.fromPlanId],
      references: [subscriptionPlan.id],
      relationName: "subscription_transactions_from_plan",
    }),
    toPlan: one(subscriptionPlan, {
      fields: [subscriptionTransactions.toPlanId],
      references: [subscriptionPlan.id],
      relationName: "subscription_transactions_to_plan",
    }),
  })
);

export const inviteVerificationLogsRelations = relations(
  inviteVerificationLogs,
  ({ one }) => ({
    user: one(users, {
      fields: [inviteVerificationLogs.userId],
      references: [users.id],
    }),
  })
);

export const referralAuditLogRelations = relations(
  referralAuditLog,
  ({ one }) => ({
    user: one(users, {
      fields: [referralAuditLog.userId],
      references: [users.id],
    }),
    plan: one(subscriptionPlan, {
      fields: [referralAuditLog.planId],
      references: [subscriptionPlan.id],
    }),
  })
);

export const userInvitesRelations = relations(userInvites, ({ many, one }) => ({
  invitedByUser: one(users, {
    fields: [userInvites.invitedByUserId],
    references: [users.id],
    relationName: "user_invites_invited_by_user",
  }),
  referralCreditedToUser: one(users, {
    fields: [userInvites.referralCreditedTo],
    references: [users.id],
    relationName: "user_invites_referral_credited_to",
  }),
  acceptedUser: one(users, {
    fields: [userInvites.acceptedUserId],
    references: [users.id],
    relationName: "user_invites_accepted_user",
  }),
  subscriptionPlan: one(subscriptionPlan, {
    fields: [userInvites.subscriptionPlanId],
    references: [subscriptionPlan.id],
  }),
  emailEvents: many(emailEventsSchema),
  organisation: one(organisation, {
    fields: [userInvites.organisationId],
    references: [organisation.id],
  }),
}));

export const referralProgressRelations = relations(
  referralProgress,
  ({ one }) => ({
    user: one(users, {
      fields: [referralProgress.userId],
      references: [users.id],
    }),
  })
);

export const organisationLeaderPermissionsRelations = relations(
  organisationLeaderPermissions,
  ({ one }) => ({
    user: one(users, {
      fields: [organisationLeaderPermissions.userId],
      references: [users.id],
    }),
    organisation: one(organisation, {
      fields: [organisationLeaderPermissions.organisationId],
      references: [organisation.id],
    }),
  })
);

export const trustScoreRulesRelations = relations(
  trustScoreRules,
  ({ many }) => ({
    userTrustScoreHistory: many(userTrustScoreHistory),
  })
);

export const userTrustScoreHistoryRelations = relations(
  userTrustScoreHistory,
  ({ one }) => ({
    profile: one(users, {
      fields: [userTrustScoreHistory.userId],
      references: [users.id],
    }),
    rule: one(trustScoreRules, {
      fields: [userTrustScoreHistory.ruleId],
      references: [trustScoreRules.id],
    }),
  })
);

export const organisationMemberRelations = relations(
  organisationMemberSchema,
  ({ one }) => ({
    organisation: one(organisation, {
      fields: [organisationMemberSchema.organisationId],
      references: [organisation.id],
    }),
    user: one(users, {
      fields: [organisationMemberSchema.userId],
      references: [users.id],
    }),
  })
);

export const organisationRelations = relations(organisation, ({ many }) => ({
  members: many(organisationMemberSchema),
  invites: many(organisationInviteSchema),
  leaderPermissions: many(organisationLeaderPermissions),
}));

export const organisationModuleAccessRelations = relations(
  organisationModuleAccess,
  ({ one }) => ({
    organisation: one(organisation, {
      fields: [organisationModuleAccess.organisationId],
      references: [organisation.id],
    }),
  })
);

export const organisationInviteRelations = relations(
  organisationInviteSchema,
  ({ one }) => ({
    organisation: one(organisation, {
      fields: [organisationInviteSchema.organisationId],
      references: [organisation.id],
    }),
  })
);

export const rolePermissionRelations = relations(
  rolePermissionSchema,
  ({ one }) => ({
    role: one(rolesSchema, {
      fields: [rolePermissionSchema.roleId],
      references: [rolesSchema.id],
    }),
  })
);

export const emailEventsRelations = relations(emailEventsSchema, ({ one }) => ({
  invite: one(userInvites, {
    fields: [emailEventsSchema.inviteId],
    references: [userInvites.id],
  }),
}));

export const userConfigurationsRelations = relations(
  userConfigurations,
  ({ one }) => ({
    user: one(users, {
      fields: [userConfigurations.userId],
      references: [users.id],
    }),
  })
);

// Marketplace relations

export const marketplaceSharesRelations = relations(
  marketplaceShares,
  ({ one, many }) => ({
    introductionRequest: one(introductionRequests, {
      fields: [marketplaceShares.introductionRequestId],
      references: [introductionRequests.id],
    }),
    sharer: one(users, {
      fields: [marketplaceShares.sharerId],
      references: [users.id],
    }),
    events: many(marketplaceShareEvents),
  })
);

export const marketplaceClaimsRelations = relations(
  marketplaceClaims,
  ({ one }) => ({
    introductionRequest: one(introductionRequests, {
      fields: [marketplaceClaims.introductionRequestId],
      references: [introductionRequests.id],
    }),
    claimer: one(users, {
      fields: [marketplaceClaims.claimerId],
      references: [users.id],
      relationName: "marketplace_claims_claimer",
    }),
    sharer: one(users, {
      fields: [marketplaceClaims.sharerId],
      references: [users.id],
      relationName: "marketplace_claims_sharer",
    }),
    matchedContact: one(contacts, {
      fields: [marketplaceClaims.matchedContactId],
      references: [contacts.id],
    }),
  })
);

export const marketplaceShareEventsRelations = relations(
  marketplaceShareEvents,
  ({ one }) => ({
    share: one(marketplaceShares, {
      fields: [marketplaceShareEvents.shareId],
      references: [marketplaceShares.id],
    }),
  })
);

export const recruitmentJobCandidatesRelations = relations(
  recruitmentJobCandidates,
  ({ one, many }) => ({
    resumeMedia: one(mediaSchema, {
      fields: [recruitmentJobCandidates.resumeMediaId],
      references: [mediaSchema.id],
    }),
    contact: one(contacts, {
      fields: [recruitmentJobCandidates.contactId],
      references: [contacts.id],
    }),
    contactResumes: many(contactResumes),
  })
);

export const contactResumesRelations = relations(contactResumes, ({ one }) => ({
  media: one(mediaSchema, {
    fields: [contactResumes.mediaId],
    references: [mediaSchema.id],
  }),
  candidate: one(recruitmentJobCandidates, {
    fields: [contactResumes.candidateId],
    references: [recruitmentJobCandidates.id],
  }),
  contact: one(contacts, {
    fields: [contactResumes.contactId],
    references: [contacts.id],
  }),
  search: one(contactResumeSearch, {
    fields: [contactResumes.id],
    references: [contactResumeSearch.contactResumeId],
  }),
}));

export const contactResumeSearchRelations = relations(
  contactResumeSearch,
  ({ one }) => ({
    contactResume: one(contactResumes, {
      fields: [contactResumeSearch.contactResumeId],
      references: [contactResumes.id],
    }),
  })
);

export const mediaSchemaRelations = relations(mediaSchema, ({ many }) => ({
  recruitmentJobCandidates: many(recruitmentJobCandidates),
  contactResumes: many(contactResumes),
}));

export const recruitmentAssessmentQuestionBankRelations = relations(
  recruitmentAssessmentQuestionBankSchema,
  ({ many }) => ({
    jobQuestions: many(recruitmentJobAssessmentQuestionsSchema),
  })
);

export const recruitmentJobAssessmentQuestionsRelations = relations(
  recruitmentJobAssessmentQuestionsSchema,
  ({ one, many }) => ({
    job: one(recruitmentJobsSchema, {
      fields: [recruitmentJobAssessmentQuestionsSchema.jobId],
      references: [recruitmentJobsSchema.id],
    }),
    sourceBankQuestion: one(recruitmentAssessmentQuestionBankSchema, {
      fields: [recruitmentJobAssessmentQuestionsSchema.sourceBankQuestionId],
      references: [recruitmentAssessmentQuestionBankSchema.id],
    }),
    responses: many(recruitmentCandidateAssessmentResponsesSchema),
  })
);

export const recruitmentCandidateAssessmentResponsesRelations = relations(
  recruitmentCandidateAssessmentResponsesSchema,
  ({ one }) => ({
    jobCandidate: one(recruitmentJobCandidates, {
      fields: [recruitmentCandidateAssessmentResponsesSchema.jobCandidateId],
      references: [recruitmentJobCandidates.id],
    }),
    jobQuestion: one(recruitmentJobAssessmentQuestionsSchema, {
      fields: [recruitmentCandidateAssessmentResponsesSchema.jobQuestionId],
      references: [recruitmentJobAssessmentQuestionsSchema.id],
    }),
  })
);
