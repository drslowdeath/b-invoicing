// clientsUITableRender.js
console.log("Hello from clientsUITableRender.js!");
import { ClientsDataService } from './clientsDataService.js';
export class ClientsUI {
    constructor(tableSelector) {
        this.table = document.querySelector(tableSelector);
        this.tbody = this.table.querySelector('tbody'); // Get the table body
        this.clientsDataService = new ClientsDataService(); // Initialize DataService
    }

    toggleEditClient(row, isEdit) {
        const cells = row.querySelectorAll('td');
        cells.forEach((cell, index) => {
            if (index < cells.length - 1) { // Exclude the actions cell
                if (isEdit) {
                    // Create and configure the input field for editing
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.value = cell.textContent;
                    input.className = 'w-full pl-2 py-1 rounded bg-white text-gray-700';
                    input.dataset.field = ['id', 'name', 'company_name', 'address', 'email'][index];
                    cell.innerHTML = '';
                    cell.appendChild(input);
                } else {
                    // Revert back to displaying the text content
                    const input = cell.querySelector('input');
                    if (input) {
                        cell.textContent = input.value;
                    }
                }
            }
        });
    
        // Dynamically set the innerHTML of the actions cell to include the correct icons
        const actionsCell = cells[cells.length - 1];
        actionsCell.innerHTML = isEdit ? 
            `<button class="save-button text-green-500 hover:text-green-700 hover:font-semibold transition-all duration-200" data-id="${row.dataset.id}">
                <i class="fa-solid fa-floppy-disk"></i>
            </button>` :
            `<button class="edit-button text-blue-500 hover:text-blue-700 hover:font-semibold transition-all duration-200" data-id="${row.dataset.id}">
                <i class="fas fa-edit"></i>
            </button>
            <button class="delete-button text-red-500 hover:text-red-600 hover:font-semibold transition-all duration-200" data-id="${row.dataset.id}">
                <i class="fas fa-trash"></i>
            </button>`;
    }

    renderClients(clients) {
        this.clearTable();
        clients.forEach(client => {
            const row = this.tbody.insertRow();
            row.setAttribute('data-id', client.id);
            row.className = 'hover:bg-gray-200 transition-colors duration-200 border-gray-300 border'; 
            this.createCell(row, client.id, 'hidden w-1/12', client.id);
            this.createCell(row, client.name, 'border p-2 w-2/12 whitespace-normal', client.name);
            this.createCell(row, client.company_name, 'w-2/12 border p-2 whitespace-normal', client.company_name);
            this.createCell(row, client.address, 'border p-2 whitespace-normal w-3/12', client.address);
            this.createCell(row, client.email, 'border p-2 whitespace-normal w-1/12', client.email);

            const actionsCell = row.insertCell(5);
            actionsCell.innerHTML = `
            <button class="edit-button text-blue-500 hover:text-blue-700 hover:font-semibold transition-all duration-200" data-id="${client.id}">
                <i class="fas fa-edit"></i>
            </button>
            <button class="delete-button text-red-500 hover:text-red-600 hover:font-semibold transition-all duration-200" data-id="${client.id}">
                <i class="fas fa-trash"></i>
            </button>
        `;
        this.attachSortListener();
        actionsCell.className = 'border p-2 w-2/12'; // Add border
        
            // Add event listeners for edit and delete buttons
        });
    }
    attachSortListener() {
        // Assumes "Name" column is the second header (index 1)
        const nameHeader = this.table.querySelectorAll('th')[1];
        nameHeader.style.cursor = 'pointer'; // Optional: Change cursor on hover to indicate interactivity

        nameHeader.addEventListener('click', () => {
            const isAscending = nameHeader.classList.toggle('ascending');
            this.sortTableByColumn(1, isAscending); // Assuming name is in the second column
        });
    }

    sortTableByColumn(columnIndex, ascending = true) {
        const rowsArray = Array.from(this.tbody.querySelectorAll('tr'));
        rowsArray.sort((a, b) => {
            const aText = a.querySelector(`td:nth-child(${columnIndex + 1})`).textContent.trim().toLowerCase();
            const bText = b.querySelector(`td:nth-child(${columnIndex + 1})`).textContent.trim().toLowerCase();
            return ascending ? aText.localeCompare(bText) : bText.localeCompare(aText);
        });

        // Re-append rows in sorted order
        rowsArray.forEach(row => this.tbody.appendChild(row));
    }


