import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useBook, useChapter, useUpdateChapter, useGenerateChapter } from "@/hooks/use-books";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Save, Wand2, Info, Loader2, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Editor() {
  const [match, params] = useRoute("/book/:bookId/chapter/:chapterId");
  const [, setLocation] = useLocation();
  const bookId = Number(params?.bookId);
  const chapterId = Number(params?.chapterId);
  
  const { data: book } = useBook(bookId);
  const { data: chapter, isLoading } = useChapter(chapterId);
  
  const updateChapter = useUpdateChapter();
  const generateChapter = useGenerateChapter();
  const { toast } = useToast();

  const [content, setContent] = useState("");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    if (chapter) {
      setContent(chapter.content || "");
    }
  }, [chapter]);

  const handleSave = async () => {
    try {
      await updateChapter.mutateAsync({
        id: chapterId,
        bookId, // Needed for cache invalidation key
        content,
        wordCount: content.split(/\s+/).filter(w => w.length > 0).length
      });
      setLastSaved(new Date());
      toast({ title: "Saved", description: "Your progress has been saved." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
    }
  };

  const handleGenerate = () => {
    generateChapter.mutate({ chapterId, context: "Continue writing from current content..." }, {
      onSuccess: (data) => {
        // Append generated content
        const newContent = content ? `${content}\n\n${data.content}` : data.content;
        setContent(newContent);
        // Auto save after generation
        updateChapter.mutate({
          id: chapterId,
          bookId,
          content: newContent,
          wordCount: newContent.split(/\s+/).filter(w => w.length > 0).length
        });
        toast({ title: "AI Generation Complete", description: "Content added to editor." });
      }
    });
  };

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!chapter) return null;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Editor Toolbar */}
      <header className="border-b bg-card px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation(`/book/${bookId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <h1 className="font-serif font-bold text-lg leading-tight">{chapter.title}</h1>
            <span className="text-xs text-muted-foreground">
              {book?.title} • Ch. {chapter.order} • {content.split(/\s+/).filter(w => w.length > 0).length} words
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="text-xs text-muted-foreground mr-2 hidden sm:inline-block">
              Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          
          <Button 
            variant="outline" 
            onClick={handleSave} 
            disabled={updateChapter.isPending}
            className="gap-2"
          >
            {updateChapter.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>

          <Button 
            onClick={handleGenerate} 
            disabled={generateChapter.isPending}
            className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
          >
            {generateChapter.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Write with AI
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary" size="icon">
                <Info className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Chapter Details</SheetTitle>
                <SheetDescription>Context for the AI assistant.</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div>
                  <h4 className="text-sm font-medium mb-2">Summary</h4>
                  <div className="p-3 bg-muted rounded-md text-sm">
                    {chapter.summary || "No summary provided."}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Book Outline</h4>
                  <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {book?.outline || "No outline available."}
                    </p>
                  </ScrollArea>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Editor Surface */}
      <main className="flex-1 overflow-hidden bg-muted/10 relative">
        <div className="h-full max-w-4xl mx-auto bg-card shadow-2xl my-0 sm:my-8 rounded-none sm:rounded-lg overflow-hidden flex flex-col border border-border/50">
          <Textarea 
            className="flex-1 w-full p-8 md:p-12 resize-none border-0 focus-visible:ring-0 text-lg md:text-xl font-serif leading-relaxed"
            placeholder="Start writing here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
          />
        </div>
      </main>
    </div>
  );
}
