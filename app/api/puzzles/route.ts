import { NextResponse } from 'next/server';
import { getPuzzleShard } from '@/app/db';            // your shard helper
import { puzzles } from '@/app/db/schema';
import { and, or, gte, lte, ilike, sql } from 'drizzle-orm';
import type { Rating } from '@/app/types/types';           // adjust path as needed

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const tier = (searchParams.get('tier') || 'beginner') as Rating;
  const rawMin = Number(searchParams.get('min')) || 0;
  const rawMax = Number(searchParams.get('max')) || 3000;
  const minRating = Math.min(rawMin, rawMax);
  const maxRating = Math.max(rawMin, rawMax);

  const requestedLimit = Number(searchParams.get('limit')) || 10;
  const limit = Math.min(requestedLimit, 100);

  const themesParam = searchParams.get('themes');
  const themesArray = themesParam
    ? themesParam.split(',').map(t => t.trim()).filter(Boolean)
    : [];

  const openingsParam = searchParams.get('opening_tags');
  const openingsArray = openingsParam
    ? openingsParam.split(',').map(o => o.trim()).filter(Boolean)
    : [];

  try {
    // 1. Get the correct database client for the rating tier
    const db = getPuzzleShard(tier);

    // 2. Build conditions
    const conditions = [
      gte(puzzles.rating, minRating),
      lte(puzzles.rating, maxRating),
    ];

    // Themes: puzzle must contain ALL selected themes
    themesArray.forEach(theme => {
      conditions.push(ilike(puzzles.themes, `%${theme}%`));
    });

    // Openings: puzzle must match ANY selected opening
    if (openingsArray.length > 0) {
      const openingConditions = openingsArray.map(op =>
        ilike(puzzles.openingTags, `%${op}%`)
      );
      conditions.push(or(...openingConditions)!);
    }

    // 3. Execute query
    const data = await db
      .select()
      .from(puzzles)
      .where(and(...conditions))
      .orderBy(sql`RANDOM()`)
      .limit(limit);

      console.log(data)

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch filtered puzzles:', error);
    return NextResponse.json(
      { error: 'Database query failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}