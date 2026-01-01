import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "@shared/schema";

const neonClient = neon(process.env.DATABASE_URL!);
export const db = drizzle({ client: neonClient, schema });
