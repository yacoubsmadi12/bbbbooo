import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";
import PDFDocument from "pdfkit";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Books
  app.get(api.books.list.path, async (req, res) => {
    const books = await storage.getBooks();
    res.json(books);
  });

  app.get(api.books.get.path, async (req, res) => {
    const book = await storage.getBook(Number(req.params.id));
    if (!book) return res.status(404).json({ message: "Book not found" });
    res.json(book);
  });

  app.post(api.books.create.path, async (req, res) => {
    try {
      const input = api.books.create.input.parse(req.body);
      const book = await storage.createBook(input);
      res.status(201).json(book);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.put(api.books.update.path, async (req, res) => {
    try {
      const input = api.books.update.input.parse(req.body);
      const book = await storage.updateBook(Number(req.params.id), input);
      res.json(book);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.delete(api.books.delete.path, async (req, res) => {
    await storage.deleteBook(Number(req.params.id));
    res.status(204).send();
  });

  // Chapters
  app.get(api.chapters.list.path, async (req, res) => {
    const chapters = await storage.getChapters(Number(req.params.bookId));
    res.json(chapters);
  });

  app.get(api.chapters.get.path, async (req, res) => {
    const chapter = await storage.getChapter(Number(req.params.id));
    if (!chapter) return res.status(404).json({ message: "Chapter not found" });
    res.json(chapter);
  });

  app.post(api.chapters.create.path, async (req, res) => {
    try {
      const input = api.chapters.create.input.parse(req.body);
      const chapter = await storage.createChapter(input);
      res.status(201).json(chapter);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.put(api.chapters.update.path, async (req, res) => {
    try {
      const input = api.chapters.update.input.parse(req.body);
      const chapter = await storage.updateChapter(Number(req.params.id), input);
      res.json(chapter);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.delete(api.chapters.delete.path, async (req, res) => {
    await storage.deleteChapter(Number(req.params.id));
    res.status(204).send();
  });

  // AI Endpoints
  app.post(api.ai.generateOutline.path, async (req, res) => {
    try {
      const { bookId } = api.ai.generateOutline.input.parse(req.body);
      const book = await storage.getBook(bookId);
      if (!book) return res.status(404).json({ message: "Book not found" });

      const prompt = `
        Create a detailed book outline and chapter list for a novel with the following details:
        Title: ${book.title}
        Subtitle: ${book.subtitle}
        Author: ${book.authorName}
        Genre: ${book.genre}
        Target Audience: ${book.targetAudience}
        Tone: ${book.toneStyle}
        POV: ${book.pov}
        Total Target Chapters: ${book.targetChapters}

        Return a JSON object with:
        1. "outline": A summary of the book's plot.
        2. "chapters": An array of objects, each having "title" and "summary" for each chapter.
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      // Update book with outline
      await storage.updateBook(bookId, { outline: result.outline });

      // Create chapters
      const createdChapters = [];
      if (Array.isArray(result.chapters)) {
        // Delete existing chapters if any? No, let's append or let user handle.
        // Actually, user probably wants fresh chapters if they ask for outline generation.
        // For safety, let's just add them.
        let order = 1;
        for (const chap of result.chapters) {
          const newChap = await storage.createChapter({
            bookId,
            title: chap.title,
            summary: chap.summary,
            content: "",
            order: order++,
            wordCount: 0,
            isCompleted: false
          });
          createdChapters.push({ title: newChap.title, summary: newChap.summary });
        }
      }

      res.json({ outline: result.outline, chapters: createdChapters });

    } catch (error) {
      console.error("AI Error:", error);
      res.status(500).json({ message: "Failed to generate outline" });
    }
  });

  app.post(api.ai.generateChapter.path, async (req, res) => {
    try {
      const { chapterId, context } = api.ai.generateChapter.input.parse(req.body);
      const chapter = await storage.getChapter(chapterId);
      if (!chapter) return res.status(404).json({ message: "Chapter not found" });

      const book = await storage.getBook(chapter.bookId);
      if (!book) return res.status(404).json({ message: "Book not found" });

      const prompt = `
        Write Chapter ${chapter.order}: "${chapter.title}" for the book "${book.title}".
        
        Book Context:
        Genre: ${book.genre}
        Tone: ${book.toneStyle}
        POV: ${book.pov}
        Target Audience: ${book.targetAudience}
        Book Outline: ${book.outline}

        Chapter Summary: ${chapter.summary}
        
        Additional Instructions: ${context || "None"}

        Write the full content for this chapter. Aim for around ${book.wordsPerChapter} words.
        Ensure it flows well from previous chapters (if any context provided).
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [{ role: "user", content: prompt }],
      });

      const content = response.choices[0].message.content || "";

      // Update chapter
      await storage.updateChapter(chapterId, { 
        content: content,
        wordCount: content.split(/\s+/).length 
      });

      res.json({ content });

    } catch (error) {
      console.error("AI Error:", error);
      res.status(500).json({ message: "Failed to generate chapter" });
    }
  });

  // PDF Export
  app.get("/api/books/:id/export-pdf", async (req, res) => {
    try {
      const bookId = Number(req.params.id);
      const book = await storage.getBook(bookId);
      if (!book) return res.status(404).json({ message: "Book not found" });

      const chapters = await storage.getChapters(bookId);

      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 72, bottom: 72, left: 72, right: 72 },
        bufferPages: true
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${book.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`);

      doc.pipe(res);

      // Title Page
      doc.fontSize(28).font('Helvetica-Bold').text(book.title, { align: 'center' });
      if (book.subtitle) {
        doc.moveDown(0.5);
        doc.fontSize(16).font('Helvetica').text(book.subtitle, { align: 'center' });
      }
      doc.moveDown(2);
      doc.fontSize(14).font('Helvetica').text(`By ${book.authorName}`, { align: 'center' });

      // Table of Contents
      doc.addPage();
      doc.fontSize(20).font('Helvetica-Bold').text('Table of Contents', { align: 'center' });
      doc.moveDown(1);

      chapters.forEach((chapter, index) => {
        doc.fontSize(12).font('Helvetica').text(`Chapter ${index + 1}: ${chapter.title}`);
        doc.moveDown(0.3);
      });

      // Chapters
      for (const chapter of chapters) {
        doc.addPage();
        doc.fontSize(18).font('Helvetica-Bold').text(`Chapter ${chapter.order}: ${chapter.title}`, { align: 'center' });
        doc.moveDown(1);

        if (chapter.content) {
          doc.fontSize(11).font('Helvetica').text(chapter.content, {
            align: 'justify',
            lineGap: 4
          });
        } else {
          doc.fontSize(11).font('Helvetica-Oblique').text('(No content yet)', { align: 'center' });
        }
      }

      doc.end();
    } catch (error) {
      console.error("PDF Export Error:", error);
      res.status(500).json({ message: "Failed to export PDF" });
    }
  });

  // Seed Data
  if (process.env.NODE_ENV !== "production") {
    const existingBooks = await storage.getBooks();
    if (existingBooks.length === 0) {
      console.log("Seeding database...");
      await storage.createBook({
        title: "The Silent Echo",
        subtitle: "A Mystery in the Mountains",
        authorName: "Eleanor Vance",
        language: "English",
        genre: "Mystery",
        targetAudience: "Adult",
        toneStyle: "Suspenseful, Atmospheric",
        pov: "Third Person Limited",
        minWordCount: 60000,
        targetChapters: 12,
        wordsPerChapter: 5000,
        outline: "A woman returns to her hometown to uncover the truth about her sister's disappearance, only to find that the town itself is hiding a dark secret."
      });
      // Add more seed data if needed
    }
  }

  return httpServer;
}
