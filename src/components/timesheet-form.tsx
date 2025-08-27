"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { format } from "date-fns"
import { CalendarIcon, Download, Clock, Users, Mail, Save, Hourglass, Book, Archive, UserPlus } from "lucide-react"
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
import { Separator } from "@/components/ui/separator"

type Customer = {
  name: string;
  email: string;
};

const initialCustomers: Customer[] = [
  { name: "Innovate Inc.", email: "" },
  { name: "Quantum Solutions", email: "" },
  { name: "Stellar Corp.", email: "" },
  { name: "Apex Industries", email: "" },
  { name: "Nexus Global", email: "" },
];

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

const monthlyReportSchema = z.object({
    customer: z.string({ required_error: "Please select a customer." }),
    month: z.date({ required_error: "Please select a month." }),
    customerEmail: z.string().email("Please enter a valid email.").optional().or(z.literal('')),
});

const newCustomerSchema = z.object({
    newCustomerName: z.string().min(1, "Customer name is required."),
    newCustomerEmail: z.string().email("Please enter a valid email.").optional().or(z.literal('')),
});


type FormData = z.infer<typeof formSchema>;
type TimesheetEntry = FormData & { id: string };

const DAILY_FORM_STORAGE_KEY = "timesheetFormData";
const TIMESHEET_ENTRIES_KEY = "timesheetEntries";
const ID_COUNTER_KEY = "timesheetIdCounter";
const CUSTOMERS_KEY = "timesheetCustomers";


