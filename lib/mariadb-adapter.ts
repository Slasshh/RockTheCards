import { PrismaMariaDb } from "@prisma/adapter-mariadb";

function withPublicKeyRetrieval(databaseUrl: string) {
  const url = new URL(databaseUrl);

  if (
    !url.searchParams.has("allowPublicKeyRetrieval") &&
    !url.searchParams.has("cachingRsaPublicKey") &&
    !url.searchParams.has("rsaPublicKey")
  ) {
    url.searchParams.set("allowPublicKeyRetrieval", "true");
  }

  return url.toString();
}

export function createMariaDbAdapter(databaseUrl: string) {
  return new PrismaMariaDb(withPublicKeyRetrieval(databaseUrl));
}
