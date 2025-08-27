"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { format } from "date-fns"
import { CalendarIcon, Download, Clock, Users, Mail, Save } from "lucide-react"
import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

const customers = [
  "Innovate Inc.",
  "Quantum Solutions",
  "Stellar Corp.",
  "Apex Industries",
  "Nexus Global",
]

const formSchema = z.object({
  customer: z.string({
    required_error: "Please select a customer.",
  }),
  date: z.date({
    required_error: "A date is required.",
  }),
  entranceTime: z.string({ required_error: "Entrance time is required." }),
  exitTime: z.string({ required_error: "Exit time is required." }),
}).refine(data => {
    if (!data.entranceTime || !data.exitTime) return true;
    return data.exitTime > data.entranceTime;
}, {
    message: "Exit time must be after entrance time.",
    path: ["exitTime"],
});


type FormData = z.infer<typeof formSchema>;

const LOCAL_STORAGE_KEY = "timesheetFormData";
const ID_COUNTER_KEY = "timesheetIdCounter";

export default function TimeSheetForm() {
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      entranceTime: "10:00",
      exitTime: "15:00",
    },
  })

  const watchedValues = form.watch();

  useEffect(() => {
    try {
      const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        form.reset({
          ...parsedData,
          date: parsedData.date ? new Date(parsedData.date) : new Date()
        });
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
    }
    setIsMounted(true);
  }, [form]);

  useEffect(() => {
    if (isMounted) {
      try {
        const dataToSave = JSON.stringify(watchedValues);
        localStorage.setItem(LOCAL_STORAGE_KEY, dataToSave);
      } catch (error) {
        console.error("Failed to save data to localStorage", error);
      }
    }
  }, [watchedValues, isMounted]);

  const generateReportId = (): string => {
    const now = new Date();
    const yearMonth = format(now, 'yyyy-MM');
    let counter = 1;

    try {
      const storedCounters = localStorage.getItem(ID_COUNTER_KEY);
      const counters = storedCounters ? JSON.parse(storedCounters) : {};
      
      if (counters[yearMonth]) {
        counter = counters[yearMonth] + 1;
      }
      
      counters[yearMonth] = counter;
      localStorage.setItem(ID_COUNTER_KEY, JSON.stringify(counters));

    } catch (error) {
      console.error("Failed to manage report ID counter", error);
      // Continue with default counter if localStorage fails
    }
    
    return `${yearMonth}-${String(counter).padStart(4, '0')}`;
  }
  
  const calculateHours = (entrance: string, exit: string): number => {
    const entranceDate = new Date(`1970-01-01T${entrance}:00`);
    const exitDate = new Date(`1970-01-01T${exit}:00`);
    if (exitDate <= entranceDate) return 0;
    const diff = exitDate.getTime() - entranceDate.getTime();
    return parseFloat((diff / (1000 * 60 * 60)).toFixed(2));
  }


  const generateCsvContent = (values: FormData, id: string) => {
    const headers = "ID,Customer,Date,Hours";
    const hours = calculateHours(values.entranceTime, values.exitTime);
    const row = `"${id}","${values.customer}","${format(values.date, "yyyy-MM-dd")}","${hours}"`;
    return `${headers}\n${row}`;
  }

  const handleSaveToFile = (values: FormData) => {
    try {
      const reportId = generateReportId();
      const csvContent = generateCsvContent(values, reportId);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      const fileName = `timesheet-${reportId}.csv`;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);

      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Success!",
        description: `Report ${reportId} has been saved to a file.`,
      });

    } catch (error) {
       toast({
        title: "Error saving file",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  }

  const handleExportToEmail = (values: FormData) => {
    try {
      const reportId = generateReportId();
      const csvContent = generateCsvContent(values, reportId);
      const subject = `Timesheet Report ${reportId} for ${values.customer}`;
      const body = `Hi,\n\nPlease find the attached timesheet data (Report ID: ${reportId}).\n\n${csvContent}\n\nThanks,`;
      const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoLink;
       toast({
        title: "Success!",
        description: "Your email client has been opened.",
      });
    } catch (error) {
       toast({
        title: "Error exporting to email",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    // This function can be used for server submission if needed in the future.
    // For now, buttons have their own handlers.
    console.log("Form submitted", values);
  }

  return (
    <Card className="w-full max-w-lg shadow-lg">
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-3xl font-headline">TimeSheetGen</CardTitle>
        <CardDescription>Create your CSV hours report in a few clicks.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="customer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Users className="mr-2 h-4 w-4 text-muted-foreground" />Customer</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer} value={customer}>
                          {customer}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="flex items-center"><CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="entranceTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><Clock className="mr-2 h-4 w-4 text-muted-foreground" />Entrance Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="exitTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><Clock className="mr-2 h-4 w-4 text-muted-foreground" />Exit Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
                <Button type="button" onClick={form.handleSubmit(handleSaveToFile)} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    <Save className="mr-2 h-4 w-4" />
                    Save to File
                </Button>
                <Button type="button" onClick={form.handleSubmit(handleExportToEmail)} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                    <Mail className="mr-2 h-4 w-4" />
                    Export to Email
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
