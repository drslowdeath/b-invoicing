// stylesUIRender.js
console.log("Hello from stylesUIRender.js!");
import { StylesDataService } from './stylesDataService.js';

export class StylesUI {
    constructor(clientModalSelector, dropdownSelector, stylesTableSelector) {
        this.clientModal = document.querySelector(clientModalSelector);
        if (!this.clientModal) {
            console.error(`No element found with the selector ${clientModalSelector}`);
        }
        this.dropdown = document.querySelector(dropdownSelector);
        this.stylesTable = document.querySelector(stylesTableSelector);
        this.stylesDataService = new StylesDataService();
        this.initializeModal();
        this.newStyleRowCount = 0;
        this.clientNamesMap = {}; 
        this.currentClientId = null;
        this.initializeAddStyleButton();
        this.initializeSearchBar();
    }

    //reuse in invoicingUI - remember to include init in class constructor :) 
    initializeSearchBar() {
        const searchBar = document.getElementById('stylesTableSearchBar');
        searchBar.addEventListener('input', (event) => {
            this.filterStyles(event.target.value);
        });
    }

    filterStyles(searchTerm) {
        const tbody = this.stylesTable.querySelector('tbody');
        const rows = tbody.querySelectorAll('tr');
    
        // Normalize search term: lowercase and remove diacritics if necessary
        const normalizedSearchTerm = searchTerm.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    
        rows.forEach(row => {
            // Searching for style in first column
            const nameCellText = row.cells[0].textContent;
    
            // Normalize cell text: lowercase and remove diacritics if necessary
            const normalizedCellText = nameCellText.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    
            // Check if the normalized cell text includes the normalized search term
            row.style.display = normalizedCellText.includes(normalizedSearchTerm) ? '' : 'none';
        });
    }

    initializeAddStyleButton() {
        const addStyleBtn = document.getElementById('addStyle');
        addStyleBtn.addEventListener('click', () => {
            if (this.currentClientId) {
                this.addStyleRow(this.currentClientId);
            } else {
                console.error("No client selected or Add Style button clicked without a client selection.");
            }
        });
    }
    initializeModal() {
        const openModalButton = document.querySelector('.open-modal-button');
        if (!openModalButton) {
            console.error('Open modal button not found');
            return;
        }
        openModalButton.addEventListener('click', () => {
            this.loadClients();
            this.clientModal.style.display = 'block'; // Open modal
        });
    
        const closeModalButton = this.clientModal.querySelector('.close-modal-button');
        if (!closeModalButton) {
            console.error('Close modal button not found inside the modal');
            return;
        }
        closeModalButton.addEventListener('click', () => {
            this.clientModal.style.display = 'none'; // Close modal
        });
    
        const searchInput = this.clientModal.querySelector('input[type="search"]');
        if (!searchInput) {
            return;
        }
        searchInput.addEventListener('input', (event) => {
            console.log('Searching for:', event.target.value); // Add this line for debugging
            this.handleSearch(event.target.value);
        });
    }
    

    loadClients() {
        this.stylesDataService.fetchClients()
            .then(clients => {
                this.renderClientsDropdown(clients.sort((a, b) => a.name.localeCompare(b.name)));
                // Ensure the search input is part of the dropdown
                this.ensureSearchInput();
            })
            .catch(error => {
                console.error('Error loading clients:', error);
            });
    }
    
    ensureSearchInput() {
        const dropdownList = document.getElementById('clientDropdownList');
        if (!dropdownList) {
            console.error('Dropdown list not found');
            return;
        }
        
        // Check if search input already exists
        let searchInput = dropdownList.querySelector('#clientSearchInput');
        if (!searchInput) {
            // Create search input if it doesn't exist
            searchInput = document.createElement('input');
            searchInput.id = 'clientSearchInput';
            searchInput.type = 'search';
            searchInput.placeholder = 'Search clients...';
            searchInput.classList.add('w-full', 'p-2', 'focus:outline-none', 'focus:border-blue-500', 'text-gray-700');
    
            // Create a container li for the input
            const inputContainer = document.createElement('li');
            inputContainer.classList.add('border-b', 'border-gray-300');
            inputContainer.appendChild(searchInput);
    
            // Prepend the input container to the dropdown list
            dropdownList.prepend(inputContainer);
    
            // Attach event listener for search
            searchInput.addEventListener('input', (event) => {
                this.handleSearch(event.target.value);
            });
        }
    }

