console.log("Hello from clientsDataService.js!");

export class ClientsDataService {
    async fetchClients() {
        try {
            const response = await fetch('/clients'); // Use relative URL
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching clients:', error);
        }
    }
    async addClient(clientData) {
        console.log("Sending data to server:", clientData);
        try {
            const response = await fetch('/clients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(clientData)
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error sending client data:', error);
            throw error; // rethrow the error for the caller to handle
        }
    }
    async updateClient(clientId, clientData) {
        console.log("Updating client on server:", clientId, clientData);
        try {
            const response = await fetch(`/clients/${clientId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(clientData)
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error updating client data:', error);
            throw error;
        }
    }
    async deleteClient(clientId) {
        console.log("Deleting client on server:", clientId);
        try {
            const response = await fetch(`/clients/${clientId}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error deleting client:', error);
            throw error;
        }
    }
    // Add other data-related methods here (e.g., createClient, deleteClient, etc.)
    // Make sure to use relative URLs for these methods as well
}

console.log("clientsDataService.js loaded!");
