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
}

console.log("invoicingDataService.js loaded!");