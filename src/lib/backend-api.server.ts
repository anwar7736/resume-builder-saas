import "server-only";
import { cookies } from "next/headers";
import { getBackendOrigin } from "@/lib/backend-origin";

type BackendRequestOptions = RequestInit & {
  forwardCookies?: boolean;
};

export class BackendApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "BackendApiError";
  }
}

export async function backendApiRequest<T>(
  path: string,
  options: BackendRequestOptions = {},
): Promise<T> {
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Backend API paths must be relative to /api.");
  const headers = new Headers(options.headers);
  const { forwardCookies, ...requestOptions } = options;
  if (forwardCookies) {
    const cookieHeader = (await cookies()).getAll().map(({ name, value }) => `${name}=${value}`).join("; ");
    if (cookieHeader) headers.set("Cookie", cookieHeader);
  }
  const response = await fetch(`${getBackendOrigin()}/api${path}`, {
    ...requestOptions,
    headers,
    cache: "no-store",
  });
  if (!response.ok) {
    let message = `NestJS API returned HTTP ${response.status}.`;
    try {
      const payload: unknown = await response.json();
      if (typeof payload === "object" && payload !== null && "error" in payload &&
          typeof payload.error === "string") {
        message = payload.error;
      }
    } catch {
      message = `NestJS API returned HTTP ${response.status}.`;
    }
    throw new BackendApiError(message, response.status);
  }
  return response.json() as Promise<T>;
}
