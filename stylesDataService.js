// stylesDataService.js
console.log("Hello from stylesDataService.js!");
export class StylesDataService {
    fetchClients() {
        return this.fetchFromAPI('/clients')
            .then(clients => clients.sort((a, b) => a.name.localeCompare(b.name)));
    }
    
    async fetchStylesByClient(clientId) {
        const response = await this.fetchFromAPI('/styles/client/' + clientId);
        return response;
    }

    async fetchFromAPI(endpoint) {
        try {
            const response = await fetch(endpoint);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching data:', error);
            return []; // Return empty array in case of error to prevent further errors
        }
    }

    async addStyle(clientId, styleData) {
        try {
            const response = await fetch('/styles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: styleData.name, // Ensure the key matches the server's expected field
                    price: styleData.price,
                    client_id: clientId // Make sure you are passing the clientId properly
                }),
            });
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error adding style:', error);
        }
    }

    async updateStyle(styleId, styleData) {
        try {
            const response = await fetch(`/styles/${styleId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: styleData.name, // Ensure this field matches your database column
                    price: parseFloat(styleData.price) // Convert price string to a float
                }),
            });
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error updating style:', error);
        }
    }

    async deleteStyle(styleId) {
        try {
            const response = await fetch(`/styles/${styleId}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error deleting style:', error);
        }
    }
}
console.log("stylesDataService.js loaded!");