import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBookSchema, type InsertBook } from "@shared/schema";
import { useCreateBook } from "@/hooks/use-books";
import { Button } from "@/components/ui/button";
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus } from "lucide-react";

export function CreateBookDialog() {
  const [open, setOpen] = useState(false);
  const createBook = useCreateBook();

  const form = useForm<InsertBook>({
    resolver: zodResolver(insertBookSchema),
    defaultValues: {
      title: "",
      authorName: "",
      genre: "Novel",
      language: "English",
      targetAudience: "Adults",
      toneStyle: "Engaging",
      pov: "Third Person",
      minWordCount: 50000,
      targetChapters: 10,
      wordsPerChapter: 2500,
    },
  });

  const onSubmit = (data: InsertBook) => {
    createBook.mutate(data, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-lg hover:shadow-primary/20 transition-all">
          <Plus className="h-4 w-4" /> New Book Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Start a New Book</DialogTitle>
          <DialogDescription>
            Enter the metadata for your new masterpiece. AI will use this to guide generation.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel className="flex justify-start">Book Title</FormLabel>
                    <FormControl>
                      <Input placeholder="A Great Title" className="font-serif text-lg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="authorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex justify-start">Author Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="genre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex justify-start">Genre</FormLabel>
                    <FormControl>
                      <Input placeholder="Sci-Fi, Thriller, Romance..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetAudience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex justify-start">Target Audience</FormLabel>
                    <FormControl>
                      <Input placeholder="Young Adults, Professionals..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="toneStyle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex justify-start">Tone and Style</FormLabel>
                    <FormControl>
                      <Input placeholder="Mysterious, Humorous, Academic..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="pov"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex justify-start">Point of View</FormLabel>
                    <FormControl>
                      <Input placeholder="First Person, Third Person..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="bg-muted/50 p-4 rounded-lg space-y-4 border border-border/50">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Length Constraints</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="minWordCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex justify-center">Total Words</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="targetChapters"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex justify-center">Chapters</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="wordsPerChapter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex justify-center">Words/Chapter</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createBook.isPending}>
                {createBook.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Project
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
