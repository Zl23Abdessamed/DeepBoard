import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import postgres from 'postgres';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';
type Rating = "beginner" | "intermediate" | "advanced";

// Keeps active connections cached in memory
let dbBeg: ReturnType<typeof drizzlePostgres<typeof schema>> | null = null;
let dbInt: ReturnType<typeof drizzlePostgres<typeof schema>> | null = null;
let dbAdv: ReturnType<typeof drizzleNeon<typeof schema>> | null = null;

/**
 * Dynamically picks and caches the correct Drizzle client instance 
 * depending on the requested chess puzzle rating.
 */
export function getPuzzleShard(rating: Rating) {
    if (rating === "beginner") {
        if (!dbBeg) {
            const client = postgres(process.env.DATABASE_URL_BEG!);
            dbBeg = drizzlePostgres(client, { schema });
        }
        return dbBeg;
    }

    if (rating === "intermediate") {
        if (!dbInt) {
            const client = postgres(process.env.DATABASE_URL_INT!);
            dbInt = drizzlePostgres(client, { schema });
        }
        return dbInt;
    }

    // Rating 1800 and above drops into the Neon cluster
    if (!dbAdv) {
        const client = neon(process.env.DATABASE_URL_ADV!);
        dbAdv = drizzleNeon(client, { schema });
    }
    return dbAdv;
}