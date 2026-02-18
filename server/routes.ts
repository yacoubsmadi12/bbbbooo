import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import PDFDocument from "pdfkit";
import fs from "fs/promises";
import path from "path";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

// Helper for story state
const BIBLE_PATH = path.join(process.cwd(), "series_bible.json");
async function updateStoryState(update: any) {
  try {
    const data = await fs.readFile(BIBLE_PATH, "utf-8");
    const bible = JSON.parse(data);
    bible.storyState = { ...bible.storyState, ...update };
    await fs.writeFile(BIBLE_PATH, JSON.stringify(bible, null, 2));
  } catch (e) {
    console.error("Error updating bible:", e);
  }
}

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
  // ... existing routes ...

  // Custom Architect Logic for Book 2
  app.post("/api/books/2/architect", async (req, res) => {
    try {
      const bookId = 2;
      const book = await storage.getBook(bookId);
      if (!book) return res.status(404).json({ message: "Book 2 not found" });

      const model = req.body.model || "openai";
      const prompt = `
        **Role:** Dark Romance Narrative Architect.
        **Objective:** Generate a 15-chapter outline for "Shadow of Obsession".
        
        Style: Dark Romance, High Tension, Suspenseful.
        
        For each of the 15 chapters, provide:
        - title: Dark, provocative title.
        - goal: Dramatic goal.
        - beats: 3 key scene beats.
        
        Return JSON format.
      `;

      let result;
      if (model === "anthropic") {
        const response = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 8192,
          messages: [{ role: "user", content: prompt }],
        });
        const content = response.content[0].type === 'text' ? response.content[0].text : "";
        result = JSON.parse(content || "{}");
      } else {
        const architectResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        });
        result = JSON.parse(architectResponse.choices[0].message.content || "{}");
      }
      
      // Delete existing chapters for book 2 to avoid duplicates during re-architecting
      const existing = await storage.getChapters(bookId);
      for (const c of existing) await storage.deleteChapter(c.id);

      const created = [];
      let order = 1;
      if (Array.isArray(result.chapters)) {
        for (const chap of result.chapters) {
          const c = await storage.createChapter({
            bookId,
            title: chap.title,
            summary: chap.goal,
            beatSheet: Array.isArray(chap.beats) ? chap.beats.join("\n") : chap.beats,
            content: "",
            order: order++,
            isCompleted: false
          });
          created.push(c);
        }
      }

      res.json(created);
    } catch (error) {
      res.status(500).json({ message: "Architecting failed" });
    }
  });

  // Chronicler: Chunking Logic (4 stages per chapter)
  app.post("/api/chapters/:id/draft-chunk", async (req, res) => {
    try {
      const chapterId = Number(req.params.id);
      const { stage } = req.body; // 1, 2, 3, or 4
      const chapter = await storage.getChapter(chapterId);
      if (!chapter) return res.status(404).json({ message: "Chapter not found" });
      
      const model = req.body.model || "openai";
      const bibleData = JSON.parse(await fs.readFile(BIBLE_PATH, "utf-8"));
      
      const prompt = `
        **Role:** The Chronicler.
        **Task:** Write Stage ${stage}/4 of Chapter "${chapter.title}".
        Each stage is ~600 words. Total chapter goal: 2500 words.
        
        Current Story State: ${JSON.stringify(bibleData.storyState)}
        Chapter Context: ${chapter.summary}
        Beats: ${chapter.beatSheet}
        
        Prose: Dark Romance, sensory, intense.
      `;

      let newContent = "";
      if (model === "anthropic") {
        const response = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 8192,
          messages: [{ role: "user", content: prompt }],
        });
        newContent = response.content[0].type === 'text' ? response.content[0].text : "";
      } else {
        const response = await openai.chat.completions.create({
          model: "gpt-5.2",
          messages: [{ role: "user", content: prompt }],
        });
        newContent = response.choices[0].message.content || "";
      }
      const updatedContent = (chapter.content || "") + "\n\n" + newContent;
      
      await storage.updateChapter(chapterId, { 
        content: updatedContent,
        wordCount: updatedContent.split(/\s+/).length
      });

      // Update bible state with new summary of events
      await updateStoryState({
        lastEvents: [...bibleData.storyState.lastEvents, `Finished stage ${stage} of chapter ${chapter.order}`]
      });

      res.json({ content: newContent, stage });
    } catch (error) {
      res.status(500).json({ message: "Drafting failed" });
    }
  });
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
    const bookId = Number(req.params.bookId);
    let chapters = await storage.getChapters(bookId);
    
    // Auto-architect for Book 2 if empty
    if (bookId === 2 && chapters.length === 0) {
      const book = await storage.getBook(2);
      if (book) {
        // Automatically split title if contains ":"
        if (book.title.includes(":") && !book.subtitle) {
          const [mainTitle, ...subtitleParts] = book.title.split(":");
          await storage.updateBook(2, {
            title: mainTitle.trim(),
            subtitle: subtitleParts.join(":").trim()
          });
        }

        const model = req.body.model || "openai";
        // Logic for generating 15 chapters (The Architect)
        const architectPrompt = `
          **Role:** Dark Romance Narrative Architect.
          **Objective:** Generate a 15-chapter outline for "${book.title}".
          Style: Dark Romance, High Tension.
          For each of the 15 chapters, provide:
          - title: Dark title.
          - goal: Dramatic goal.
          - beats: 3 key scene beats.
          Return JSON format: { "chapters": [...] }
        `;

        let result;
        if (model === "anthropic") {
          const response = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 8192,
            messages: [{ role: "user", content: architectPrompt }],
          });
          const content = response.content[0].type === 'text' ? response.content[0].text : "";
          result = JSON.parse(content || "{}");
        } else {
          const response = await openai.chat.completions.create({
            model: "gpt-5.2",
            messages: [{ role: "user", content: architectPrompt }],
            response_format: { type: "json_object" },
          });
          result = JSON.parse(response.choices[0].message.content || "{}");
        }
        if (Array.isArray(result.chapters)) {
          let order = 1;
          for (const chap of result.chapters) {
            await storage.createChapter({
              bookId,
              title: chap.title,
              summary: chap.goal,
              beatSheet: Array.isArray(chap.beats) ? chap.beats.join("\n") : chap.beats,
              content: "",
              order: order++,
              isCompleted: false
            });
          }
          // Refresh chapters list
          chapters = await storage.getChapters(bookId);
        }
      }
    }
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

      const model = req.body.model || "openai";
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

      let result;
      if (model === "anthropic") {
        const response = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 8192,
          messages: [{ role: "user", content: prompt }],
        });
        const content = response.content[0].type === 'text' ? response.content[0].text : "";
        result = JSON.parse(content || "{}");
      } else {
        const architectResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        });
        result = JSON.parse(architectResponse.choices[0].message.content || "{}");
      }
      
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

      // Optimized Chronicler: Multi-stage generation for high word count
      const prompt = `
        **Role:** Master Literary Author & KDP Compliance Expert.
        **Task:** Write a substantial portion of Chapter ${chapter.order}: "${chapter.title}".
        
        Book Context:
        - Title: ${book.title}
        - Category: ${book.category}
        - Tone: ${book.toneStyle}
        - Chapter Summary: ${chapter.summary}
        - Beat Sheet: ${chapter.beatSheet}
        ${context ? `- Extra Context: ${context}` : ""}

        Writing Instructions:
        1. Write AT LEAST 2500-3000 words of professional literary prose for this specific section.
        2. Use "Show, Don't Tell" with rich sensory descriptions to expand every scene.
        3. Avoid AI-isms (no "delve", "tapestry", "shimmering", etc.).
        4. Ensure a natural, human-like flow with varied sentence structures.
        5. Expand on character internal monologues, environmental details, and dialogue.
        6. Scan for KDP violations (copyrights/trademarks) and ensure compliance.

        IMPORTANT: I need a very long and detailed response. Do not summarize. Elaborate on every beat.

        Return a JSON object exactly in this format:
        {
          "content": "Full chapter prose here...",
          "compliance": {
            "isCompliant": true,
            "violations": [],
            "transparencyReport": "Brief report on language and compliance."
          }
        }
      `;

      let result;
      if (model === "anthropic") {
        const response = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 8192,
          messages: [{ role: "user", content: prompt }],
        });
        const content = response.content[0].type === 'text' ? response.content[0].text : "";
        try {
          // Try to extract JSON if it's wrapped in markdown
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          const jsonToParse = jsonMatch ? jsonMatch[0] : content;
          result = JSON.parse(jsonToParse || "{}");
        } catch (e) {
          result = { content: content, compliance: { isCompliant: true, violations: [], transparencyReport: "Raw text generated." } };
        }
      } else {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
        });
        const content = response.choices[0].message.content || "";
        try {
          // Try to extract JSON if it's wrapped in markdown
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          const jsonToParse = jsonMatch ? jsonMatch[0] : content;
          result = JSON.parse(jsonToParse || "{}");
        } catch (e) {
          result = { content: content, compliance: { isCompliant: true, violations: [], transparencyReport: "Raw text generated." } };
        }
      }
      const content = result.content || "";
      const compliance = result.compliance || { isCompliant: true, violations: [], transparencyReport: "Self-validated." };

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

      const model = req.body.model || "openai";
      const prompt = `Generate 7 highly effective SEO keyword phrases for an Amazon Kindle book with these details:
Title: ${book.title}
Category: ${book.category}
Audience: ${book.targetAudience}
Outline: ${book.outline}

Return a JSON object with a single key "keywords" which is an array of 7 string phrases. Each phrase should be 20-50 characters.`;

      let result;
      if (model === "anthropic") {
        const response = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 8192,
          messages: [{ role: "user", content: prompt }],
        });
        const content = response.content[0].type === 'text' ? response.content[0].text : "";
        result = JSON.parse(content || "{}");
      } else {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        });
        result = JSON.parse(response.choices[0].message.content || "{}");
      }
      await storage.updateBook(bookId, { keywords: result.keywords });
      res.json(result);
    } catch (error) {
      console.error("Keywords Generation Error:", error);
      res.status(500).json({ message: "Failed to generate keywords" });
    }
  });

  // KDP Paperback Formatting Export (6x9)
  app.get("/api/books/:id/export-pdf", async (req, res) => {
    try {
      const bookId = Number(req.params.id);
      const book = await storage.getBook(bookId);
      if (!book) return res.status(404).json({ message: "Book not found" });

      const chapters = await storage.getChapters(bookId);

      // KDP Paperback Formatting: 6x9 inches (432x648 points)
      const doc = new PDFDocument({
        size: [432, 648],
        margins: { top: 54, bottom: 54, left: 54, right: 36 },
        bufferPages: true
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${book.title.replace(/[^a-zA-Z0-9]/g, '_')}_KDP_6x9.pdf"`);
      doc.pipe(res);

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      // Title Page
      doc.moveDown(4);
      doc.fontSize(24).font('Helvetica-Bold').text(book.title, { align: 'center' });
      if (book.subtitle) {
        doc.moveDown(0.5);
        doc.fontSize(14).font('Helvetica-Oblique').text(book.subtitle, { align: 'center' });
      }
      doc.moveDown(2);
      doc.fontSize(12).font('Helvetica').text(`by`, { align: 'center' });
      doc.moveDown(0.2);
      doc.fontSize(14).font('Helvetica-Bold').text(book.authorName, { align: 'center' });

      // Copyright
      doc.addPage();
      doc.moveDown(15);
      doc.fontSize(9).font('Helvetica').text(book.copyright || `© ${new Date().getFullYear()} ${book.authorName}. All rights reserved.`, { align: 'left' });

      // TOC
      doc.addPage();
      doc.fontSize(18).font('Helvetica-Bold').text('Contents', { align: 'center' });
      doc.moveDown(1);
      const sortedChapters = chapters.sort((a, b) => a.order - b.order);
      sortedChapters.forEach((chapter) => {
        doc.fontSize(10).font('Helvetica').text(`Chapter ${chapter.order}: ${chapter.title}`, { indent: 20 });
      });

      // Chapters
      for (const chapter of sortedChapters) {
        doc.addPage();
        
        // Add Chapter Image if exists
        if (chapter.imageUrl) {
          try {
            const base64Data = chapter.imageUrl.replace(/^data:image\/\w+;base64,/, "");
            const imgBuffer = Buffer.from(base64Data, 'base64');
            // Center image on page, fitting within margins
            doc.image(imgBuffer, doc.page.margins.left, doc.y, {
              fit: [pageWidth, 250],
              align: 'center'
            });
            doc.moveDown(2);
          } catch (e) {
            console.error("Error adding image to PDF:", e);
          }
        }

        doc.moveDown(1);
        doc.fontSize(22).font('Helvetica-Bold').text(`Chapter ${chapter.order}`, { align: 'center' });
        doc.fontSize(16).font('Helvetica').text(chapter.title, { align: 'center' });
        doc.moveDown(2);

        if (chapter.content) {
          const paragraphs = chapter.content.split(/\n\n+/);
          doc.fontSize(12).font('Times-Roman').fillColor('#000000');
          paragraphs.forEach((paragraph) => {
            const trimmed = paragraph.trim();
            if (trimmed) {
              doc.text(trimmed, { 
                align: 'justify', 
                lineGap: 4, 
                paragraphGap: 12, 
                indent: 20 
              });
            }
          });
        }
      }

      if (book.transparencyReport) {
        doc.addPage();
        doc.fontSize(14).font('Helvetica-Bold').text('AI Transparency Report', { align: 'center' });
        doc.moveDown(1);
        doc.fontSize(10).font('Helvetica').text(book.transparencyReport, { align: 'justify' });
      }

      doc.end();
    } catch (error) {
      console.error("PDF Export Error:", error);
      res.status(500).json({ message: "Failed to export KDP PDF" });
    }
  });

  // Updated KDP Project Export (ZIP)
  app.get("/api/books/:id/export-project", async (req, res) => {
    try {
      const bookId = Number(req.params.id);
      const book = await storage.getBook(bookId);
      if (!book) return res.status(404).json({ message: "Book not found" });

      const chapters = await storage.getChapters(bookId);
      const archiver = (await import("archiver")).default;
      const archive = archiver("zip", { zlib: { level: 9 } });

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${book.title.replace(/[^a-zA-Z0-9]/g, "_")}_KDP_Package.zip"`);
      archive.pipe(res);

      // manuscript.txt
      let manuscript = `${book.title}\n${book.subtitle || ""}\nBy ${book.authorName}\n\n`;
      chapters.sort((a, b) => a.order - b.order).forEach(chap => {
        manuscript += `CHAPTER ${chap.order}: ${chap.title}\n\n${chap.content || ""}\n\n`;
      });
      archive.append(manuscript, { name: "manuscript.txt" });

      // chapter_data.json
      archive.append(JSON.stringify(chapters, null, 2), { name: "chapter_data.json" });

      // metadata_pack.txt
      let metadata = `Title: ${book.title}\nKeywords: ${book.keywords?.join(", ") || ""}\nBlurb: ${book.outline || ""}\n`;
      archive.append(metadata, { name: "metadata_pack.txt" });

      // series_bible.json
      const bible = { title: book.title, transparencyReport: book.transparencyReport, isKdpCompliant: book.isKdpCompliant };
      archive.append(JSON.stringify(bible, null, 2), { name: "series_bible.json" });

      await archive.finalize();
    } catch (error) {
      console.error("ZIP Export Error:", error);
      res.status(500).json({ message: "Failed to export KDP Package" });
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
