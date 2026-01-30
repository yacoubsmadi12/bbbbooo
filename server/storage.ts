import { db } from "./db";
import {
  books, chapters,
  type Book, type InsertBook,
  type Chapter, type InsertChapter,
} from "@shared/schema";
import { eq, asc } from "drizzle-orm";

export interface IStorage {
  // Books
  getBooks(): Promise<Book[]>;
  getBook(id: number): Promise<Book | undefined>;
  createBook(book: InsertBook): Promise<Book>;
  updateBook(id: number, book: Partial<InsertBook>): Promise<Book>;
  deleteBook(id: number): Promise<void>;

  // Chapters
  getChapters(bookId: number): Promise<Chapter[]>;
  getChapter(id: number): Promise<Chapter | undefined>;
  createChapter(chapter: InsertChapter): Promise<Chapter>;
  updateChapter(id: number, chapter: Partial<InsertChapter>): Promise<Chapter>;
  deleteChapter(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Books
  async getBooks(): Promise<Book[]> {
    return await db.select().from(books).orderBy(books.createdAt);
  }

  async getBook(id: number): Promise<Book | undefined> {
    const [book] = await db.select().from(books).where(eq(books.id, id));
    return book;
  }

  async createBook(book: InsertBook): Promise<Book> {
    const [newBook] = await db.insert(books).values(book).returning();
    return newBook;
  }

  async updateBook(id: number, updates: Partial<InsertBook>): Promise<Book> {
    const [updated] = await db.update(books).set(updates).where(eq(books.id, id)).returning();
    return updated;
  }

  async deleteBook(id: number): Promise<void> {
    // Cascade delete chapters
    await db.delete(chapters).where(eq(chapters.bookId, id));
    await db.delete(books).where(eq(books.id, id));
  }

  // Chapters
  async getChapters(bookId: number): Promise<Chapter[]> {
    return await db.select().from(chapters).where(eq(chapters.bookId, bookId)).orderBy(asc(chapters.order));
  }

  async getChapter(id: number): Promise<Chapter | undefined> {
    const [chapter] = await db.select().from(chapters).where(eq(chapters.id, id));
    return chapter;
  }

  async createChapter(chapter: InsertChapter): Promise<Chapter> {
    const [newChapter] = await db.insert(chapters).values(chapter).returning();
    return newChapter;
  }

  async updateChapter(id: number, updates: Partial<InsertChapter>): Promise<Chapter> {
    const [updated] = await db.update(chapters).set(updates).where(eq(chapters.id, id)).returning();
    return updated;
  }

  async deleteChapter(id: number): Promise<void> {
    await db.delete(chapters).where(eq(chapters.id, id));
  }
}

export const storage = new DatabaseStorage();
