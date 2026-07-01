import { NextResponse } from 'next/server';
import { getPuzzleShard } from '@/app/db';
import { puzzles } from '@/app/db/schema';
import { gte } from 'drizzle-orm';
import type { Rating } from '@/app/types/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const ratingParam = Number(searchParams.get('rating'));
  const limitParam = Number(searchParams.get('limit'));

  if (!Number.isFinite(ratingParam) || ratingParam < 0) {
    return NextResponse.json(
      { error: 'Valid rating parameter required' },
      { status: 400 }
    );
  }

  const rating = Math.floor(ratingParam);
  const limit =
    Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(limitParam, 100)
      : 10;

  let tier: Rating = 'beginner';

  if (rating >= 1800) {
    tier = 'advanced';
  } else if (rating >= 1200) {
    tier = 'intermediate';
  }

  try {
    const db = getPuzzleShard(tier);

    const data = await db
      .select()
      .from(puzzles)
      .where(gte(puzzles.rating, rating))
      .orderBy(puzzles.rating)
      .limit(limit);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch puzzles:', error);

    return NextResponse.json(
      { error: 'Database query failed' },
      { status: 500 }
    );
  }
}