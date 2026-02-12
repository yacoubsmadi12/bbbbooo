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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES = [
  "Arts & Photography", "Biographies & Memoirs", "Business & Money", "Children's Books",
  "Christian Books & Bibles", "Cookbooks, Food & Wine", "Crafts, Hobbies & Home",
  "Education & Teaching", "Engineering & Transportation", "Health, Fitness & Dieting",
  "History", "Humor & Entertainment", "Literature & Fiction", "Medical Books",
  "Mystery, Thriller & Suspense", "Parenting & Relationships", "Politics & Social Sciences",
  "Reference", "Religion & Spirituality", "Romance", "Science & Math",
  "Science Fiction & Fantasy", "Self-Help", "Sports & Outdoors", "Teen & Young Adult",
  "Test Preparation", "Travel"
];

const AUDIENCES = ["Children", "Middle Grade", "Young Adult", "Adult", "Professional", "Academic"];

const TONES = ["Engaging", "Mysterious", "Humorous", "Academic", "Suspenseful", "Atmospheric", "Inspirational", "Dark", "Lighthearted", "Formal"];

const POVS = ["First Person", "Second Person", "Third Person Limited", "Third Person Omniscient"];

const TRIM_SIZES = ["5 x 8 in", "5.25 x 8 in", "5.5 x 8.5 in", "6 x 9 in", "7 x 10 in", "8.5 x 11 in"];
const PAPER_TYPES = ["White", "Cream", "Premium Color"];
const COVER_FINISHES = ["Matte", "Glossy"];

export function CreateBookDialog() {
  const [open, setOpen] = useState(false);
  const createBook = useCreateBook();

  const form = useForm<InsertBook>({
    resolver: zodResolver(insertBookSchema),
    defaultValues: {
      title: "",
      authorName: "",
      category: "Literature & Fiction",
      language: "English",
      targetAudience: "Adult",
      toneStyle: "Engaging",
      pov: "Third Person Limited",
      minWordCount: 50000,
      targetChapters: 10,
      wordsPerChapter: 2500,
      trimSize: "6 x 9 in",
      paperType: "White",
      isBleed: false,
      coverFinish: "Matte",
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
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex justify-start">Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select audience" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {AUDIENCES.map((aud) => (
                          <SelectItem key={aud} value={aud}>{aud}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TONES.map((tone) => (
                          <SelectItem key={tone} value={tone}>{tone}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select POV" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {POVS.map((pov) => (
                          <SelectItem key={pov} value={pov}>{pov}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="bg-muted/50 p-4 rounded-lg space-y-4 border border-border/50">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Amazon KDP Print Settings</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="trimSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trim Size</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TRIM_SIZES.map((size) => (
                            <SelectItem key={size} value={size}>{size}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paperType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paper Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select paper" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PAPER_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="coverFinish"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cover Finish</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select finish" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COVER_FINISHES.map((finish) => (
                            <SelectItem key={finish} value={finish}>{finish}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isBleed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-background">
                      <div className="space-y-0.5">
                        <FormLabel>Bleed</FormLabel>
                        <FormDescription>Includes bleed in formatting</FormDescription>
                      </div>
                      <FormControl>
                        <Input 
                          type="checkbox" 
                          className="w-4 h-4" 
                          checked={field.value} 
                          onChange={(e) => field.onChange(e.target.checked)} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
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
