// invoicingDataService.js
console.log("Hello from invoicingDataService.js!");

export class InvoicingDataService {
    // Define methods similar to those in StylesDataService
    // For example, methods to fetch clients, create, update, and delete invoices
    async fetchClients() {
        try {
            const response = await fetch('/api/clients'); // Adjust the endpoint as needed
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching clients:', error);
            return [];
        }
    }
    async fetchClientById(clientId) {
        try {
            const response = await fetch(`/api/clients/${clientId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error fetching client with ID ${clientId}:`, error);
            return null;
        }
    }
    async fetchClientStyles(clientId) {
        try {
            const response = await fetch(`/api/styles/client/${clientId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error fetching styles for client ${clientId}:`, error);
            return [];
        }
    }
    
    async fetchNextInvoiceNumber() {
        try {
            const response = await fetch('/api/getNextInvoiceNumber');
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching the next invoice number:', error);
            return null;
        }
    }
    
    async saveInvoice(invoiceNumber) {
        try {
            const response = await fetch('/api/saveInvoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ invoiceNumber }),
            });
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error saving the invoice:', error);
            return null;
        }
    }
}
console.log("invoicingDataService.js loaded!");