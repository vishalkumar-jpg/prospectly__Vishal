import { describe, it, expect } from "bun:test";
import { isValidPublicRequestData } from "./fetch-public-request";

describe("isValidPublicRequestData", () => {
  const validDataWithNulls = {
    id: "req-123",
    contactName: "Alice",
    contactTitle: "VP Sales",
    contactCompany: "Acme Corp",
    meetingTitle: "Enterprise Intro",
    meetingDescription: "Explore partnerships",
    bountyAmount: 1000,
    claimerShare: 500,
    sharerShare: 500,
    isUrgent: false,
    isClaimed: false,
    interestedCount: 5,
    viewCount: 42,
    createdAt: "2026-08-01T12:00:00Z",
    prospect: null,
  };

  const validDataWithNestedObjects = {
    ...validDataWithNulls,
    createdAt: null,
    prospect: {
      name: "Bob Smith",
      title: "CTO",
      headline: "Tech leader",
      photoUrl: "https://example.com/photo.jpg",
      linkedinUrl: "https://linkedin.com/in/bob",
      location: "San Francisco, CA",
      organization: {
        name: "Tech Inc",
        website: "https://example.com",
        logoUrl: "https://example.com/logo.png",
        industry: "Software",
        description: "Cloud computing company",
        linkedinUrl: "https://linkedin.com/company/tech",
      },
    },
  };

  it("returns true for a complete and valid PublicRequestData payload with null prospect", () => {
    expect(isValidPublicRequestData(validDataWithNulls)).toBe(true);
  });

  it("returns true for a valid PublicRequestData payload with nested prospect and organization", () => {
    expect(isValidPublicRequestData(validDataWithNestedObjects)).toBe(true);
  });

  it("returns true when nested prospect has organization set to null", () => {
    const data = {
      ...validDataWithNestedObjects,
      prospect: {
        ...validDataWithNestedObjects.prospect,
        organization: null,
      },
    };
    expect(isValidPublicRequestData(data)).toBe(true);
  });

  it("returns false when viewCount is missing or invalid type", () => {
    const missingViewCount = { ...validDataWithNulls } as Record<
      string,
      unknown
    >;
    delete missingViewCount.viewCount;
    expect(isValidPublicRequestData(missingViewCount)).toBe(false);

    expect(
      isValidPublicRequestData({ ...validDataWithNulls, viewCount: "42" })
    ).toBe(false);
  });

  it("returns false when id is missing, empty, or whitespace", () => {
    expect(isValidPublicRequestData({ ...validDataWithNulls, id: "" })).toBe(
      false
    );
    expect(isValidPublicRequestData({ ...validDataWithNulls, id: "  " })).toBe(
      false
    );
    const noId = { ...validDataWithNulls } as Record<string, unknown>;
    delete noId.id;
    expect(isValidPublicRequestData(noId)).toBe(false);
  });

  it("returns false when required number fields are missing or wrong type", () => {
    const numberFields = [
      "bountyAmount",
      "claimerShare",
      "sharerShare",
      "interestedCount",
      "viewCount",
    ] as const;

    for (const field of numberFields) {
      const missing = { ...validDataWithNulls } as Record<string, unknown>;
      delete missing[field];
      expect(isValidPublicRequestData(missing)).toBe(false);

      const wrongType = { ...validDataWithNulls, [field]: "not-a-number" };
      expect(isValidPublicRequestData(wrongType)).toBe(false);
    }
  });

  it("returns false when required boolean fields are missing or wrong type", () => {
    const boolFields = ["isUrgent", "isClaimed"] as const;

    for (const field of boolFields) {
      const missing = { ...validDataWithNulls } as Record<string, unknown>;
      delete missing[field];
      expect(isValidPublicRequestData(missing)).toBe(false);

      const wrongType = { ...validDataWithNulls, [field]: "true" };
      expect(isValidPublicRequestData(wrongType)).toBe(false);
    }
  });

  it("returns false when string/nullable scalar fields are missing or wrong type", () => {
    const stringFields = [
      "contactName",
      "contactTitle",
      "contactCompany",
      "meetingTitle",
      "meetingDescription",
      "createdAt",
    ] as const;

    for (const field of stringFields) {
      const missing = { ...validDataWithNulls } as Record<string, unknown>;
      delete missing[field];
      expect(isValidPublicRequestData(missing)).toBe(false);

      const wrongType = { ...validDataWithNulls, [field]: 12345 };
      expect(isValidPublicRequestData(wrongType)).toBe(false);
    }
  });

  it("returns false when contactName, contactTitle, contactCompany, meetingTitle, or meetingDescription is null", () => {
    const stringFields = [
      "contactName",
      "contactTitle",
      "contactCompany",
      "meetingTitle",
      "meetingDescription",
    ] as const;

    for (const field of stringFields) {
      const withNull = { ...validDataWithNulls, [field]: null };
      expect(isValidPublicRequestData(withNull)).toBe(false);
    }
  });

  it("returns false when prospect is missing or of wrong shape", () => {
    const missingProspect = { ...validDataWithNulls } as Record<
      string,
      unknown
    >;
    delete missingProspect.prospect;
    expect(isValidPublicRequestData(missingProspect)).toBe(false);

    expect(
      isValidPublicRequestData({ ...validDataWithNulls, prospect: "invalid" })
    ).toBe(false);
    expect(
      isValidPublicRequestData({ ...validDataWithNulls, prospect: [] })
    ).toBe(false);
    expect(
      isValidPublicRequestData({ ...validDataWithNulls, prospect: 123 })
    ).toBe(false);

    const prospectMissingOrg = {
      ...validDataWithNulls,
      prospect: {
        name: "Bob",
        title: "CTO",
        headline: null,
        photoUrl: null,
        linkedinUrl: null,
        location: null,
      },
    };
    expect(isValidPublicRequestData(prospectMissingOrg)).toBe(false);

    const prospectWrongFieldType = {
      ...validDataWithNestedObjects,
      prospect: {
        ...validDataWithNestedObjects.prospect,
        name: 123,
      },
    };
    expect(isValidPublicRequestData(prospectWrongFieldType)).toBe(false);
  });

  it("returns false when organization is of wrong shape", () => {
    const orgWrongShape = {
      ...validDataWithNestedObjects,
      prospect: {
        ...validDataWithNestedObjects.prospect,
        organization: "not-an-object",
      },
    };
    expect(isValidPublicRequestData(orgWrongShape)).toBe(false);

    const orgArrayShape = {
      ...validDataWithNestedObjects,
      prospect: {
        ...validDataWithNestedObjects.prospect,
        organization: [],
      },
    };
    expect(isValidPublicRequestData(orgArrayShape)).toBe(false);

    const orgWrongFieldType = {
      ...validDataWithNestedObjects,
      prospect: {
        ...validDataWithNestedObjects.prospect,
        organization: {
          ...validDataWithNestedObjects.prospect.organization,
          name: 123,
        },
      },
    };
    expect(isValidPublicRequestData(orgWrongFieldType)).toBe(false);
  });

  it("returns false for non-object, array, or null values", () => {
    expect(isValidPublicRequestData(null)).toBe(false);
    expect(isValidPublicRequestData(undefined)).toBe(false);
    expect(isValidPublicRequestData("string")).toBe(false);
    expect(isValidPublicRequestData(123)).toBe(false);
    expect(isValidPublicRequestData([])).toBe(false);
  });
});
