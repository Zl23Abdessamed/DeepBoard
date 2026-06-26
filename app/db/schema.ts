import { pgTable, text, integer } from 'drizzle-orm/pg-core';

export const puzzles = pgTable('puzzles', {
  id: text('id').primaryKey(),
  fen: text('fen').notNull(),
  moves: text('moves').notNull(),
  rating: integer('rating').notNull(),
  themes: text('themes'),
  openingTags: text('opening_tags'), // Maps JS openingTags to SQL opening_tags
});

export type Puzzle = typeof puzzles.$inferSelect;