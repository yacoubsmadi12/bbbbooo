import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useBook, useChapter, useUpdateChapter, useGenerateChapter, useDeleteChapter, useGenerateChapterImage } from "@/hooks/use-books";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Save, Wand2, Info, Loader2, Pencil, Trash2, CheckCircle, ImageIcon } from "lucide-react";
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
  const generateChapterImage = useGenerateChapterImage();
  const deleteChapter = useDeleteChapter();
  const { toast } = useToast();

  const [content, setContent] = useState("");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");

  useEffect(() => {
    if (chapter) {
      setContent(chapter.content || "");
      setEditTitle(chapter.title);
      setEditSummary(chapter.summary || "");
    }
  }, [chapter]);

  const handleSave = async () => {
    try {
      await updateChapter.mutateAsync({
        id: chapterId,
        bookId,
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
        const newContent = content ? `${content}\n\n${data.content}` : data.content;
        setContent(newContent);
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

  const handleSaveDetails = async () => {
    try {
      await updateChapter.mutateAsync({
        id: chapterId,
        bookId,
        title: editTitle,
        summary: editSummary,
      });
      setEditDialogOpen(false);
      toast({ title: "Updated", description: "Chapter details saved." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteChapter.mutateAsync({ id: chapterId, bookId });
      toast({ title: "Deleted", description: "Chapter has been removed." });
      setLocation(`/book/${bookId}`);
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    }
  };

  const handleMarkComplete = async () => {
    try {
      await updateChapter.mutateAsync({
        id: chapterId,
        bookId,
        isCompleted: !chapter?.isCompleted,
      });
      toast({ 
        title: chapter?.isCompleted ? "Marked as incomplete" : "Marked as complete", 
        description: chapter?.isCompleted ? "Chapter status updated." : "Great progress!" 
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    }
  };

  const handleGenerateImage = () => {
    generateChapterImage.mutate({ chapterId }, {
      onSuccess: () => {
        toast({ title: "Image Generated", description: "A beautiful illustration has been created for this chapter!" });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to generate image.", variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!chapter) return null;

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="border-b bg-card px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation(`/book/${bookId}`)} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="font-serif font-bold text-lg leading-tight">{chapter.title}</h1>
              <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" data-testid="button-edit-chapter">
                    <Pencil className="h-3 w-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Chapter Details</DialogTitle>
                    <DialogDescription>Update the chapter title and summary.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Chapter Title</Label>
                      <Input 
                        id="title" 
                        value={editTitle} 
                        onChange={(e) => setEditTitle(e.target.value)}
                        data-testid="input-chapter-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="summary">Summary</Label>
                      <Textarea 
                        id="summary" 
                        value={editSummary} 
                        onChange={(e) => setEditSummary(e.target.value)}
                        className="min-h-[100px]"
                        data-testid="input-chapter-summary"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveDetails} disabled={updateChapter.isPending} data-testid="button-save-details">
                      {updateChapter.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Save Changes
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
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
            variant={chapter.isCompleted ? "default" : "outline"} 
            onClick={handleMarkComplete}
            className="gap-2 hidden sm:flex"
            data-testid="button-toggle-complete"
          >
            <CheckCircle className="h-4 w-4" />
            {chapter.isCompleted ? "Completed" : "Mark Complete"}
          </Button>

          <Button 
            variant="outline" 
            onClick={handleSave} 
            disabled={updateChapter.isPending}
            className="gap-2"
            data-testid="button-save"
          >
            {updateChapter.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>

          <Button 
            onClick={handleGenerate} 
            disabled={generateChapter.isPending}
            className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
            data-testid="button-generate-ai"
          >
            {generateChapter.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Write with AI
          </Button>

          <Button
            onClick={handleGenerateImage}
            disabled={generateChapterImage.isPending}
            variant="outline"
            className="gap-2"
            data-testid="button-generate-image"
          >
            {generateChapterImage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            <span className="hidden sm:inline">Generate Image</span>
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary" size="icon" data-testid="button-chapter-info">
                <Info className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Chapter Details</SheetTitle>
                <SheetDescription>Context for the AI assistant.</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {chapter.imageUrl && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Chapter Illustration</h4>
                    <div className="rounded-lg overflow-hidden border">
                      <img 
                        src={chapter.imageUrl} 
                        alt={`Illustration for ${chapter.title}`}
                        className="w-full h-auto object-cover"
                        data-testid="img-chapter-illustration"
                      />
                    </div>
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-medium mb-2">Summary</h4>
                  <div className="p-3 bg-muted rounded-md text-sm">
                    {chapter.summary || "No summary provided."}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Book Outline</h4>
                  <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {book?.outline || "No outline available."}
                    </p>
                  </ScrollArea>
                </div>
                <div className="pt-4 border-t">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full gap-2" data-testid="button-delete-chapter">
                        <Trash2 className="h-4 w-4" /> Delete Chapter
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this chapter and all its content. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground" data-testid="button-confirm-delete">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="flex-1 overflow-hidden bg-muted/10 relative">
        <div className="h-full max-w-4xl mx-auto bg-card shadow-2xl my-0 sm:my-8 rounded-none sm:rounded-lg overflow-hidden flex flex-col border border-border/50">
          <Textarea 
            className="flex-1 w-full p-8 md:p-12 resize-none border-0 focus-visible:ring-0 text-lg md:text-xl font-serif leading-relaxed"
            placeholder="Start writing here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
            data-testid="textarea-content"
          />
        </div>
      </main>
    </div>
  );
}
