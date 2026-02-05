import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Keep existing users table for compatibility, though we might not use it heavily if we just do a simple single-user flow or session-based.
// For this MVP, we will associate books with a 'userId' if we implement auth, or just keep it optional/hardcoded for now.
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  authorName: text("author_name").notNull(),
  language: text("language").notNull().default("English"),
  genre: text("genre").notNull(),
  targetAudience: text("target_audience").notNull(),
  toneStyle: text("tone_style").notNull(),
  pov: text("pov").notNull(),
  minWordCount: integer("min_word_count").notNull(),
  targetChapters: integer("target_chapters").notNull().default(10),
  wordsPerChapter: integer("words_per_chapter").notNull().default(2000),
  dedication: text("dedication"),
  copyright: text("copyright"),
  outline: text("outline"), // General book outline/overview
  authorBio: text("author_bio"),
  conclusion: text("conclusion"),
  keywords: text("keywords").array(), // For Amazon SEO
  coverImageUrl: text("cover_image_url"), // For Kindle cover
  createdAt: timestamp("created_at").defaultNow(),
});

export const chapters = pgTable("chapters", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").notNull(),
  title: text("title").notNull(),
  summary: text("summary"), // Chapter specific summary
  content: text("content"),
  order: integer("order").notNull(),
  wordCount: integer("word_count").default(0),
  isCompleted: boolean("is_completed").default(false),
  imageUrl: text("image_url"), // AI generated image for chapter
  createdAt: timestamp("created_at").defaultNow(),
});

// Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertBookSchema = createInsertSchema(books).omit({
  id: true,
  createdAt: true,
});

export const insertChapterSchema = createInsertSchema(chapters).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Book = typeof books.$inferSelect;
export type InsertBook = z.infer<typeof insertBookSchema>;

export type Chapter = typeof chapters.$inferSelect;
export type InsertChapter = z.infer<typeof insertChapterSchema>;

// API Types
export type CreateBookRequest = InsertBook;
export type UpdateBookRequest = Partial<InsertBook>;

export type CreateChapterRequest = InsertChapter;
export type UpdateChapterRequest = Partial<InsertChapter>;

// AI Generation Types
export const GenerateOutlineSchema = z.object({
  bookId: z.number(),
});
export type GenerateOutlineRequest = z.infer<typeof GenerateOutlineSchema>;

export const GenerateChapterSchema = z.object({
  chapterId: z.number(),
  context: z.string().optional(), // Extra instructions
});
export type GenerateChapterRequest = z.infer<typeof GenerateChapterSchema>;

export const GenerateChapterImageSchema = z.object({
  chapterId: z.number(),
});
export type GenerateChapterImageRequest = z.infer<typeof GenerateChapterImageSchema>;
