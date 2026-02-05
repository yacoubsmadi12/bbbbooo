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
      genre: "الرواية",
      language: "Arabic",
      targetAudience: "البالغين",
      toneStyle: "جذاب",
      pov: "ضمير الغائب",
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
          <Plus className="h-4 w-4" /> مشروع كتاب جديد
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-right">ابدأ كتابًا جديدًا</DialogTitle>
          <DialogDescription className="text-right">
            أدخل البيانات الوصفية لتحفتك الجديدة. سيستخدم الذكاء الاصطناعي هذا لتوجيه التوليد.
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
                    <FormLabel className="flex justify-start">عنوان الكتاب</FormLabel>
                    <FormControl>
                      <Input placeholder="العنوان الرائع" className="font-serif text-lg text-right" {...field} />
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
                    <FormLabel className="flex justify-start">اسم المؤلف</FormLabel>
                    <FormControl>
                      <Input placeholder="اسمك الكريم" className="text-right" {...field} />
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
                    <FormLabel className="flex justify-start">النوع</FormLabel>
                    <FormControl>
                      <Input placeholder="خيال علمي، إثارة، رومانسي..." className="text-right" {...field} />
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
                    <FormLabel className="flex justify-start">الجمهور المستهدف</FormLabel>
                    <FormControl>
                      <Input placeholder="الشباب، المحترفون..." className="text-right" {...field} />
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
                    <FormLabel className="flex justify-start">النبرة والأسلوب</FormLabel>
                    <FormControl>
                      <Input placeholder="غامض، فكاهي، أكاديمي..." className="text-right" {...field} />
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
                    <FormLabel className="flex justify-start">وجهة النظر</FormLabel>
                    <FormControl>
                      <Input placeholder="ضمير المتكلم، ضمير الغائب..." className="text-right" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="bg-muted/50 p-4 rounded-lg space-y-4 border border-border/50">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider text-right">قيود الطول</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" dir="ltr">
                <FormField
                  control={form.control}
                  name="minWordCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex justify-center">إجمالي الكلمات</FormLabel>
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
                      <FormLabel className="flex justify-center">عدد الفصول</FormLabel>
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
                      <FormLabel className="flex justify-center">كلمة/فصل</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={createBook.isPending}>
                {createBook.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                إنشاء المشروع
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
