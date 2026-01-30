import { useBooks, useDeleteBook } from "@/hooks/use-books";
import { Layout } from "@/components/Layout";
import { CreateBookDialog } from "@/components/CreateBookDialog";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, BookOpen, PenLine, Clock } from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { data: books, isLoading } = useBooks();
  const deleteBook = useDeleteBook();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="h-full w-full flex items-center justify-center min-h-[50vh]">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-12 w-12 bg-muted rounded-full mb-4"></div>
            <div className="h-4 w-32 bg-muted rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">My Bookshelf</h1>
          <p className="text-muted-foreground mt-1">Manage your writing projects and track progress.</p>
        </div>
        <CreateBookDialog />
      </div>

      {books?.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-xl bg-muted/20">
          <div className="bg-primary/10 p-4 rounded-full mb-4">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No books yet</h3>
          <p className="text-muted-foreground text-center max-w-sm mb-6">
            Start your journey as an author. Create your first book project to begin writing with AI assistance.
          </p>
          <CreateBookDialog />
        </div>
      ) : (
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {books?.map((book) => {
            // Calculate a mock progress based on some logic (e.g. word count vs target)
            // Ideally backend returns this, but let's approximate
            const progress = 0; // In a real app, compute from chapter word counts
            
            return (
              <motion.div variants={item} key={book.id}>
                <Card className="group hover:shadow-xl transition-all duration-300 border-border/50 hover:border-primary/50 bg-paper">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="font-serif text-xl line-clamp-1" title={book.title}>
                          {book.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-1">
                          by {book.authorName}
                        </CardDescription>
                      </div>
                      <div className="bg-secondary px-2 py-1 rounded text-xs font-medium text-secondary-foreground">
                        {book.genre}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                        {book.outline || "No outline yet. Open to start planning."}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Progress</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          <span>{book.targetChapters} Chapters</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDistanceToNow(new Date(book.createdAt!), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between gap-2 border-t pt-4 bg-muted/10">
                    <Link href={`/book/${book.id}`} className="w-full">
                      <Button className="w-full gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors" variant="secondary">
                        <PenLine className="h-4 w-4" /> Open Studio
                      </Button>
                    </Link>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete "{book.title}" and all its chapters.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deleteBook.mutate(book.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete Book
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </Layout>
  );
}
