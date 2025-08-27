"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { format } from "date-fns"
import { CalendarIcon, Download, Clock, Users, Mail, Save, Hourglass, Book, Archive, UserPlus, ClipboardList, Building, ListPlus, Trash2, FileText, Loader2, RefreshCw } from "lucide-react"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
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
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { addCustomer, AddCustomerInput } from "@/ai/flows/add-customer-flow"

type Customer = {
  name: string;
  email: string;
  companyName: string;
  projects: string[];
};

const initialCustomers: Customer[] = [
  { name: "Alice Johnson", email: "", companyName: "Innovate Inc.", projects: ["Project Alpha", "Project Beta"] },
  { name: "Bob Williams", email: "", companyName: "Quantum Solutions", projects: ["Project Gamma"] },
  { name: "Charlie Brown", email: "", companyName: "Stellar Corp.", projects: [] },
  { name: "Diana Miller", email: "", companyName: "Apex Industries", projects: ["Project Delta", "Project Epsilon", "Project Zeta"] },
  { name: "Ethan Davis", email: "", companyName: "Nexus Global", projects: [] },
];

const formSchema = z.object({
  customer: z.string({
    required_error: "Please select a customer.",
  }).min(1, "Please select a customer."),
  project: z.string({
    required_error: "Please select a project.",
  }).min(1, "Please select a project."),
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
    newCustomerCompanyName: z.string().min(1, "Company name is required."),
});

const newProjectSchema = z.object({
  customerForProject: z.string().min(1, "Please select a customer."),
  newProjectName: z.string().min(1, "Project name is required."),
});


type FormData = z.infer<typeof formSchema>;
type TimesheetEntry = FormData & { id: string };

const DAILY_FORM_STORAGE_KEY = "timesheetFormData";
const MONTHLY_FORM_STORAGE_KEY = "timesheetMonthlyFormData";
const NEW_CUSTOMER_FORM_STORAGE_KEY = "timesheetNewCustomerFormData";
const NEW_PROJECT_FORM_STORAGE_KEY = "timesheetNewProjectFormData";
const TIMESHEET_ENTRIES_KEY = "timesheetEntries";
const ID_COUNTER_KEY = "timesheetIdCounter";
const CUSTOMERS_KEY = "timesheetCustomers";

const readmeContent = `# Orange Times - User Manual & Technical Specifications

## 1. User Manual

### Introduction

Orange Times is a web application designed to help you easily track your work hours, manage customers and projects, and generate timesheet reports in CSV format. All data is saved directly in your browser, ensuring your information remains private and accessible without needing an internet connection.

### Core Features

#### 1.1. Creating a Timesheet Entry

This is the main form for your daily entries.

1.  **Customer**: Select a customer from the dropdown list. The list includes their company name for easy identification.
2.  **Project**: Once a customer is selected, choose the relevant project from the project dropdown. This field is mandatory.
3.  **Date**: Pick the date for the timesheet entry.
4.  **Entrance & Exit Time**: Set the start and end times for the work session.
5.  **Total Hours**: The total duration is calculated automatically and displayed.

#### 1.2. Saving and Exporting a Single Entry

You have three options for each entry:

*   **Save Entry**: Saves the entry to your browser's local storage. It will appear in the "Review Entries" table at the bottom of the page. This is ideal for logging entries throughout the day.
*   **Save to File**: Saves the entry locally and immediately downloads a CSV file containing only that single entry.
*   **Export to Email**: Saves the entry locally and opens your default email client with a pre-filled email containing the entry's details and CSV data in the body.

#### 1.3. Managing Customers

You can add new customers to your list.

1.  Navigate to the "Add New Customer" section.
2.  Enter the customer's **Full Name**, **Company Name**, and an optional **Email Address**.
3.  Click "Add Customer". The new customer will now be available in all customer selection dropdowns.

#### 1.4. Managing Projects

You can add or remove projects for each customer.

1.  **Add a Project**:
    *   Go to the "Manage Projects" section.
    *   Select the customer you want to add a project for.
    *   Enter the "New Project Name".
    *   Click "Add Project".
2.  **Remove a Project**:
    *   In the project list under the "Manage Projects" form, find the project you wish to remove.
    *   Click the trash can icon next to the project name.

#### 1.5. Generating a Monthly Report

This feature compiles all entries for a specific customer and month into a single report.

1.  Navigate to the "Monthly Report" section.
2.  Select the **Customer** and the desired **Month**.
3.  The customer's email address will be auto-filled if it has been saved before. You can also update it here.
4.  Click "Email Monthly Report". This action opens your email client with a pre-filled email containing a summary, total hours, and all relevant timesheet entries in CSV format.

#### 1.6. Backing Up Your Data

You can create a complete backup of all your saved timesheet entries.

1.  Go to the "Backup" section.
2.  Click "Email Full Backup".
3.  Your email client will open with a pre-filled email containing a single CSV file with all your historical data.

#### 1.7. Reviewing Entries

At the bottom of the page, the "Review Entries" table displays all the timesheet entries you have saved locally. You can quickly verify your logged hours, dates, and project details here.

---

## 2. Technical Specifications

### 2.1. Frontend Stack

*   **Framework**: [Next.js](https://nextjs.org/) (using the App Router)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **UI Library**: [React](https://react.dev/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **Component Library**: [shadcn/ui](https://ui.shadcn.com/)
*   **Icons**: [Lucide React](https://lucide.dev/)

### 2.2. Data Persistence

*   **Storage Mechanism**: The application uses the browser's \`localStorage\` API to store all user data.
*   **Cached Data**: This includes:
    *   All timesheet entries.
    *   The list of customers and their associated projects and emails.
    *   The current state of all input forms to prevent data loss on page refresh.
*   **Privacy**: Because data is stored locally, it is completely private to the user's machine and browser. It is not transmitted over the network or stored on any server.

### 2.3. Forms and Validation

*   **Form Management**: [React Hook Form](https://react-hook-form.com/) is used for managing form state and submission.
*   **Schema Validation**: [Zod](https://zod.dev/) is used to define validation schemas for all forms, ensuring data integrity.

### 2.4. Project Structure

*   \`src/app/page.tsx\`: The main entry point and layout of the application.
*   \`src/components/timesheet-form.tsx\`: The core React component that contains all UI elements, logic, and state management for the application.
*   \`src/components/ui/\`: Contains all the reusable UI components from the shadcn/ui library.
*   \`src/lib/utils.ts\`: Utility functions, primarily for merging Tailwind CSS classes.
*   \`src/hooks/\`: Contains custom React hooks, such as \`use-toast\` for notifications.
*   \`public/\`: Public assets for the application.
`;


