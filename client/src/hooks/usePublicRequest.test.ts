import { describe, it, expect, spyOn, beforeEach, afterEach } from "bun:test";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { usePublicRequest } from "./usePublicRequest";
import type { PublicRequestData } from "@/lib/api/marketplace";

function renderUsePublicRequest(
  requestId: string | undefined,
  sharerCode: string | undefined
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  let result!: ReturnType<typeof usePublicRequest>;

  function TestComponent() {
    result = usePublicRequest(requestId, sharerCode);
    return React.createElement("div", null, "rendered");
  }

  ReactDOMServer.renderToString(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(TestComponent)
    )
  );

  return { result, queryClient };
}

describe("usePublicRequest", () => {
  let getPublicRequestSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    getPublicRequestSpy = spyOn(api.marketplace, "getPublicRequest");
  });

  afterEach(() => {
    getPublicRequestSpy.mockRestore();
  });

  it("does not call getPublicRequest and returns error on refetch when route parameters are missing", async () => {
    const { result } = renderUsePublicRequest(undefined, undefined);

    expect(result.request).toBeNull();
    expect(getPublicRequestSpy).not.toHaveBeenCalled();

    const refetchResult = await result.refetch();

    expect(getPublicRequestSpy).not.toHaveBeenCalled();
    expect(refetchResult.error).toBeDefined();
    expect(refetchResult.error?.message).toBe(
      "requestId and sharerCode are required"
    );
  });

  it("does not call getPublicRequest when only requestId is provided and refetch is invoked", async () => {
    const { result } = renderUsePublicRequest("req-123", undefined);

    const refetchResult = await result.refetch();

    expect(getPublicRequestSpy).not.toHaveBeenCalled();
    expect(refetchResult.error?.message).toBe(
      "requestId and sharerCode are required"
    );
  });

  it("does not call getPublicRequest when route parameters are empty strings and refetch is invoked", async () => {
    const { result } = renderUsePublicRequest("  ", "  ");

    expect(result.loading).toBe(false);
    expect(result.isLoading).toBe(false);

    const refetchResult = await result.refetch();

    expect(getPublicRequestSpy).not.toHaveBeenCalled();
    expect(refetchResult.error?.message).toBe(
      "requestId and sharerCode are required"
    );
  });

  it("calls getPublicRequest with expected identifiers when route parameters are available", async () => {
    const mockData: PublicRequestData = {
      id: "req-123",
      contactName: "John Doe",
      contactTitle: "CTO",
      contactCompany: "Acme",
      meetingTitle: "Intro Meeting",
      meetingDescription: "Discussion",
      bountyAmount: 500,
      claimerShare: 250,
      sharerShare: 250,
      isUrgent: false,
      isClaimed: false,
      interestedCount: 3,
      viewCount: 12,
      createdAt: "2026-08-01T00:00:00Z",
      prospect: null,
    };

    getPublicRequestSpy.mockResolvedValue(mockData);

    const { result } = renderUsePublicRequest("req-123", "sharer-abc");

    const refetchResult = await result.refetch();

    expect(getPublicRequestSpy).toHaveBeenCalledTimes(1);
    expect(getPublicRequestSpy).toHaveBeenCalledWith("req-123", "sharer-abc");
    expect(refetchResult.data).toEqual(mockData);
  });
});
