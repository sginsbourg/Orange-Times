'use server';
/**
 * @fileOverview A flow to handle adding a new customer on the server.
 *
 * - addCustomer - A function that handles adding a new customer.
 * - AddCustomerInput - The input type for the addCustomer function.
 * - AddCustomerOutput - The return type for the addCustomer function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AddCustomerInputSchema = z.object({
  name: z.string().describe('The full name of the customer.'),
  email: z.string().optional().describe('The email address of the customer.'),
  companyName: z.string().describe('The company name of the customer.'),
});
export type AddCustomerInput = z.infer<typeof AddCustomerInputSchema>;

const AddCustomerOutputSchema = z.object({
  success: z.boolean().describe('Whether the customer was added successfully.'),
  error: z.string().optional().describe('An error message if the operation failed.'),
});
export type AddCustomerOutput = z.infer<typeof AddCustomerOutputSchema>;

export async function addCustomer(
  input: AddCustomerInput
): Promise<AddCustomerOutput> {
  return addCustomerFlow(input);
}

const addCustomerFlow = ai.defineFlow(
  {
    name: 'addCustomerFlow',
    inputSchema: AddCustomerInputSchema,
    outputSchema: AddCustomerOutputSchema,
  },
  async (input) => {
    console.log('Adding new customer to the server:', input);

    // TODO: Implement actual server-side logic, e.g., saving to a database.
    // For now, we will just simulate a successful operation.
    
    return {
      success: true,
    };
  }
);
