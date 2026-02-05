import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useBook, useChapters, useGenerateOutline, useCreateChapter, useUpdateBook } from "@/hooks/use-books";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Wand2, Save, FileText, ChevronRight, Loader2, ArrowLeft, Download } from "lucide-react";
import { type Chapter } from "@shared/schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function BookDetail() {
  const [match, params] = useRoute("/book/:id");
  const [, setLocation] = useLocation();
  const bookId = Number(params?.id);
  const { toast } = useToast();
  
  const { data: book, isLoading: bookLoading } = useBook(bookId);
  const { data: chapters, isLoading: chaptersLoading } = useChapters(bookId);
  
  const generateOutline = useGenerateOutline();
  const createChapter = useCreateChapter();
  const updateBook = useUpdateBook();

  const [activeTab, setActiveTab] = useState("outline");
  const [localOutline, setLocalOutline] = useState("");

  if (bookLoading || chaptersLoading) {
    return (
      <Layout>
        <div className="space-y-8">
          <div className="space-y-4">
            <Skeleton className="h-12 w-1/3" />
            <Skeleton className="h-6 w-1/4" />
          </div>
          <div className="grid gap-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!book) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold">Book not found</h2>
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  const handleGenerateOutline = () => {
    generateOutline.mutate({ bookId }, {
      onSuccess: () => {
        toast({
          title: "Outline Generated",
          description: "Your book outline and initial chapters have been created!",
        });
      }
    });
  };

  const handleSaveOutline = () => {
    // Optimistic save logic if we were editing local state
    // For now we assume outline is directly generated or editable in settings
    // This is a placeholder for direct text editing
    toast({ title: "Saved", description: "Changes saved successfully." });
  };

  const handleCreateChapter = () => {
    createChapter.mutate({
      bookId,
      title: "New Chapter",
      order: (chapters?.length || 0) + 1,
      content: "",
      summary: "",
    }, {
      onSuccess: (newChapter) => {
        setLocation(`/book/${bookId}/chapter/${newChapter.id}`);
      }
    });
  };

  return (
    <Layout>
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium text-foreground">{book.title}</span>
      </div>

      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-serif font-bold text-foreground mb-2">{book.title}</h1>
            <div className="flex items-center gap-4 text-muted-foreground">
              <span>{book.authorName}</span>
              <span>•</span>
              <Badge variant="secondary">{book.genre}</Badge>
              <span>•</span>
              <span>{book.language}</span>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={() => window.open(`/api/books/${bookId}/export-pdf`, '_blank')}
            data-testid="button-export-pdf"
          >
            <Download className="h-4 w-4 mr-2" /> Export PDF
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="outline">Outline & Plot</TabsTrigger>
          <TabsTrigger value="chapters">Chapters</TabsTrigger>
          <TabsTrigger value="settings">Metadata</TabsTrigger>
        </TabsList>

        <TabsContent value="outline" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">Book Outline</CardTitle>
                    <CardDescription>The high-level structure of your story.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleGenerateOutline} 
                      disabled={generateOutline.isPending}
                      variant="default"
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {generateOutline.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
                        </>
                      ) : (
                        <>
                          <Wand2 className="mr-2 h-4 w-4" /> AI Generate
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea 
                    className="min-h-[400px] font-serif text-lg leading-relaxed bg-paper resize-none focus-visible:ring-1"
                    placeholder="Click 'AI Generate' to create a comprehensive outline based on your book's metadata..."
                    defaultValue={book.outline || ""}
                    onChange={(e) => setLocalOutline(e.target.value)}
                  />
                  <div className="flex justify-end mt-4">
                     <Button 
                        onClick={() => updateBook.mutate({ id: bookId, outline: localOutline })}
                        variant="outline"
                        className="gap-2"
                      >
                        <Save className="h-4 w-4" /> Save Outline Manually
                      </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-lg">Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Target Length</span>
                    <span className="font-mono">{book.minWordCount.toLocaleString()} words</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Target Chapters</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        className="w-20 h-8 font-mono text-right"
                        defaultValue={book.targetChapters}
                        onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                          const val = parseInt(e.target.value);
                          if (val > 0 && val !== book.targetChapters) {
                            updateBook.mutate({ id: bookId, targetChapters: val });
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Current Chapters</span>
                    <span className="font-mono">{chapters?.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Avg. Chapter</span>
                    <span className="font-mono">{book.wordsPerChapter.toLocaleString()} words</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tone & Style</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <span className="block text-muted-foreground font-semibold">Tone</span>
                    <span>{book.toneStyle}</span>
                  </div>
                  <div>
                    <span className="block text-muted-foreground font-semibold">POV</span>
                    <span>{book.pov}</span>
                  </div>
                  <div>
                    <span className="block text-muted-foreground font-semibold">Audience</span>
                    <span>{book.targetAudience}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="chapters" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-serif font-bold">Chapter List</h2>
            <Button onClick={handleCreateChapter} className="gap-2">
              <FileText className="h-4 w-4" /> Add Chapter
            </Button>
          </div>

          <div className="grid gap-4">
            {chapters?.length === 0 ? (
               <div className="text-center py-12 border-2 border-dashed rounded-lg">
                 <p className="text-muted-foreground">No chapters yet. Generate an outline or add one manually.</p>
               </div>
            ) : (
              chapters?.sort((a,b) => a.order - b.order).map((chapter) => (
                <motion.div
                  key={chapter.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card 
                    className="hover:border-primary/50 transition-colors cursor-pointer group"
                    onClick={() => setLocation(`/book/${bookId}/chapter/${chapter.id}`)}
                  >
                    <CardContent className="p-6 flex items-center gap-6">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold font-serif">
                        {chapter.order}
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-serif font-bold text-lg truncate">{chapter.title}</h3>
                          {chapter.isCompleted && <Badge variant="default" className="bg-green-600">Done</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {chapter.summary || "No summary available."}
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground tabular-nums">
                        {chapter.wordCount} words
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Book Metadata</CardTitle>
              <CardDescription>Update the core details of your book.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground italic">Metadata editing form would go here (same as create dialog).</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