    renderClientsDropdown(clients) {
        const dropdownList = document.getElementById('clientDropdownList');
        dropdownList.innerHTML = ''; // Clear existing items
        this.clientNamesMap = {};

        clients.forEach(client => {
            this.clientNamesMap[client.id] = client.name; // Store client name with ID as key

            const listItem = document.createElement('li');
            listItem.textContent = client.name;
            listItem.dataset.value = client.id;
            listItem.classList.add('cursor-pointer', 'px-4', 'py-2', 'hover:bg-blue-100', 'text-gray-700'); // Add classes to each list item
            listItem.addEventListener('click', () => {
                this.selectClient(client.id);
            });
            dropdownList.appendChild(listItem);
        });
    }
    
    selectClient(clientId) {
        this.currentClientId = clientId;
        this.stylesDataService.fetchStylesByClient(clientId)
            .then(styles => {
                this.renderStylesTable(styles, clientId);
                this.clientModal.style.display = 'none'; // Close the modal
                this.newStyleRowCount = 0; // Reset the newStyleRowCount when a new client is selected
                
                // Use clientNamesMap to get the client's name
                const selectedClientName = this.clientNamesMap[clientId];
                const selectedClientDiv = document.getElementById('selectedClientName');
    
                // Clear previous content
                selectedClientDiv.innerHTML = '';
    
                // Create a new paragraph element, set its content and class
                const nameParagraph = document.createElement('p');
                nameParagraph.textContent = `Selected Client: ${selectedClientName}`;
                nameParagraph.classList.add('font-semibold', 'text-lg', 'text-gray-900' ); // Add your custom class here
    
                // Append the paragraph to the div
                selectedClientDiv.appendChild(nameParagraph);
            })
            .catch(error => {
                console.error('Error loading styles for client:', error);
            });

            // Logic to enable the addStyle button 
            const addStyle = document.getElementById('addStyle');
            addStyle.classList.remove('opacity-50', 'cursor-not-allowed');
            addStyle.removeAttribute('disabled', 'title');
            addStyle.removeAttribute('title');
            
            // Show Search Bar
            document.getElementById('stylesTableSearchBarDiv').classList.remove('hidden');
    }
    
    renderStylesTable(styles) {
        const tbody = this.stylesTable.querySelector('tbody');
        tbody.innerHTML = ''; // Clear previous styles
        
    
        // Populate existing styles
        styles.forEach((style) => {
            const row = tbody.insertRow();
            row.className = 'hover:bg-gray-200 transition-colors duration-200 border-gray-300 border'; // Add classes for styling
            row.setAttribute('data-style-id', style.id); // Set data attribute with style ID
    
            // Style Name Cell
            const nameCell = row.insertCell();
            nameCell.textContent = style.styleName;
            nameCell.className = 'border p-2';
    
            // Price Cell
            const priceCell = row.insertCell();
            priceCell.textContent = style.price;
            priceCell.className = 'border p-2';
    
            // Actions Cell
            const actionsCell = row.insertCell();
            actionsCell.innerHTML = `
                <button class="edit-button text-blue-500 hover:text-blue-700 text-md focus:outline-none transition mr-2">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-button text-red-500 hover:text-red-700 text-md focus:outline-none transition">
                    <i class="fas fa-trash"></i>
                </button>`;
            actionsCell.className = 'border p-2';
    
            // Attach event listeners to Edit and Delete buttons
            actionsCell.querySelector('.edit-button').addEventListener('click', () => {
                this.editStyleRow(row, style);
            });
    
            actionsCell.querySelector('.delete-button').addEventListener('click', () => {
                this.deleteStyle(style.id);
            });
        });
        this.stylesTable.classList.remove('hidden'); // Show the styled table
        this.attachSortNameListener();
    }
    
    attachSortNameListener() {
        const nameHeader = this.stylesTable.querySelector('#sortByName');
        nameHeader.style.cursor = 'pointer';

        nameHeader.addEventListener('click', () => {
            const isAscending = nameHeader.classList.toggle('ascending');
            this.sortTableByColumn(isAscending);
        });
    }

    sortTableByColumn(ascending = true) {
        const tbody = this.stylesTable.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        
        rows.sort((a, b) => {
            const aText = a.cells[0].textContent.trim().toLowerCase(); // Assuming the name is the first cell
            const bText = b.cells[0].textContent.trim().toLowerCase();
            return ascending ? aText.localeCompare(bText) : bText.localeCompare(aText);
        });

        rows.forEach(row => tbody.appendChild(row)); // Re-append rows in sorted order
    }

