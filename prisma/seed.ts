import "dotenv/config";
import { randomBytes } from "node:crypto";
import { createPrismaClient, isLocalDatabase } from "../lib/db/client";
import { DEMO_MODE } from "../lib/demo";
import { seedData, wipeData } from "./seed-core";

const db = createPrismaClient();

async function main() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const isLocal = databaseUrl !== "" && isLocalDatabase(databaseUrl);
  const reset = process.argv.includes("--reset");

  const existingUsers = await db.user.count();
  if (existingUsers > 0 && !reset) {
    console.log(`Database already has ${existingUsers} user(s), so nothing was changed. To wipe and reseed, run: npm run db:reset-seed`);
    return;
  }
  if (reset) {
    if (process.env.NODE_ENV === "production") throw new Error("Refusing to wipe data with NODE_ENV=production.");
    await wipeData(db);
  }

  // A well-known demo password is only safe on a local database.
  const password = process.env.SEED_PASSWORD ?? (isLocal ? "TestVault123!" : randomBytes(12).toString("base64url"));
  const { cases, results } = await seedData(db, { password, demo: DEMO_MODE });

  console.log(`Seeded ${DEMO_MODE ? "4" : "3"} users, 2 projects, ${cases} cases, 1 milestone, 2 runs, ${results} results.`);
  console.log("Log in as admin@testvault.dev, maya@testvault.dev or liam@testvault.dev");
  if (!process.env.SEED_PASSWORD) console.log(`Password for all three: ${password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
