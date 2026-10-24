import dns from "node:dns";
import { MongoClient } from "mongodb";

const globalForMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
};

const DEFAULT_FALLBACK_DNS_SERVERS = ["8.8.8.8", "1.1.1.1"];
const SRV_DNS_ERROR_CODES = new Set(["ECONNREFUSED", "ETIMEOUT", "ESERVFAIL", "ECONNRESET"]);

function isSrvDnsError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const code = (error as NodeJS.ErrnoException).code;
  return error.message.includes("querySrv") && !!code && SRV_DNS_ERROR_CODES.has(code);
}

function getFallbackDnsServers() {
  const configured = process.env.MONGODB_DNS_SERVERS
    ?.split(",")
    .map((server) => server.trim())
    .filter(Boolean);
  return configured?.length ? configured : DEFAULT_FALLBACK_DNS_SERVERS;
}

async function connect(uri: string) {
  const client = new MongoClient(uri, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 10_000,
  });
  try {
    return await client.connect();
  } catch (error) {
    await client.close().catch((closeError: unknown) => {
      console.warn("[mongodb] Failed to close client after connection failure.", closeError);
    });
    throw error;
  }
}

async function connectWithDnsFallback(uri: string) {
  try {
    return await connect(uri);
  } catch (error) {
    if (!uri.startsWith("mongodb+srv://") || !isSrvDnsError(error)) throw error;

    const fallbackServers = getFallbackDnsServers();
    console.warn(
      `[mongodb] SRV lookup failed via ${dns.getServers().join(", ")}; retrying with ${fallbackServers.join(", ")}.`,
    );
    dns.setServers(fallbackServers);
    return connect(uri);
  }
}

function getClientPromise() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured.");
  if (!globalForMongo.mongoClientPromise) {
    globalForMongo.mongoClientPromise = connectWithDnsFallback(uri).catch((error: unknown) => {
      globalForMongo.mongoClientPromise = undefined;
      throw error;
    });
  }
  return globalForMongo.mongoClientPromise;
}

export async function getDatabase() {
  const connectedClient = await getClientPromise();
  return connectedClient.db(process.env.MONGODB_DB || "resumecraft");
}
