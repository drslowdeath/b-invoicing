// main.js
import Alpine from 'https://cdn.skypack.dev/alpinejs';
import { ClientsDataService } from './clientsDataService.js';
import { ClientsUI } from './clientsUITableRender.js';
import { StylesUI } from './stylesUIRender.js';
import { InvoicingUI } from './invoicingUIRender.js';

// Initialization for ES Users

window.Alpine = Alpine
Alpine.start()

// Event Listener for the DOMContentLoaded event
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM fully loaded and parsed");
    const clientsDataService = new ClientsDataService();
    const clientsUI = new ClientsUI('#tableClients');
    const stylesUI = new StylesUI('.client-modal', '.client-dropdown-list', '#stylesTable');
    //const invoicingUI = new InvoicingUI('.invoice-client-modal', '.invoice-dropdown-list', '#invoiceStylesTable', '#invoiceTable');
    //invoicingUI.loadClients();

    try {
        const clients = await clientsDataService.fetchClients();
        clientsUI.renderClients(clients);
        clientsUI.attachEventListeners();
    } catch (error) {
        console.error('Error initializing app:', error);
    }
    
    // Add client form submission event listener
    const clientForm = document.getElementById('addClientForm');
    clientForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent the default form submission behavior

        // Extract data from the form
        const formData = new FormData(event.target);
        const newClient = Object.fromEntries(formData.entries());

        console.log('Sending client data:', newClient);
        
        try {
            const response = await clientsDataService.addClient(newClient);
            console.log('Client added:', response);
    
            // Clear the form after the client is added
            clientForm.reset();
    
            // Fetch and render the updated list of clients
            const updatedClients = await clientsDataService.fetchClients();
            clientsUI.renderClients(updatedClients);
        } catch (error) {
            console.error('Error adding client:', error);
        }
    });
});



console.log("Hello from main.js!");

