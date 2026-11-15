export function getBackendOrigin() {
  const configured = process.env.NEST_API_URL?.trim();
  const origin = configured || (process.env.NODE_ENV === "production" ? "" : "http://localhost:3001");
  if (!origin) throw new Error("NEST_API_URL is required to connect the Next.js server to NestJS.");

  const parsed = new URL(origin);
  const isLocalDevelopmentHttp = process.env.NODE_ENV !== "production" &&
    parsed.hostname === "localhost" && parsed.protocol === "http:";
  const isDockerNetworkHttp = process.env.NEST_API_ALLOW_INTERNAL_HTTP === "true" &&
    parsed.hostname === "api" && parsed.port === "3001" && parsed.protocol === "http:";
  if (parsed.protocol !== "https:" && !isLocalDevelopmentHttp && !isDockerNetworkHttp) {
    throw new Error("NEST_API_URL must use HTTPS outside local development.");
  }
  return parsed.origin.replace(/\/+$/, "");
}