    handleSearch(searchTerm) {
        console.log('handleSearch called with:', searchTerm); // Debugging line
        const items = this.clientModal.querySelectorAll('#clientDropdownList > li:not(:first-child)'); // Exclude the search input list item
        searchTerm = searchTerm.toLowerCase();
    
        items.forEach((item) => {
            const name = item.textContent.toLowerCase();
            if (name.includes(searchTerm)) {
                item.classList.remove('hidden');
            } else {
                item.classList.add('hidden');
            }
        });
    }

    addStyleRow(clientId) {
        if (this.newStyleRowCount >= 10) {
            alert('Please add existing styles. Maximum of 10 new styles can be added at a time.');
            return;
        }

        const tbody = this.stylesTable.querySelector('tbody');
        const newRow = tbody.insertRow();
        const nameInputCell = newRow.insertCell();
        const priceInputCell = newRow.insertCell();
        const actionsCell = newRow.insertCell();

        nameInputCell.innerHTML = `<input class="w-full p-1" type="text" placeholder="Style Name" maxlength="65" required>`;
        priceInputCell.innerHTML = `<input class="w-full p-1" type="number" placeholder="Price" step="0.01" min="0" max="999999.99" required>`;
        actionsCell.innerHTML = `
            <button class="save-new-style text-green-500 hover:text-green-700 focus:outline-none transition">
                <i class="fa-solid fa-floppy-disk fa-sm"></i>
            </button>
            <button class="cancel-new-style text-red-500 hover:text-red-700 focus:outline-none transition ml-2">
                <i class="fa-solid fa-xmark"></i>
            </button>`;
            
        this.newStyleRowCount++; // Increment the counter for new style rows

        actionsCell.querySelector('.save-new-style').addEventListener('click', async () => {
            // Capture the new style data
            const nameInput = nameInputCell.querySelector('input[type="text"]');
            const priceInput = priceInputCell.querySelector('input[type="number"]'); // Corrected the quote here
        
            // Check if inputs are filled
            if (nameInput.value.length > 65) {
                alert('Style name cannot be more than 65 characters.');
                return;
            }
        
            // Validate if price is a number
            const priceValue = parseFloat(priceInput.value);
            if (isNaN(priceValue) || priceValue < 0 || priceValue > 999999.99) {
                alert('Please enter a valid price.');
                return;
            }
        
            const newStyleData = {
                name: nameInput.value,
                price: priceValue,
            };
            // Use the clientId when calling addStyle
            const savedStyle = await this.stylesDataService.addStyle(clientId, newStyleData);
            console.log(savedStyle);
            if (savedStyle && savedStyle.id) { // Check for 'id' instead of 'message'
                // Remove the 'new style' row
                newRow.remove();
                this.newStyleRowCount--;

                // Append the saved style as a normal row in the table
                this.appendStyleRow(savedStyle, clientId);
            } else {
                // Handle errors if any
                console.error('Style not added:', savedStyle);
            }
        });

        actionsCell.querySelector('.cancel-new-style').addEventListener('click', () => {
            newRow.remove();
            this.newStyleRowCount--; // Decrement the counter for new style rows
        });
    }

    appendStyleRow(style, clientId) {
        const tbody = this.stylesTable.querySelector('tbody');
        const row = tbody.insertRow();
        row.setAttribute('data-style-id', style.id); // Set data attribute with style ID
        row.className = 'hover:bg-gray-200 transition-colors duration-200 border-gray-300 border'; // Make sure this matches the class of the existing rows

        // Ensure that style.styleName and style.price are correctly accessed
        console.log(style.name, style.price); // Add this line to inspect the values
    
        row.insertCell().textContent = style.name;
        row.insertCell().textContent = style.price;
    
        const actionsCell = row.insertCell();
        actionsCell.innerHTML = `
            <button class="edit-button text-blue-500 hover:text-blue-700 focus:outline-none transition mr-2">
                <i class="fas fa-edit"></i>
            </button>
            <button class="delete-button text-red-500 hover:text-red-700 focus:outline-none transition">
                <i class="fas fa-trash"></i>
            </button>`;
        actionsCell.className = 'border p-2'; // Add classes for styling
    
        actionsCell.querySelector('.edit-button').addEventListener('click', () => {
            this.editStyleRow(row, style);
        });
    
        actionsCell.querySelector('.delete-button').addEventListener('click', () => {
            this.deleteStyle(style.id);
        });
    }

    // Add this method to reload styles for the client
    async refreshStyles(clientId) {
        this.selectClient(clientId);
    }
    
