import { Injectable, Logger } from "@nestjs/common";
import { apolloConfig } from "config/apollo.config";

@Injectable()
export class ApolloApiService {
  private readonly logger = new Logger(ApolloApiService.name);

  async post<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    return this.request<T>(endpoint, body);
  }

  private async request<T>(
    endpoint: string,
    body: Record<string, unknown>
  ): Promise<T> {
    const url = `${apolloConfig.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      apolloConfig.timeoutMs
    );

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "x-api-key": apolloConfig.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(
          `Apollo API ${response.status}: ${text.substring(0, 200)}`
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(
          `Apollo API request timed out after ${apolloConfig.timeoutMs}ms`
        );
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
