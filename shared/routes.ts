import { z } from 'zod';
import { insertBookSchema, insertChapterSchema, books, chapters, GenerateOutlineSchema, GenerateChapterSchema, GenerateChapterImageSchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  books: {
    list: {
      method: 'GET' as const,
      path: '/api/books',
      responses: {
        200: z.array(z.custom<typeof books.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/books/:id',
      responses: {
        200: z.custom<typeof books.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/books',
      input: insertBookSchema,
      responses: {
        201: z.custom<typeof books.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/books/:id',
      input: insertBookSchema.partial(),
      responses: {
        200: z.custom<typeof books.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/books/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  chapters: {
    list: {
      method: 'GET' as const,
      path: '/api/books/:bookId/chapters',
      responses: {
        200: z.array(z.custom<typeof chapters.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/chapters/:id',
      responses: {
        200: z.custom<typeof chapters.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/chapters',
      input: insertChapterSchema,
      responses: {
        201: z.custom<typeof chapters.$inferSelect>(),
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/chapters/:id',
      input: insertChapterSchema.partial(),
      responses: {
        200: z.custom<typeof chapters.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/chapters/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  ai: {
    generateOutline: {
      method: 'POST' as const,
      path: '/api/ai/generate-outline',
      input: GenerateOutlineSchema,
      responses: {
        200: z.object({ outline: z.string(), chapters: z.array(z.object({ title: z.string(), summary: z.string() })) }),
        400: errorSchemas.validation,
        500: errorSchemas.internal
      },
    },
    generateChapter: {
      method: 'POST' as const,
      path: '/api/ai/generate-chapter',
      input: GenerateChapterSchema,
      responses: {
        200: z.object({ content: z.string() }),
        400: errorSchemas.validation,
        500: errorSchemas.internal
      },
    },
    generateChapterImage: {
      method: 'POST' as const,
      path: '/api/ai/generate-chapter-image',
      input: GenerateChapterImageSchema,
      responses: {
        200: z.object({ imageUrl: z.string() }),
        400: errorSchemas.validation,
        500: errorSchemas.internal
      },
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
