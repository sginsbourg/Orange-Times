# Orange Times - User Manual & Technical Specifications

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

*   **Storage Mechanism**: The application uses the browser's `localStorage` API to store all user data.
*   **Cached Data**: This includes:
    *   All timesheet entries.
    *   The list of customers and their associated projects and emails.
    *   The current state of all input forms to prevent data loss on page refresh.
*   **Privacy**: Because data is stored locally, it is completely private to the user's machine and browser. It is not transmitted over the network or stored on any server.

### 2.3. Forms and Validation

*   **Form Management**: [React Hook Form](https://react-hook-form.com/) is used for managing form state and submission.
*   **Schema Validation**: [Zod](https://zod.dev/) is used to define validation schemas for all forms, ensuring data integrity.

### 2.4. Project Structure

*   `src/app/page.tsx`: The main entry point and layout of the application.
*   `src/components/timesheet-form.tsx`: The core React component that contains all UI elements, logic, and state management for the application.
*   `src/components/ui/`: Contains all the reusable UI components from the shadcn/ui library.
*   `src/lib/utils.ts`: Utility functions, primarily for merging Tailwind CSS classes.
*   `src/hooks/`: Contains custom React hooks, such as `use-toast` for notifications.
*   `public/`: Public assets for the application.
