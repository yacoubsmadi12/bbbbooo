import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertBook, InsertChapter, GenerateOutlineRequest, GenerateChapterRequest, GenerateChapterImageRequest } from "@shared/schema";

// ============================================
// BOOKS HOOKS
// ============================================

export function useBooks() {
  return useQuery({
    queryKey: [api.books.list.path],
    queryFn: async () => {
      const res = await fetch(api.books.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch books");
      return api.books.list.responses[200].parse(await res.json());
    },
  });
}

export function useBook(id: number) {
  return useQuery({
    queryKey: [api.books.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.books.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch book");
      return api.books.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertBook) => {
      // Ensure numeric fields are numbers, not strings from form
      const payload = {
        ...data,
        minWordCount: Number(data.minWordCount),
        targetChapters: Number(data.targetChapters),
        wordsPerChapter: Number(data.wordsPerChapter),
      };
      
      const validated = api.books.create.input.parse(payload);
      
      const res = await fetch(api.books.create.path, {
        method: api.books.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.books.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create book");
      }
      return api.books.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.books.list.path] });
    },
  });
}

export function useUpdateBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<InsertBook>) => {
      const url = buildUrl(api.books.update.path, { id });
      const res = await fetch(url, {
        method: api.books.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to update book");
      return api.books.update.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.books.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.books.get.path, data.id] });
    },
  });
}

export function useDeleteBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.books.delete.path, { id });
      const res = await fetch(url, { method: api.books.delete.method, credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete book");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.books.list.path] });
    },
  });
}

// ============================================
// CHAPTER HOOKS
// ============================================

export function useChapters(bookId: number) {
  return useQuery({
    queryKey: [api.chapters.list.path, bookId],
    queryFn: async () => {
      const url = buildUrl(api.chapters.list.path, { bookId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch chapters");
      return api.chapters.list.responses[200].parse(await res.json());
    },
    enabled: !!bookId,
  });
}

export function useChapter(id: number) {
  return useQuery({
    queryKey: [api.chapters.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.chapters.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch chapter");
      return api.chapters.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateChapter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertChapter) => {
      const payload = { ...data, bookId: Number(data.bookId), order: Number(data.order) };
      const validated = api.chapters.create.input.parse(payload);
      
      const res = await fetch(api.chapters.create.path, {
        method: api.chapters.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to create chapter");
      return api.chapters.create.responses[201].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.chapters.list.path, data.bookId] });
    },
  });
}

export function useUpdateChapter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<InsertChapter>) => {
      const url = buildUrl(api.chapters.update.path, { id });
      const res = await fetch(url, {
        method: api.chapters.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to update chapter");
      return api.chapters.update.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.chapters.list.path, data.bookId] });
      queryClient.invalidateQueries({ queryKey: [api.chapters.get.path, data.id] });
    },
  });
}

export function useDeleteChapter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, bookId }: { id: number; bookId: number }) => {
      const url = buildUrl(api.chapters.delete.path, { id });
      const res = await fetch(url, { method: api.chapters.delete.method, credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete chapter");
      return bookId;
    },
    onSuccess: (bookId) => {
      queryClient.invalidateQueries({ queryKey: [api.chapters.list.path, bookId] });
    },
  });
}

// ============================================
// AI GENERATION HOOKS
// ============================================

export function useGenerateOutline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: GenerateOutlineRequest) => {
      const res = await fetch(api.ai.generateOutline.path, {
        method: api.ai.generateOutline.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("AI Generation Failed");
      return api.ai.generateOutline.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.books.get.path, variables.bookId] });
      queryClient.invalidateQueries({ queryKey: [api.chapters.list.path, variables.bookId] });
    }
  });
}

export function useGenerateChapter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: GenerateChapterRequest) => {
      const res = await fetch(api.ai.generateChapter.path, {
        method: api.ai.generateChapter.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("AI Generation Failed");
      return api.ai.generateChapter.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.chapters.get.path, variables.chapterId] });
    }
  });
}

export function useGenerateChapterImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: GenerateChapterImageRequest) => {
      const res = await fetch(api.ai.generateChapterImage.path, {
        method: api.ai.generateChapterImage.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Image Generation Failed");
      return api.ai.generateChapterImage.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.chapters.get.path, variables.chapterId] });
    }
  });
}
