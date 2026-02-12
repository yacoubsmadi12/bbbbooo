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

// For Amazon SEO keywords generation
const GenerateKeywordsSchema = z.object({
  bookId: z.number(),
});

// For Cover generation
const GenerateCoverSchema = z.object({
  bookId: z.number(),
});

// The global body parser in index.ts already handles the limits
export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // No need to app.use(jsonParser) here if it's already in index.ts
  // but let's keep it consistent if needed, ensuring the limit is high.

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
        **Role:** Senior AI Book Architect.
        **Objective:** Generate a professional 12-chapter outline and Beat Sheets for the book "${book.title}".
        
        Book Details:
        - Category: ${book.category}
        - Tone: ${book.toneStyle}
        - Target Audience: ${book.targetAudience}
        - POV: ${book.pov}
        
        AMAZON KDP COMPLIANCE:
        - Outline must support a 200+ page manuscript (50,000+ words).
        - No copyrighted terms or trademarks.
        
        Return a JSON object with:
        1. "outline": Comprehensive narrative summary (1000+ words).
        2. "authorBio": Engaging professional bio for ${book.authorName}.
        3. "conclusion": Powerful ending summary.
        4. "dedication": Meaningful dedication.
        5. "copyright": Standard KDP copyright boilerplate.
        6. "chapters": Array of objects:
           - "title": Chapter name.
           - "summary": Detailed summary.
           - "beatSheet": Specific narrative beats (bullet points) for this chapter to ensure depth.
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      await storage.updateBook(bookId, { 
        outline: result.outline,
        authorBio: result.authorBio,
        conclusion: result.conclusion,
        dedication: result.dedication,
        copyright: result.copyright
      });

      const createdChapters = [];
      if (Array.isArray(result.chapters)) {
        let order = 1;
        for (const chap of result.chapters) {
          const newChap = await storage.createChapter({
            bookId,
            title: chap.title,
            summary: chap.summary,
            beatSheet: chap.beatSheet,
            content: "",
            order: order++,
            isCompleted: false
          });
          createdChapters.push({ title: newChap.title, summary: newChap.summary });
        }
      }

      res.json({ outline: result.outline, chapters: createdChapters });
    } catch (error) {
      console.error("Architect Error:", error);
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

      // Step 2: The Chronicler (Drafting)
      const draftPrompt = `
        **Role:** The Chronicler (Drafting).
        **Task:** Write the full content for Chapter ${chapter.order}: "${chapter.title}".
        
        Linguistic Strategy:
        - Show, Don't Tell: Use sensory descriptions.
        - Avoid AI-isms: No "delve", "unlocking", "tapestry", "testament", "shimmering".
        - Vary sentence length (Burstiness).
        
        Context:
        - Book: ${book.title}
        - Tone: ${book.toneStyle}
        - Beat Sheet: ${chapter.beatSheet}
        - Summary: ${chapter.summary}
        
        Write approximately ${book.wordsPerChapter} words in professional literary prose.
      `;

      const draftResponse = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [{ role: "user", content: draftPrompt }],
      });

      let content = draftResponse.choices[0].message.content || "";

      // Step 3: The Humanizer (Refining)
      const refinePrompt = `
        **Role:** The Humanizer (Refining).
        **Task:** Refine the following text to remove AI-typical transitions and inject natural linguistic variance.
        
        Instructions:
        - Remove "In conclusion", "Moreover", "Additionally".
        - Inject sensory subtext.
        - Ensure a natural, human-like flow.
        
        Text: ${content}
      `;

      const refineResponse = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [{ role: "user", content: refinePrompt }],
      });

      content = refineResponse.choices[0].message.content || content;

      // Step 4: The Compliance Officer (Validation)
      const compliancePrompt = `
        **Role:** KDP Compliance Officer.
        **Task:** Scan the text for Amazon KDP violations (copyrighted terms, trademarks, trademarked characters).
        
        Text: ${content}
        
        Return a JSON object:
        { "isCompliant": boolean, "violations": string[], "transparencyReport": string }
      `;

      const complianceResponse = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [{ role: "user", content: compliancePrompt }],
        response_format: { type: "json_object" },
      });

      const compliance = JSON.parse(complianceResponse.choices[0].message.content || "{}");

      await storage.updateChapter(chapterId, { 
        content: content,
        wordCount: content.split(/\s+/).length
      });

      await storage.updateBook(book.id, {
        isKdpCompliant: compliance.isCompliant,
        transparencyReport: compliance.transparencyReport
      });

      res.json({ content, compliance });
    } catch (error) {
      console.error("Chronicler Error:", error);
      res.status(500).json({ message: "Failed to generate chapter" });
    }
  });

  // Generate Chapter Image
  app.post(api.ai.generateChapterImage.path, async (req, res) => {
    try {
      const { chapterId } = api.ai.generateChapterImage.input.parse(req.body);
      const chapter = await storage.getChapter(chapterId);
      if (!chapter) return res.status(404).json({ message: "Chapter not found" });

      const book = await storage.getBook(chapter.bookId);
      if (!book) return res.status(404).json({ message: "Book not found" });

      // Create a prompt for image generation based on chapter content
      const imagePrompt = `Professional book illustration for a chapter titled "${chapter.title}" in a ${book.category} book. 
      Style: Modern, cinematic, highly detailed, artistic, and contemporary. 
      Atmospheric lighting, professional digital art, high resolution. 
      IMPORTANT: No text, letters, symbols, or words should appear in the image. 
      The image should artistically represent the theme of "${chapter.summary || chapter.title}" through pure visual imagery without any typography or labels.`;

      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt: imagePrompt,
        n: 1,
        size: "1024x1024",
      });

      // Get the base64 image data
      const data = response.data?.[0];
      if (!data?.b64_json) {
        throw new Error("No image data returned from OpenAI");
      }
      const imageUrl = `data:image/png;base64,${data.b64_json}`;

      // Update chapter with image URL if confirmed
      // We'll keep the storage update in this route, but the frontend will now handle the confirmation step.
      // Note: In the image generation route below, we'll stop auto-updating the chapter.
      
      res.json({ imageUrl });

    } catch (error) {
      console.error("AI Image Error:", error);
      res.status(500).json({ message: "Failed to generate chapter image" });
    }
  });

  // Generate Book Cover for Amazon Kindle (2560 x 1600)
  app.post("/api/ai/generate-cover", async (req, res) => {
    try {
      const { bookId } = GenerateCoverSchema.parse(req.body);
      const book = await storage.getBook(bookId);
      if (!book) return res.status(404).json({ message: "Book not found" });

      const imagePrompt = `Professional, cinematic book cover for a high-quality publication.
Title: "${book.title}"
Author: "${book.authorName}"
Category: ${book.category}
Tone: ${book.toneStyle}
Outline: ${book.outline || "A compelling story"}

Visual Requirements:
- The background should be a powerful, artistic, and highly detailed illustration that represents the book's themes.
- THE BOOK TITLE "${book.title}" AND AUTHOR NAME "${book.authorName}" MUST BE PROMINENTLY AND PROFESSIONALLY DISPLAYED WITH ELEGANT TYPOGRAPHY.
- The composition should be balanced, high-resolution (4K), and look like a best-selling Amazon Kindle cover.
- Style: Atmospheric, professional graphic design, vivid colors, depth, and cinematic lighting.`;

      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt: imagePrompt,
        n: 1,
        size: "1024x1024", 
      });

      const data = response.data?.[0];
      if (!data?.b64_json) {
        throw new Error("No image data returned from OpenAI");
      }
      const imageUrl = `data:image/png;base64,${data.b64_json}`;
      res.json({ imageUrl });
    } catch (error) {
      console.error("Cover Generation Error:", error);
      res.status(500).json({ message: "Failed to generate cover" });
    }
  });

  // Generate Amazon SEO Keywords
  app.post("/api/ai/generate-keywords", async (req, res) => {
    try {
      const { bookId } = GenerateKeywordsSchema.parse(req.body);
      const book = await storage.getBook(bookId);
      if (!book) return res.status(404).json({ message: "Book not found" });

      const prompt = `Generate 7 highly effective SEO keyword phrases for an Amazon Kindle book with these details:
Title: ${book.title}
Category: ${book.category}
Audience: ${book.targetAudience}
Outline: ${book.outline}

Return a JSON object with a single key "keywords" which is an array of 7 string phrases. Each phrase should be 20-50 characters.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      await storage.updateBook(bookId, { keywords: result.keywords });
      res.json(result);
    } catch (error) {
      console.error("Keywords Generation Error:", error);
      res.status(500).json({ message: "Failed to generate keywords" });
    }
  });

  // Export Book Project as ZIP
  app.get("/api/books/:id/export-project", async (req, res) => {
    try {
      const bookId = Number(req.params.id);
      const book = await storage.getBook(bookId);
      if (!book) return res.status(404).json({ message: "Book not found" });

      const chapters = await storage.getChapters(bookId);
      const archiver = (await import("archiver")).default;
      const archive = archiver("zip", { zlib: { level: 9 } });

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${book.title.replace(/[^a-zA-Z0-9]/g, "_")}_project.zip"`);

      archive.pipe(res);

      // 1. Add Book Info & Description
      const bookInfo = `Title: ${book.title}\nSubtitle: ${book.subtitle || ""}\nAuthor: ${book.authorName}\nCategory: ${book.category}\nDescription: ${book.outline || ""}\n\nConclusion:\n${book.conclusion || ""}\n\nAuthor Bio:\n${book.authorBio || ""}`;
      archive.append(bookInfo, { name: "book_info.txt" });

      // 2. Add Keywords
      if (book.keywords && book.keywords.length > 0) {
        archive.append(book.keywords.join("\n"), { name: "keywords.txt" });
      }

      // 3. Add Cover Image if exists
      if (book.coverImageUrl && book.coverImageUrl.startsWith("data:image")) {
        const base64Data = book.coverImageUrl.split(",")[1];
        archive.append(Buffer.from(base64Data, "base64"), { name: "cover.png" });
      }

      // 4. Add Full Book Content as TXT
      let fullContent = `${book.title}\n${"=".repeat(book.title.length)}\n\n`;
      chapters.sort((a, b) => a.order - b.order).forEach(chap => {
        fullContent += `Chapter ${chap.order}: ${chap.title}\n${"-".repeat(chap.title.length + 11)}\n\n${chap.content || ""}\n\n`;
      });
      archive.append(fullContent, { name: "book_content.txt" });

      await archive.finalize();
    } catch (error) {
      console.error("Export Project Error:", error);
      res.status(500).json({ message: "Failed to export project" });
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

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      // Title Page - elegant centered design
      doc.moveDown(6);
      doc.fontSize(32).font('Helvetica-Bold').text(book.title, { align: 'center' });
      if (book.subtitle) {
        doc.moveDown(0.8);
        doc.fontSize(18).font('Helvetica-Oblique').text(book.subtitle, { align: 'center' });
      }
      doc.moveDown(3);
      doc.fontSize(14).font('Helvetica').text(`by`, { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(16).font('Helvetica-Bold').text(book.authorName, { align: 'center' });

      // Copyright Page
      doc.addPage();
      doc.moveDown(20);
      doc.fontSize(10).font('Helvetica').text(book.copyright || `© ${new Date().getFullYear()} ${book.authorName}. All rights reserved.`, { align: 'center' });
      doc.moveDown(1);
      doc.text('This is a work of fiction. Names, characters, places, and incidents either are the product of the author’s imagination or are used fictitiously. Any resemblance to actual persons, living or dead, events, or locales is entirely coincidental.', { align: 'center', width: pageWidth * 0.8, indent: pageWidth * 0.1 });

      // Dedication Page
      if (book.dedication) {
        doc.addPage();
        doc.moveDown(12);
        doc.fontSize(14).font('Helvetica-Oblique').text(book.dedication, { align: 'center' });
      }

      // Table of Contents - Professional KDP style
      doc.addPage();
      doc.moveDown(1);
      doc.fontSize(24).font('Helvetica-Bold').text('Contents', { align: 'center' });
      doc.moveDown(1);

      const sortedChapters = chapters.sort((a, b) => a.order - b.order);
      
      // Draw TOC entries with professional layout
      sortedChapters.forEach((chapter) => {
        const startX = doc.page.margins.left + 40;
        const endX = doc.page.width - doc.page.margins.right - 40;
        const y = doc.y;
        
        doc.fontSize(12).font('Helvetica').fillColor('#333333');
        doc.text(`Chapter ${chapter.order}: ${chapter.title}`, startX, y);
        
        doc.moveDown(0.5);
      });

      // Chapters with images
      for (const chapter of sortedChapters) {
        doc.addPage();
        
        // Chapter indicator
        doc.moveDown(2);
        doc.fontSize(10).font('Helvetica').fillColor('#888888').text(`CHAPTER ${chapter.order}`, { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(24).font('Helvetica-Bold').fillColor('#000000').text(chapter.title, { align: 'center' });
        doc.moveDown(2);

        // Chapter image
        if (chapter.imageUrl && chapter.imageUrl.startsWith('data:image')) {
          try {
            const base64Data = chapter.imageUrl.split(',')[1];
            if (base64Data) {
              const imageBuffer = Buffer.from(base64Data, 'base64');
              doc.image(imageBuffer, { 
                fit: [pageWidth, 300],
                align: 'center'
              });
              doc.moveDown(2);
            }
          } catch (imgError) {
            console.error("Error embedding chapter image:", imgError);
          }
        }

        // Chapter content with professional formatting (KDP compatible)
        if (chapter.content) {
          const paragraphs = chapter.content.split(/\n\n+/);
          doc.fontSize(11).font('Helvetica').fillColor('#000000');
          
          paragraphs.forEach((paragraph) => {
            const trimmed = paragraph.trim();
            if (trimmed) {
              doc.text(trimmed, {
                align: 'justify',
                lineGap: 4,
                paragraphGap: 10,
                indent: 20
              });
            }
          });
        }
      }

      // Conclusion Page
      if (book.conclusion) {
        doc.addPage();
        doc.moveDown(4);
        doc.fontSize(24).font('Helvetica-Bold').text('Conclusion', { align: 'center' });
        doc.moveDown(2);
        doc.fontSize(12).font('Helvetica').text(book.conclusion, { align: 'justify', lineGap: 6 });
      }

      // About the Author
      if (book.authorBio) {
        doc.addPage();
        doc.moveDown(4);
        doc.fontSize(24).font('Helvetica-Bold').text('About the Author', { align: 'center' });
        doc.moveDown(2);
        doc.fontSize(12).font('Helvetica').text(book.authorBio, { align: 'justify', lineGap: 6 });
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
        category: "Mystery, Thriller & Suspense",
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
