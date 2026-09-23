import { renderToString } from "react-dom/server";
import { dehydrate, type QueryClient } from "@tanstack/react-query";
import { createAppQueryClient } from "./lib/queryClient";
import { SsrPublicApp } from "./ssr-public-app";
import { getPublicJobQueryKey } from "./lib/public-job-query";
import { getPublicRequestQueryKey } from "./lib/public-request-query";
import {
  buildPublicJobHeadTags,
  buildPublicRequestHeadTags,
} from "./lib/ssr-head-meta";
import type { PublicJobData } from "./lib/api/recruitment";
import type { PublicRequestData } from "./lib/api/marketplace";

export type SsrRenderInput =
  | { kind: "job"; url: string; origin: string; job: PublicJobData }
  | {
      kind: "request";
      url: string;
      origin: string;
      requestId: string;
      sharerCode: string;
      requestData: PublicRequestData;
    };

export type SsrRenderResult = {
  appHtml: string;
  headTags: string;
  dehydratedState: ReturnType<typeof dehydrate>;
  statusCode: number;
};

export async function render(input: SsrRenderInput): Promise<SsrRenderResult> {
  const { url, origin } = input;
  const queryClient = createAppQueryClient();

  let headTags: string;

  if (input.kind === "request") {
    seedPublicRequestQuery(
      queryClient,
      input.requestId,
      input.sharerCode,
      input.requestData
    );
    headTags = buildPublicRequestHeadTags({
      request: input.requestData,
      requestId: input.requestId,
      sharerCode: input.sharerCode,
      origin,
    });
  } else {
    const ref = new URL(url, "http://ssr.local").searchParams.get("ref");
    seedPublicJobQuery(queryClient, input.job.id, ref, input.job);
    headTags = buildPublicJobHeadTags({ job: input.job, origin });
  }

  const appHtml = renderToString(
    <SsrPublicApp location={url} queryClient={queryClient} />
  );

  return {
    appHtml,
    headTags,
    dehydratedState: dehydrate(queryClient),
    statusCode: 200,
  };
}

function seedPublicJobQuery(
  queryClient: QueryClient,
  jobId: string,
  ref: string | null,
  job: PublicJobData
) {
  queryClient.setQueryData(getPublicJobQueryKey(jobId, ref, true), job);
}

function seedPublicRequestQuery(
  queryClient: QueryClient,
  requestId: string,
  sharerCode: string,
  request: PublicRequestData
) {
  queryClient.setQueryData(
    getPublicRequestQueryKey(requestId, sharerCode),
    request
  );
}