export default function TimeSheetForm() {
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [calculatedHours, setCalculatedHours] = useState<number>(0);
  const [timesheetEntries, setTimesheetEntries] = useState<TimesheetEntry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      entranceTime: "10:00",
      exitTime: "15:00",
    },
  });

  const monthlyReportForm = useForm<z.infer<typeof monthlyReportSchema>>({
    resolver: zodResolver(monthlyReportSchema),
  });
  
  const newCustomerForm = useForm<z.infer<typeof newCustomerSchema>>({
    resolver: zodResolver(newCustomerSchema),
    defaultValues: {
      newCustomerName: "",
      newCustomerEmail: "",
    },
  });


  const watchedValues = form.watch();
  const watchedMonthlyCustomer = monthlyReportForm.watch("customer");

  const calculateHours = (entrance: string, exit: string): number => {
    if (!entrance || !exit) return 0;
    const entranceDate = new Date(`1970-01-01T${entrance}:00`);
    const exitDate = new Date(`1970-01-01T${exit}:00`);
    if (exitDate <= entranceDate) return 0;
    const diff = exitDate.getTime() - entranceDate.getTime();
    return parseFloat((diff / (1000 * 60 * 60)).toFixed(2));
  }

  useEffect(() => {
    setIsMounted(true);
    try {
      const savedDailyData = localStorage.getItem(DAILY_FORM_STORAGE_KEY);
      if (savedDailyData) {
        const parsedData = JSON.parse(savedDailyData);
        const validatedData = {
          ...parsedData,
          date: parsedData.date ? new Date(parsedData.date) : new Date(),
        };
        form.reset(validatedData);
      }
      
      const savedEntries = localStorage.getItem(TIMESHEET_ENTRIES_KEY);
      if(savedEntries) {
          const parsedEntries = JSON.parse(savedEntries);
          const validatedEntries = parsedEntries.map((e: any) => ({...e, date: new Date(e.date)}));
          setTimesheetEntries(validatedEntries);
      }
      
      const savedCustomers = localStorage.getItem(CUSTOMERS_KEY);
      if (savedCustomers) {
        setCustomers(JSON.parse(savedCustomers));
      }

    } catch (error) {
      console.error("Failed to load data from localStorage", error);
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
      try {
        const dataToSave = JSON.stringify(watchedValues);
        localStorage.setItem(DAILY_FORM_STORAGE_KEY, dataToSave);
        setCalculatedHours(calculateHours(watchedValues.entranceTime, watchedValues.exitTime));
      } catch (error) {
        console.error("Failed to save data to localStorage", error);
      }
    }
  }, [watchedValues, isMounted]);

  useEffect(() => {
     setCalculatedHours(calculateHours(watchedValues.entranceTime, watchedValues.exitTime));
  }, [watchedValues.entranceTime, watchedValues.exitTime]);

  useEffect(() => {
    if (watchedMonthlyCustomer) {
      const customer = customers.find(c => c.name === watchedMonthlyCustomer);
      if (customer) {
        monthlyReportForm.setValue("customerEmail", customer.email);
      }
    }
  }, [watchedMonthlyCustomer, customers, monthlyReportForm]);

  
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
    }
    
    return `${yearMonth}-${String(counter).padStart(4, '0')}`;
  }
  
  const addTimesheetEntry = (entry: FormData) => {
    const reportId = generateReportId();
    const newEntry: TimesheetEntry = { ...entry, id: reportId };
    const updatedEntries = [...timesheetEntries, newEntry];
    setTimesheetEntries(updatedEntries);
    try {
        localStorage.setItem(TIMESHEET_ENTRIES_KEY, JSON.stringify(updatedEntries));
    } catch (error) {
        console.error("Failed to save entries to localStorage", error);
    }
    return newEntry;
  }
  

  const generateCsvContent = (values: TimesheetEntry[]) => {
    const headers = "ID,Customer,Date,Hours";
    const rows = values.map(entry => {
        const hours = calculateHours(entry.entranceTime, entry.exitTime);
        return `"${entry.id}","${entry.customer}","${format(entry.date, "yyyy-MM-dd")}","${hours}"`;
    });
    return `${headers}\n${rows.join("\n")}`;
  }

  const handleSaveToFile = (values: FormData) => {
    try {
      const newEntry = addTimesheetEntry(values);
      const csvContent = generateCsvContent([newEntry]);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      const fileName = `timesheet-${newEntry.id}.csv`;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);

      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Success!",
        description: `Report ${newEntry.id} has been saved to a file.`,
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
      const newEntry = addTimesheetEntry(values);
      const csvContent = generateCsvContent([newEntry]);
      const subject = `Timesheet Report ${newEntry.id} for ${values.customer}`;
      const body = `Hi,\n\nPlease find the attached timesheet data (Report ID: ${newEntry.id}).\n\n${csvContent}\n\nThanks,`;
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

  const handleMonthlyReport = (values: z.infer<typeof monthlyReportSchema>) => {
    try {
      const { customer, month, customerEmail } = values;

      const updatedCustomers = customers.map(c => 
        c.name === customer ? { ...c, email: customerEmail || "" } : c
      );
      setCustomers(updatedCustomers);
      localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(updatedCustomers));


      const reportYear = month.getFullYear();
      const reportMonth = month.getMonth();

      const filteredEntries = timesheetEntries.filter(entry => 
        entry.customer === customer &&
        entry.date.getFullYear() === reportYear &&
        entry.date.getMonth() === reportMonth
      );

      if (filteredEntries.length === 0) {
        toast({
          title: "No Data",
          description: `No timesheet entries found for ${customer} in ${format(month, "MMMM yyyy")}.`,
          variant: "destructive",
        });
        return;
      }

      const csvContent = generateCsvContent(filteredEntries);
      const totalHours = filteredEntries.reduce((acc, entry) => acc + calculateHours(entry.entranceTime, entry.exitTime), 0);

      const subject = `Monthly Timesheet Report for ${customer} - ${format(month, "MMMM yyyy")}`;
      const body = `Hi,\n\nPlease find the monthly timesheet report for ${customer} for ${format(month, "MMMM yyyy")}.\n\nTotal Hours: ${totalHours.toFixed(2)}\n\n--- CSV Data ---\n${csvContent}\n\nThanks,`;
      const mailtoLink = `mailto:${customerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      
      window.location.href = mailtoLink;
      
      toast({
        title: "Success!",
        description: `Monthly report for ${customer} has been prepared for email.`,
      });
    } catch (error) {
      toast({
        title: "Error generating report",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };


  function onSubmit(values: z.infer<typeof formSchema>) {
    const newEntry = addTimesheetEntry(values);
    toast({
      title: "Entry Saved!",
      description: `Your timesheet entry ${newEntry.id} has been saved locally.`,
    });
  }
  
  const handleBackupAll = () => {
    if (timesheetEntries.length === 0) {
      toast({
        title: "No Data",
        description: "There are no timesheet entries to back up.",
        variant: "destructive",
      });
      return;
    }

    try {
      const csvContent = generateCsvContent(timesheetEntries);
      const subject = "Timesheet Data Backup";
      const body = `Hi,\n\nAttached is your full timesheet data backup.\n\n--- CSV Data ---\n${csvContent}\n\nThanks,`;
      const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      
      window.location.href = mailtoLink;

      toast({
        title: "Success!",
        description: "Backup has been prepared for email.",
      });
    } catch (error) {
      toast({
        title: "Error generating backup",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddNewCustomer = (values: z.infer<typeof newCustomerSchema>) => {
    const newCustomer: Customer = {
        name: values.newCustomerName,
        email: values.newCustomerEmail || "",
    };
    if (customers.some(c => c.name.toLowerCase() === newCustomer.name.toLowerCase())) {
        toast({
            title: "Customer Exists",
            description: "A customer with this name already exists.",
            variant: "destructive",
        });
        return;
    }
    const updatedCustomers = [...customers, newCustomer];
    setCustomers(updatedCustomers);
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(updatedCustomers));
    toast({
        title: "Customer Added",
        description: `Successfully added ${newCustomer.name}.`,
    });
    newCustomerForm.reset();
  };


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
                        <SelectItem key={customer.name} value={customer.name}>
                          {customer.name}
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

            <div className="flex items-center justify-center text-lg font-medium p-4 bg-muted rounded-md">
              <Hourglass className="mr-2 h-5 w-5 text-primary" />
              <span>Total Hours:</span>
              <span className="ml-2 font-bold text-primary">{calculatedHours.toFixed(2)}</span>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
                <Button type="submit" className="w-full">
                    <Save className="mr-2 h-4 w-4" />
                    Save Entry
                </Button>
                <Button type="button" onClick={form.handleSubmit(handleSaveToFile)} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    <Download className="mr-2 h-4 w-4" />
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
      <Separator className="my-4" />
       <CardContent>
        <div className="space-y-4">
            <h3 className="text-xl font-semibold text-center flex items-center justify-center"><UserPlus className="mr-2 h-5 w-5" />Add New Customer</h3>
             <Form {...newCustomerForm}>
                <form onSubmit={newCustomerForm.handleSubmit(handleAddNewCustomer)} className="space-y-4">
                    <FormField
                        control={newCustomerForm.control}
                        name="newCustomerName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center"><Users className="mr-2 h-4 w-4 text-muted-foreground" />Customer Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter customer's full name" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={newCustomerForm.control}
                        name="newCustomerEmail"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground" />Customer Email</FormLabel>
                                <FormControl>
                                    <Input type="email" placeholder="Enter customer's email (optional)" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="w-full">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add Customer
                    </Button>
                </form>
            </Form>
        </div>
      </CardContent>
      <Separator className="my-4" />
      <CardContent>
        <div className="space-y-4">
            <h3 className="text-xl font-semibold text-center flex items-center justify-center"><Book className="mr-2 h-5 w-5" />Monthly Report</h3>
             <Form {...monthlyReportForm}>
                <form onSubmit={monthlyReportForm.handleSubmit(handleMonthlyReport)} className="space-y-4">
                    <FormField
                        control={monthlyReportForm.control}
                        name="customer"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center"><Users className="mr-2 h-4 w-4 text-muted-foreground" />Customer</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a customer" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {customers.map((customer) => (
                                        <SelectItem key={customer.name} value={customer.name}>
                                        {customer.name}
                                        </SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     {watchedMonthlyCustomer && (
                        <FormField
                            control={monthlyReportForm.control}
                            name="customerEmail"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground" />Customer Email</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="Enter customer's email" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                    <FormField
                        control={monthlyReportForm.control}
                        name="month"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel className="flex items-center"><CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />Month</FormLabel>
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
                                                {field.value ? format(field.value, "MMMM yyyy") : <span>Pick a month</span>}
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            defaultMonth={field.value}
                                            onMonthChange={field.onChange}
                                            captionLayout="dropdown-buttons"
                                            fromYear={2020}
                                            toYear={new Date().getFullYear()}
                                            disabled={(date) => date > new Date()}
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                        <Mail className="mr-2 h-4 w-4" />
                        Email Monthly Report
                    </Button>
                </form>
            </Form>
        </div>
      </CardContent>
      <Separator className="my-4" />
      <CardContent>
        <div className="space-y-4">
            <h3 className="text-xl font-semibold text-center flex items-center justify-center"><Archive className="mr-2 h-5 w-5" />Backup</h3>
            <p className="text-sm text-muted-foreground text-center">
                Get a copy of all your timesheet data in a single CSV file.
            </p>
            <Button onClick={handleBackupAll} className="w-full" variant="outline">
                <Mail className="mr-2 h-4 w-4" />
                Email Full Backup
            </Button>
        </div>
      </CardContent>
    </Card>
  )
}