export default function TimeSheetForm() {
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [calculatedHours, setCalculatedHours] = useState<number>(0);
  const [timesheetEntries, setTimesheetEntries] = useState<TimesheetEntry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [isSyncingCustomers, setIsSyncingCustomers] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer: "",
      project: "",
      entranceTime: "10:00",
      exitTime: "15:00",
    },
  });

  const monthlyReportForm = useForm<z.infer<typeof monthlyReportSchema>>({
    resolver: zodResolver(monthlyReportSchema),
    defaultValues: {
      customer: "",
      customerEmail: "",
    },
  });
  
  const newCustomerForm = useForm<z.infer<typeof newCustomerSchema>>({
    resolver: zodResolver(newCustomerSchema),
    defaultValues: {
      newCustomerName: "",
      newCustomerEmail: "",
      newCustomerCompanyName: "",
    },
  });

  const newProjectForm = useForm<z.infer<typeof newProjectSchema>>({
    resolver: zodResolver(newProjectSchema),
    defaultValues: {
      customerForProject: "",
      newProjectName: "",
    },
  });


  const watchedDailyForm = form.watch();
  const watchedMonthlyForm = monthlyReportForm.watch();
  const watchedNewCustomerForm = newCustomerForm.watch();
  const watchedNewProjectForm = newProjectForm.watch();
  const watchedDailyCustomer = form.watch("customer");
  const watchedMonthlyCustomer = monthlyReportForm.watch("customer");

  const calculateHours = (entrance: string, exit: string): number => {
    if (!entrance || !exit) return 0;
    const entranceDate = new Date("1970-01-01T" + entrance + ":00");
    const exitDate = new Date("1970-01-01T" + exit + ":00");
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
      
      const savedMonthlyData = localStorage.getItem(MONTHLY_FORM_STORAGE_KEY);
      if (savedMonthlyData) {
        const parsedData = JSON.parse(savedMonthlyData);
        const validatedData = {
          ...parsedData,
          month: parsedData.month ? new Date(parsedData.month) : new Date(),
        };
        monthlyReportForm.reset(validatedData);
      }

      const savedNewCustomerData = localStorage.getItem(NEW_CUSTOMER_FORM_STORAGE_KEY);
      if (savedNewCustomerData) {
        newCustomerForm.reset(JSON.parse(savedNewCustomerData));
      }
      
      const savedNewProjectData = localStorage.getItem(NEW_PROJECT_FORM_STORAGE_KEY);
      if (savedNewProjectData) {
        newProjectForm.reset(JSON.parse(savedNewProjectData));
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
        localStorage.setItem(DAILY_FORM_STORAGE_KEY, JSON.stringify(watchedDailyForm));
        setCalculatedHours(calculateHours(watchedDailyForm.entranceTime, watchedDailyForm.exitTime));
      } catch (error) {
        console.error("Failed to save daily form data to localStorage", error);
      }
    }
  }, [watchedDailyForm, isMounted]);

  useEffect(() => {
    if (isMounted) {
      try {
        localStorage.setItem(MONTHLY_FORM_STORAGE_KEY, JSON.stringify(watchedMonthlyForm));
      } catch (error) {
        console.error("Failed to save monthly form data to localStorage", error);
      }
    }
  }, [watchedMonthlyForm, isMounted]);

  useEffect(() => {
    if (isMounted) {
      try {
        localStorage.setItem(NEW_CUSTOMER_FORM_STORAGE_KEY, JSON.stringify(watchedNewCustomerForm));
      } catch (error) {
        console.error("Failed to save new customer form data to localStorage", error);
      }
    }
  }, [watchedNewCustomerForm, isMounted]);
  
  useEffect(() => {
    if (isMounted) {
      try {
        localStorage.setItem(NEW_PROJECT_FORM_STORAGE_KEY, JSON.stringify(watchedNewProjectForm));
      } catch (error) {
        console.error("Failed to save new project form data to localStorage", error);
      }
    }
  }, [watchedNewProjectForm, isMounted]);

  useEffect(() => {
     setCalculatedHours(calculateHours(watchedDailyForm.entranceTime, watchedDailyForm.exitTime));
  }, [watchedDailyForm.entranceTime, watchedDailyForm.exitTime]);

  useEffect(() => {
    if (watchedMonthlyCustomer) {
      const customer = customers.find(c => c.name === watchedMonthlyCustomer);
      if (customer) {
        monthlyReportForm.setValue("customerEmail", customer.email);
      }
    } else {
        monthlyReportForm.setValue("customerEmail", "");
    }
  }, [watchedMonthlyCustomer, customers, monthlyReportForm]);
  
  useEffect(() => {
    form.setValue("project", "");
  }, [watchedDailyCustomer, form]);

  
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
  
  const handleDeleteEntry = (id: string) => {
    const updatedEntries = timesheetEntries.filter(entry => entry.id !== id);
    setTimesheetEntries(updatedEntries);
    localStorage.setItem(TIMESHEET_ENTRIES_KEY, JSON.stringify(updatedEntries));
    toast({
      title: "Entry Deleted",
      description: `Entry ${id} has been successfully deleted.`,
    });
  }

  const generateCsvContent = (values: TimesheetEntry[]) => {
    const headers = "ID,Customer,Company,Project,Date,Hours";
    const rows = values.map(entry => {
        const hours = calculateHours(entry.entranceTime, entry.exitTime);
        const customerDetails = customers.find(c => c.name === entry.customer);
        const companyName = customerDetails ? customerDetails.companyName : '';
        return `"${entry.id}","${entry.customer}","${companyName}","${entry.project}","${format(entry.date, "yyyy-MM-dd")}","${hours}"`;
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
      const hours = calculateHours(newEntry.entranceTime, newEntry.exitTime);
      const customerDetails = customers.find(c => c.name === newEntry.customer);
      const companyName = customerDetails ? customerDetails.companyName : '';
      
      const subject = `Timesheet Report ${newEntry.id} for ${values.customer}`;
      const body = `Hi,\n\nThis is a timesheet entry for ${values.customer} (${companyName}).\n\n- **Project**: ${values.project}\n- **Date**: ${format(values.date, "PPP")}\n- **Total Hours**: ${hours.toFixed(2)}\n\nTo create a CSV file, please use the "Save to File" button and attach the file to your email.\n\nThanks,`;
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
        new Date(entry.date).getFullYear() === reportYear &&
        new Date(entry.date).getMonth() === reportMonth
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
      const customerDetails = customers.find(c => c.name === customer);
      const companyName = customerDetails ? customerDetails.companyName : '';

      const subject = `Monthly Timesheet Report for ${customer} (${companyName}) - ${format(month, "MMMM yyyy")}`;
      
      const detailedEntries = filteredEntries.map(entry => {
        const hours = calculateHours(entry.entranceTime, entry.exitTime);
        return `- ${format(new Date(entry.date), "PPP")}: ${hours.toFixed(2)} hours on "${entry.project}"`;
      }).join("\n");

      const body = `Hi,\n\nPlease find the monthly timesheet report for ${customer} for ${format(month, "MMMM yyyy")}.\n\n**Total Hours: ${totalHours.toFixed(2)}**\n\n---\n\nEntries:\n${detailedEntries}\n\n---\n\nCSV Data:\n${csvContent}\n\nThanks,`;
      
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

  const handleAddNewCustomer = async (values: z.infer<typeof newCustomerSchema>) => {
    if (customers.some(c => c.name.toLowerCase() === values.newCustomerName.toLowerCase())) {
        toast({
            title: "Customer Exists",
            description: "A customer with this name already exists.",
            variant: "destructive",
        });
        return;
    }

    setIsAddingCustomer(true);
    try {
      const customerData: AddCustomerInput = {
        name: values.newCustomerName,
        email: values.newCustomerEmail || "",
        companyName: values.newCustomerCompanyName,
      };

      const result = await addCustomer(customerData);

      if (result.success) {
        const newCustomer: Customer = {
          ...customerData,
          projects: [],
        };
        const updatedCustomers = [...customers, newCustomer];
        setCustomers(updatedCustomers);
        localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(updatedCustomers));
        toast({
            title: "Customer Added",
            description: `Successfully added ${newCustomer.name}.`,
        });
        newCustomerForm.reset();
      } else {
        throw new Error(result.error || "Failed to add customer on the server.");
      }
    } catch (error: any) {
        toast({
            title: "Server Error",
            description: error.message || "Something went wrong while adding the customer.",
            variant: "destructive",
        });
    } finally {
      setIsAddingCustomer(false);
    }
  };

  const handleSyncCustomers = async () => {
    setIsSyncingCustomers(true);
    let successCount = 0;
    let errorCount = 0;

    try {
        for (const customer of customers) {
            try {
                const result = await addCustomer(customer);
                if (result.success) {
                    successCount++;
                } else {
                    errorCount++;
                    console.error(`Failed to sync customer ${customer.name}: ${result.error}`);
                }
            } catch (e) {
                errorCount++;
                console.error(`Error syncing customer ${customer.name}`, e);
            }
        }

        if (errorCount > 0) {
            toast({
                title: "Sync Partially Successful",
                description: `${successCount} customers synced, ${errorCount} failed. Check console for details.`,
                variant: "destructive",
            });
        } else {
            toast({
                title: "Sync Complete!",
                description: `Successfully synced all ${successCount} customers with the server.`,
            });
        }
    } catch (error) {
        toast({
            title: "Sync Failed",
            description: "An unexpected error occurred during the sync process.",
            variant: "destructive",
        });
    } finally {
        setIsSyncingCustomers(false);
    }
};

  const handleAddNewProject = (values: z.infer<typeof newProjectSchema>) => {
    const { customerForProject, newProjectName } = values;
    const updatedCustomers = customers.map(c => {
        if (c.name === customerForProject) {
            if (c.projects.some(p => p.toLowerCase() === newProjectName.toLowerCase())) {
                toast({
                    title: "Project Exists",
                    description: `Project "${newProjectName}" already exists for ${customerForProject}.`,
                    variant: "destructive",
                });
                return c;
            }
            return { ...c, projects: [...c.projects, newProjectName] };
        }
        return c;
    });

    if (JSON.stringify(updatedCustomers) !== JSON.stringify(customers)) {
        setCustomers(updatedCustomers);
        localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(updatedCustomers));
        toast({
            title: "Project Added",
            description: `Successfully added "${newProjectName}" to ${customerForProject}.`,
        });
        newProjectForm.reset();
    }
  };

  const handleRemoveProject = (customerName: string, projectName: string) => {
    const updatedCustomers = customers.map(c => {
        if (c.name === customerName) {
            return { ...c, projects: c.projects.filter(p => p !== projectName) };
        }
        return c;
    });
    setCustomers(updatedCustomers);
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(updatedCustomers));
    toast({
        title: "Project Removed",
        description: `Successfully removed "${projectName}" from ${customerName}.`,
    });
  }


  return (
    <Card className="w-full max-w-lg shadow-lg">
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-3xl font-headline">Orange Times</CardTitle>
        <CardDescription>Create your CSV hours report in a few clicks.</CardDescription>
        <CardDescription>Optimized for Android on Samsung Galaxy 24 Plus</CardDescription>
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
                          {customer.name} ({customer.companyName})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {watchedDailyCustomer && (
              <FormField
                control={form.control}
                name="project"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><ListPlus className="mr-2 h-4 w-4 text-muted-foreground" />Project</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.find(c => c.name === watchedDailyCustomer)?.projects.map((project) => (
                          <SelectItem key={project} value={project}>
                            {project}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
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
                        name="newCustomerCompanyName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center"><Building className="mr-2 h-4 w-4 text-muted-foreground" />Company Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter company's name" {...field} />
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
                                    <Input type="email" placeholder="Enter customer's email (optional)" {...field} value={field.value ?? ""} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button type="submit" className="w-full" disabled={isAddingCustomer || isSyncingCustomers}>
                          {isAddingCustomer ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                              <UserPlus className="mr-2 h-4 w-4" />
                          )}
                          Add Customer
                      </Button>
                      <Button type="button" variant="outline" className="w-full" onClick={handleSyncCustomers} disabled={isAddingCustomer || isSyncingCustomers}>
                          {isSyncingCustomers ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                              <RefreshCw className="mr-2 h-4 w-4" />
                          )}
                          Sync Customers
                      </Button>
                    </div>
                </form>
            </Form>
        </div>
      </CardContent>
      <Separator className="my-4" />
      <CardContent>
        <div className="space-y-4">
            <h3 className="text-xl font-semibold text-center flex items-center justify-center"><ListPlus className="mr-2 h-5 w-5" />Manage Projects</h3>
             <Form {...newProjectForm}>
                <form onSubmit={newProjectForm.handleSubmit(handleAddNewProject)} className="space-y-4">
                    <FormField
                        control={newProjectForm.control}
                        name="customerForProject"
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
                                          {customer.name} ({customer.companyName})
                                        </SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={newProjectForm.control}
                        name="newProjectName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center"><Book className="mr-2 h-4 w-4 text-muted-foreground" />New Project Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter project name" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="w-full">
                        <ListPlus className="mr-2 h-4 w-4" />
                        Add Project
                    </Button>
                </form>
            </Form>
            <div className="space-y-2">
                {customers.map(customer => (
                    customer.projects.length > 0 && (
                        <div key={customer.name}>
                            <h4 className="font-semibold">{customer.name}'s Projects:</h4>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {customer.projects.map(project => (
                                    <Badge key={project} variant="secondary" className="flex items-center gap-1">
                                        {project}
                                        <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleRemoveProject(customer.name, project)}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )
                ))}
            </div>
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
                                <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a customer" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {customers.map((customer) => (
                                        <SelectItem key={customer.name} value={customer.name}>
                                          {customer.name} ({customer.companyName})
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
                                        <Input type="email" placeholder="Enter customer's email" {...field} value={field.value ?? ""} />
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
      <Separator className="my-4" />
        <CardContent>
            <div className="space-y-4">
                <h3 className="text-xl font-semibold text-center flex items-center justify-center">
                    <ClipboardList className="mr-2 h-5 w-5" />
                    Review Entries
                </h3>
                {timesheetEntries.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Project</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Hours</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {timesheetEntries.map((entry) => {
                                return (
                                <TableRow key={entry.id}>
                                    <TableCell className="font-medium">{entry.id}</TableCell>
                                    <TableCell>{entry.customer}</TableCell>
                                    <TableCell>{entry.project}</TableCell>
                                    <TableCell>{format(new Date(entry.date), 'PPP')}</TableCell>
                                    <TableCell>{calculateHours(entry.entranceTime, entry.exitTime).toFixed(2)}</TableCell>
                                    <TableCell className="text-right">
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete the timesheet entry {entry.id}.
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteEntry(entry.id)}>
                                                    Delete
                                                </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                ) : (
                    <p className="text-sm text-muted-foreground text-center">No entries have been saved yet.</p>
                )}
            </div>
        </CardContent>
        <Separator className="my-4" />
        <CardContent>
            <div className="space-y-4">
                <h3 className="text-xl font-semibold text-center flex items-center justify-center">
                    <FileText className="mr-2 h-5 w-5" />
                    Documentation
                </h3>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                            <FileText className="mr-2 h-4 w-4" /> View Documentation
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                        <DialogTitle>README.md</DialogTitle>
                        <DialogDescription>
                            Application documentation.
                        </DialogDescription>
                        </DialogHeader>
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                           <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm whitespace-pre-wrap">
                                <code>
                                    {readmeContent}
                                </code>
                           </pre>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </CardContent>
        <CardFooter className="justify-center text-xs text-muted-foreground pt-6">
            Version 0.1.0
        </CardFooter>
    </Card>
  )
}