    editStyleRow(row, style) {
        const nameCell = row.cells[0];
        const priceCell = row.cells[1];
        const originalName = nameCell.textContent;
        const originalPrice = priceCell.textContent;
            
        // Change the cell to input fields
        nameCell.innerHTML = `<input class="w-full" type="text" value="${originalName}" maxlength="65" required>`;
        priceCell.innerHTML = `<input class="w-full" type="number" step="0.01" value="${originalPrice}" min="0" max="999999.99" required>`;
        
        // Create a new Save button
        const saveButton = document.createElement('button');
        saveButton.innerHTML = '<i class="fa-solid fa-floppy-disk fa-sm"></i>';
        saveButton.className = 'text-green-500 hover:text-green-700 focus:outline-none transition';
        
        // Event listener for saving changes
        saveButton.addEventListener('click', async () => {
            const updatedNameInput = nameCell.querySelector('input[type="text"]');
            const updatedPriceInput = priceCell.querySelector('input[type="number"]');
    
            // Check if inputs are filled and valid
            if (updatedNameInput.value.length > 65) {
                alert('Style name cannot be more than 65 characters.');
                return;
            }
    
            // Validate if price is a number
            const updatedPriceValue = parseFloat(updatedPriceInput.value);
            if (isNaN(updatedPriceValue) || updatedPriceValue < 0 || updatedPriceValue > 999999.99) {
                alert('Please enter a valid price.');
                return;
            }
    
            // Construct the payload with the updated values
            const payload = {
                name: updatedNameInput.value,
                price: updatedPriceValue
            };
    
            // Attempt to update the style
            const updatedStyle = await this.stylesDataService.updateStyle(style.id, payload);
            if (updatedStyle && !updatedStyle.error) {
                // Update the DOM with the new style values
                row.cells[0].textContent = updatedNameInput.value;
                row.cells[1].textContent = updatedPriceInput.value.toString();
                // Rebind the action buttons
                this.updateActionButtons(row, style.id, style.client_id);
            } else {
                // Handle the failed update
                console.error('Error updating style:', updatedStyle);
                // Reset input values
                updatedNameInput.value = originalName;
                updatedPriceInput.value = originalPrice;
            }
        });
    
        // Create a Cancel button
        const cancelEditButton = document.createElement('button');
        cancelEditButton.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        cancelEditButton.className = 'text-red-500 hover:text-red-700 focus:outline-none transition ml-2';
        cancelEditButton.addEventListener('click', () => {
            nameCell.textContent = originalName;
            priceCell.textContent = originalPrice;
            this.updateActionButtons(row, style.id, style.client_id);
        });
    
        // Update the actions cell with the new buttons
        const actionsCell = row.cells[2];
        actionsCell.innerHTML = '';
        actionsCell.appendChild(saveButton);
        actionsCell.appendChild(cancelEditButton);
    }
    
    updateActionButtons(row, styleId, clientId) {
        // Create and setup the Edit button
        const editButton = document.createElement('button');
        editButton.className = 'edit-button text-blue-500 hover:text-blue-700 focus:outline-none transition mr-2';
        editButton.innerHTML = '<i class="fas fa-edit"></i>';
        editButton.addEventListener('click', () => {
            // Re-use existing texts in cells as styleName and price
            this.editStyleRow(row, { id: styleId, styleName: row.cells[0].textContent, price: row.cells[1].textContent, client_id: clientId });
        });
    
        // Create and setup the Delete button
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-button text-red-500 hover:text-red-700 focus:outline-none transition';
        deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
        deleteButton.addEventListener('click', () => this.deleteStyle(styleId));
    
        // Append new buttons to the actions cell
        row.cells[2].innerHTML = '';  // Clear the cell content
        row.cells[2].appendChild(editButton);
        row.cells[2].appendChild(deleteButton);
    }
    
    deleteStyle(styleId) {
        const confirmation = confirm("Are you sure you want to delete this style?");
        if (confirmation) {
            this.stylesDataService.deleteStyle(styleId).then((response) => {
                if (response) {
                    // Find and remove the deleted style's row from the table
                    const tbody = this.stylesTable.querySelector('tbody');
                    Array.from(tbody.rows).forEach(row => {
                        if (row.getAttribute('data-style-id') === styleId.toString()) {
                            // Remove the row for the deleted style
                            tbody.removeChild(row);
                        }
                    });
                } else {
                    console.error('Error deleting style:', response);
                }
            }).catch(error => {
                console.error('Error deleting style:', error);
            });
        }
    }

}

console.log("stylesUIRender.js loaded!");
