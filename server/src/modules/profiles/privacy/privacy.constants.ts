export const MESSAGES = {
  INFO: {
    CREATED: "Privacy setting created successfully",
    UPDATED: "Privacy setting updated successfully",
    DELETED: "Privacy setting deleted successfully",
  },
  ERROR: {
    NOT_FOUND: "Privacy setting not found",
    DUPLICATE_DOMAIN: "Domain already exists",
    INVALID_DATA: "Invalid data provided",
  },
};

export enum ReasonEnum {
  DIRECT_COMPETITOR = "direct_competitor",
  CONFLICT_OF_INTEREST = "conflict_of_interest",
  LEGAL_REQUIREMENTS = "legal_requirements",
  OTHER = "other",
}

export enum SortFieldEnum {
  CREATED_AT = "createdAt",
  DOMAIN = "domain",
  REASON = "reason",
}

export enum SortOrderEnum {
  ASC = "ASC",
  DESC = "DESC",
}