    createCell(row, text, className, data) {
        const cell = row.insertCell();
        cell.textContent = text;
        cell.className = `${className} border-gray-300 border`; 
        cell.setAttribute('data', data);
    }

    clearTable() {
        while (this.tbody.rows.length > 0) {
            this.tbody.deleteRow(0);
        }
    }

    attachEventListeners() {
        this.table.addEventListener('click', async (event) => {
            let target = event.target;
            if (target.tagName === 'I') target = target.closest('button');

            if (target && target.classList.contains('edit-button')) {
            const row = target.closest('tr');
            this.toggleEditClient(row, true);
            } else if (target && target.classList.contains('save-button')) {
                const row = event.target.closest('tr');
                const clientId = row.dataset.id; // Correctly retrieve clientId from the row's dataset
                const inputs = row.querySelectorAll('input');
                let isValid = true;
            
                // Clear previous custom validation messages and styles
                inputs.forEach(input => {
                    input.setCustomValidity(""); // Clear any custom validation messages
                    input.classList.remove('border-red-500'); // Remove error styling
                });
            
                inputs.forEach(input => {
                    let errorMessage = ""; // Initialize an empty error message for each input
                    switch (input.dataset.field) {
                        case 'name':
                        case 'company_name':
                            if (input.value.length === 0 || input.value.length > 50) {
                                errorMessage = "This field cannot be empty and must be less than 50 characters.";
                                isValid = false;
                            }
                            break;
                        case 'address':
                            if (input.value.length === 0 || input.value.length > 100) {
                                errorMessage = "This field cannot be empty and must be less than 100 characters.";
                                isValid = false;
                            }
                            break;
                        case 'email':
                            if (!input.value.match(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/) || input.value.length > 50) {
                                errorMessage = "Please enter a valid email address that is less than 50 characters.";
                                isValid = false;
                            }
                            break;
                    }
                    if (errorMessage !== "") {
                        input.setCustomValidity(errorMessage);
                        input.reportValidity(); // Show the custom validation message
                        input.classList.add('border-red-500'); // Add error styling
                    }
                });
            
                if (!isValid) {
                    return; // Keep the user in edit mode without showing a generic alert
                }
            
                // Proceed with updating client data
                const updatedClient = {
                    id: clientId[0], // Use the retrieved clientId
                    name: inputs[1].value, // Use input values instead of textContent
                    company_name: inputs[2].value,
                    address: inputs[3].value,
                    email: inputs[4].value
                };
            
                console.log('Updating client data:', updatedClient);
            
                try {
                    const response = await this.clientsDataService.updateClient(clientId, updatedClient);
                    console.log('Client updated:', response);
                    this.toggleEditClient(row, false); // Exit edit mode upon successful update
                } catch (error) {
                    console.error('Error updating client:', error);
                }
            } else if (target && target.classList.contains('delete-button')) {
                const row = event.target.closest('tr');
                const clientId = row.getAttribute('data-id'); // Retrieve the data-id attribute
                console.log('Deleting client with ID:', clientId);
                // Use the result of confirm to decide whether to proceed
                if (confirm("Are you sure you want to delete this client?")) {
                    try {
                        const response = await this.clientsDataService.deleteClient(clientId);
                        console.log('Client deleted:', response);
                        row.remove(); // Remove the row from the UI
                    } catch (error) {
                        console.error('Error deleting client:', error);
                    }
                } else {
                    console.log('Client deletion cancelled');
                    // Cancel the operation, do nothing more
                }
            }
             this.applyValidation('#addClientForm input');
        });
        const modalInputs = document.querySelectorAll('#addClientForm input');
        modalInputs.forEach(input => {
            input.addEventListener('input', function() {
                if (this.value.length > 90) {
                    // If input exceeds 90 characters, show custom validation message
                    this.setCustomValidity("Input exceeds 90 characters. Please shorten to continue.");
                    this.reportValidity();
                } else {
                    // Clear custom validation message if input is valid
                    this.setCustomValidity("");
                }
            });
        });
    }
    applyValidation(inputsSelector) {
        const inputs = document.querySelectorAll(inputsSelector);
        inputs.forEach(input => {
            input.addEventListener('input', function() {
                const maxLength = 90;
                if (this.value.length > maxLength) {
                    this.setCustomValidity(`Input exceeds ${maxLength} characters. Please shorten to continue.`);
                    this.reportValidity();
                    this.classList.add('border-red-500');
                } else {
                    this.setCustomValidity("");
                    this.classList.remove('border-red-500');
                }
            });
        });
    }
}

console.log("clientsUITableRender.js loaded!");

