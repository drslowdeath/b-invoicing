// invoicingUIRender.js
import { InvoicingDataService } from './invoicingDataService.js';

// Used for discount application logic
let invoicingUI; // Global

export class InvoicingUI {
    constructor(clientModalSelector, dropdownSelector, invoiceStylesTableSelector, selectedItemsTableSelector) {
        this.clientModal = document.querySelector(clientModalSelector);
        this.dropdown = document.querySelector(dropdownSelector);
        this.invoiceStylesTable = document.querySelector(invoiceStylesTableSelector);
        this.selectedItemsTable = document.querySelector(selectedItemsTableSelector);
        // Correctly initialize both containers by selecting them directly
        this.stylesTableContainer = document.getElementById('stylesTableContainer'); // Correctly initialized now
        this.selectedItemsContainer = document.getElementById('selectedItemsContainer');
        this.invoicingDataService = new InvoicingDataService();
        this.initializeModal();
        this.clientNamesMap = {};
        this.selectedItems = [];
        this.invoiceManager = new InvoiceManager();
        this.sampleManager = new SampleManager(this.invoiceManager, '#samplesTable tbody', '#samplesContainer', this.updateTotalsUI.bind(this));
        this.initializeSearchBarInvoicing();
    }

    initializeSearchBarInvoicing() {
        const searchBar = document.getElementById('invoicingTableSearchBar');
        searchBar.addEventListener('input', (event) => {
            this.filterStyles(event.target.value);
        });
    }

    filterStyles(searchTerm) {
        const tbody = this.invoiceStylesTable.querySelector('tbody');
        const rows = tbody.querySelectorAll('tr');
    
        // Normalize search term: lowercase and remove diacritics if necessary
        const normalizedSearchTerm = searchTerm.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    
        rows.forEach(row => {
            // Searching for style in first column
            const nameCellText = row.cells[1].textContent;
    
            // Normalize cell text: lowercase and remove diacritics if necessary
            const normalizedCellText = nameCellText.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    
            // Check if the normalized cell text includes the normalized search term
            row.style.display = normalizedCellText.includes(normalizedSearchTerm) ? '' : 'none';
        });
    }

    initializeModal() {
        const openModalButton = document.querySelector('.open-invoice-modal-button');
        openModalButton.addEventListener('click', () => {
            this.loadClients();
            this.clientModal.style.display = 'block';
        });

        const closeModalButton = this.clientModal.querySelector('.close-invoice-modal-button');
        closeModalButton.addEventListener('click', () => {
            this.clientModal.style.display = 'none';
        });

        const searchInput = document.getElementById('invoiceClientSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (event) => {
                this.handleSearch(event.target.value);
            });
        } else {
            console.error('Search input not found in the modal');
        }
    }

    handleSearch(searchTerm) {
        console.log('Search Term:', searchTerm);
        const items = this.clientModal.querySelectorAll('#invoiceClientDropdownList > li');
        searchTerm = searchTerm.toLowerCase();
    
        items.forEach((item) => {
            const name = item.textContent.toLowerCase();
            if (name.includes(searchTerm)) {
                item.style.display = ''; // Show the item if it matches
            } else {
                item.style.display = 'none'; // Hide the item if it does not match
            }
        });
    }

    async loadClients() {
        try {
            const clients = await this.invoicingDataService.fetchClients();
            this.renderClientsDropdown(clients.sort((a, b) => a.name.localeCompare(b.name)));

            // Populate client names map
            clients.forEach(client => {
                this.clientNamesMap[client.id] = client.name;
            });
        } catch (error) {
            console.error('Error loading clients:', error);
        }
    }

    renderClientsDropdown(clients) {
        const dropdownList = document.getElementById('invoiceClientDropdownList');
        dropdownList.innerHTML = ''; // Clear existing items
        
        clients.forEach(client => {
            this.clientNamesMap[client.id] = client.name; // Store client name with ID as key
            const listItem = document.createElement('li');
            listItem.textContent = client.name;
            listItem.dataset.value = client.id;
            listItem.classList.add('cursor-pointer', 'px-4', 'py-2', 'hover:bg-blue-100', 'text-gray-700');
            listItem.addEventListener('click', () => {
                this.selectClient(client.id);
            });
            dropdownList.appendChild(listItem);
        });
    }
    
    selectClient(clientId) {
        this.currentClientId = clientId;
        this.resetTotalsAndItems();
        this.clearUI(); // Resets totals and items when a new client is selected
        this.invoicingDataService.fetchClientStyles(clientId)
            .then(styles => {
                this.renderStylesTable(styles);
                // Correctly show the styles table container upon selection
                if (this.stylesTableContainer) {
                    this.stylesTableContainer.classList.remove('hidden');
                } else {
                    console.error('Styles Table Container not found');
                }
                // Ensure the container for the selected items table is shown
                if (this.selectedItemsContainer) {
                    this.selectedItemsContainer.classList.remove('hidden');
                } else {
                    console.error('Selected Items Container not found');
                }
                this.clientModal.style.display = 'none'; // Close modal
                const selectedClientName = this.clientNamesMap[clientId];
                this.updateSelectedClientDisplay(selectedClientName);
    
                // Clear the selected items and update the invoicing table for the new client
                this.selectedItems = []; // Clear the selectedItems array
                this.updateSelectedItemsTable(); // Refresh the invoicing table to reflect the cleared items
            })
            .catch(error => console.error('Error loading styles:', error));

            // Logic to enable the add sample button
            const addSampleButton = document.getElementById('addSampleButtonn');
            addSampleButton.classList.remove('opacity-50', 'cursor-not-allowed');
            addSampleButton.removeAttribute('disabled');
            addSampleButton.removeAttribute('title');
            console.log(`Button loaded: ${addSampleButton}`);
    }         

    updateSelectedClientDisplay(selectedClientName) {
        const selectedClientDiv = document.getElementById('selectedInvoiceClientName');
        selectedClientDiv.innerHTML = '';

        const nameParagraph = document.createElement('p');
        nameParagraph.textContent = `Selected Client: ${selectedClientName}`;
        nameParagraph.classList.add('font-semibold', 'text-lg', 'text-gray-900');
        selectedClientDiv.appendChild(nameParagraph);
    }

    renderStylesTable(styles) {
        const tbody = this.invoiceStylesTable.querySelector('tbody');
        tbody.innerHTML = ''; // Clear previous content for new data
    
        styles.forEach((style) => {
            const row = tbody.insertRow();
            row.className = 'hover:bg-gray-200 transition-colors duration-200 border-gray-300 border'
            // ID cell (hidden)
            const idCell = row.insertCell();
            idCell.textContent = style.id;
            idCell.className = 'hidden'; // Keep it hidden
            
            // Name cell
            const nameCell = row.insertCell();
            nameCell.textContent = style.name;
            nameCell.className = 'border p-2 whitespace-normal';
            
            // Price cell
            const priceCell = row.insertCell();
            const parsedPrice = parseFloat(style.price).toFixed(2); // Parses the price and formats it to two decimal places
            priceCell.textContent = `£${parsedPrice}`; // Display price in a human-readable format
            priceCell.className = 'border p-2 whitespace-normal';
            
            // Quantity input cell
            const quantityCell = row.insertCell();
            const quantityInput = document.createElement('input');
            quantityInput.type = 'number';
            quantityInput.value = 1;
            quantityInput.min = 1;
            quantityInput.className = "quantity-input w-full border border-gray-300 rounded px-2 py-1 whitespace-normal focus:outline-none focus:ring-1 focus:ring-blue-500";
            quantityCell.appendChild(quantityInput);
            
            // Actions cell with "Add" button
            const actionCell = row.insertCell();
            const addButton = document.createElement('button');
            addButton.textContent = 'Add';
            addButton.className = 'add-button text-green-500 hover:text-green-700 focus:outline-none transition';
            addButton.onclick = () => this.addToSelectedItems(style.id, style.name, parseInt(quantityInput.value, 10), parseFloat(style.price));
            actionCell.appendChild(addButton);
            actionCell.className = 'border whitespace-normal'
        });
        this.attachSortNameListenerInvoicing();

    }
    
    attachSortNameListenerInvoicing() {
        const nameHeader = this.invoiceStylesTable.querySelector('#sortByNameInvoicing');
        nameHeader.style.cursor = 'pointer'; 

        nameHeader.addEventListener('click', () => {
            const isAscending = nameHeader.classList.toggle('ascending');
            this.sortTableByColumn(isAscending);
        });
    }

    sortTableByColumn(ascending = true) {
        const tbody = this.invoiceStylesTable.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        
        rows.sort((a, b) => {
            const aText = a.cells[1].textContent.trim().toLowerCase(); // Assuming the name is the first cell
            const bText = b.cells[1].textContent.trim().toLowerCase();
            return ascending ? aText.localeCompare(bText) : bText.localeCompare(aText);
        });

        rows.forEach(row => tbody.appendChild(row)); // Re-append rows in sorted order
    }
    
    addToSelectedItems(styleId, styleName, quantity, price) {
        // Validation checks as before
        const parsedQuantity = parseInt(quantity, 10);
        const parsedPrice = parseFloat(price);
    
        if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
            alert('Please enter a valid quantity.');
            return;
        }
    
        if (isNaN(parsedPrice)) {
            alert('Invalid price.');
            return;
        }
    
        // Directly add the item using provided styleId and styleName
        this.invoiceManager.addItem(styleId, styleName, parsedQuantity, parsedPrice);
    
        this.updateSelectedItemsTable();
        this.updateTotalsUI();
    }
    
    removeFromSelectedItems(itemId) {
        // Call the removeItem method of InvoiceManager to remove the item
        this.invoiceManager.removeItem(itemId);
    
        // Update the UI to reflect the removal
        this.updateSelectedItemsTable();
        this.updateTotalsUI();
    }

    updateSelectedItemsTable() {
        const tbody = this.selectedItemsTable.querySelector('tbody');
        tbody.innerHTML = ''; // Clear existing content
    
        // Iterate over items managed by InvoiceManager
        this.invoiceManager.items.forEach((item, index) => {
            const row = tbody.insertRow();
            
            // Create cells with the appropriate content and classes
            const nameCell = row.insertCell();
            nameCell.textContent = item.name;
            nameCell.className = 'border p-2 whitespace-normal';
            
            const quantityCell = row.insertCell();
            quantityCell.textContent = `x${item.quantity}`;
            quantityCell.className = 'border p-2 whitespace-normal';
            
            const priceCell = row.insertCell();
            priceCell.textContent = `£${item.price.toFixed(2)}`;
            priceCell.className = 'border p-2 whitespace-normal';
            
            // Action cell with "Remove" button
            const actionCell = row.insertCell();
            const removeButton = document.createElement('button');
            removeButton.textContent = 'Remove';
            removeButton.className = 'remove-button text-red-500 hover:text-red-700 focus:outline-none transition';
            removeButton.onclick = () => {
                this.removeFromSelectedItems(item.id); // Remove using item ID
            };
            actionCell.appendChild(removeButton);
            actionCell.className = 'border p-2 whitespace-normal';
        });
        this.selectedItemsContainer.classList.remove('hidden'); // Make sure to show the container
    }


    handleAddDiscount() {
        const discountName = document.getElementById('discountNameInput').value;
        const discountType = document.querySelector('input[name="discountType"]:checked').value;
        const discountValue = parseFloat(document.getElementById('discountValueInput').value);
    
        console.log(`Applying discount: Name=${discountName}, Type=${discountType}, Value=${discountValue}`);
        this.invoiceManager.addDiscount(discountName, discountType, discountValue);
    
        console.log("Discount added to InvoiceManager");
        this.updateTotalsUI(); // Ensure this method triggers UI update correctly
    }

    updateTotalsUI() {
        const summary = this.invoiceManager.getInvoiceSummary();
        console.log('Updating UI with the latest invoice summary:', summary);
    
        // Update subtotal, VAT, and total display
        document.getElementById('invoiceSubtotal').textContent = `£${summary.subtotal}`;
        document.getElementById('invoiceVAT').textContent = `£${summary.vat}`;
        document.getElementById('invoiceTotal').textContent = `£${summary.total}`;
    
        // Find the 'Total' row so we can insert discounts above it
        const totalRow = document.querySelector("#totalsTableContainer tbody tr:last-child");
    
        // Remove existing discount rows to avoid duplication
        document.querySelectorAll("#totalsTableContainer tbody .discount-row").forEach(row => row.remove());
    
        // Insert discount rows before the 'Total' row
        summary.discounts.forEach(discount => {
            const discountRow = document.createElement('tr');
            discountRow.classList.add("discount-row"); // Add a class for easy identification/removal
            discountRow.innerHTML = `<td class="border p-2">${discount.name}</td><td class="border p-2">${discount.type === 'flat' ? `£${discount.value}` : `${discount.value}%`}</td>`;
            totalRow.parentNode.insertBefore(discountRow, totalRow); // Insert before the 'Total' row
        });
    }
    
    
    handleApplyDiscount() {
        const discountType = document.querySelector('#discountTypeSelect').value;
        const discountValue = parseFloat(document.querySelector('#discountValueInput').value);
        const note = discountType === 'percent' ? 'Percentage Discount' : 'Flat Discount';
    
        this.invoiceManager.addAdjustment(discountType === 'percent' ? 'discountPercentage' : 'discountFlat', discountValue, note);
        this.updateTotalsUI();
    }
    
    handleRemoveLastDiscount() {
        this.invoiceManager.removeLastDiscount();
        this.updateTotalsUI(); // Assuming this method updates the UI based on current invoice state
    }
    
    resetTotalsAndItems() {
        this.invoiceManager.resetState(); // Resets the state of InvoiceManager
        this.clearUI(); // Clears the UI elements
        this.updateTotalsUI(); // Recalculate and update UI
    }
    
    clearUI() {
        // Check and reset the discount name input
        const discountNameInput = document.getElementById('discountNameInput');
        if (discountNameInput) discountNameInput.value = '';
    
        // Reset the discount value input
        const discountValueInput = document.getElementById('discountValueInput');
        if (discountValueInput) discountValueInput.value = '';
    
        // Reset the discount type radio buttons
        const percentageRadio = document.querySelector('input[name="discountType"][value="percent"]');
        const flatRadio = document.querySelector('input[name="discountType"][value="flat"]');
        if (percentageRadio && flatRadio) {
            percentageRadio.checked = false;
            flatRadio.checked = true; // 'flat' is the default
        }
    
        // Reset totals display to default values
        document.getElementById('invoiceSubtotal').textContent = '£0.00';
        document.getElementById('invoiceVAT').textContent = '£0.00';
        document.getElementById('invoiceDiscount').textContent = '£0.00'; 
        document.getElementById('invoiceTotal').textContent = '£0.00';
    }
    
    // PDF generation HERE 
    generatePDF() {
        const pdfGenerator = new PDFGenerator(this.invoiceManager);
        pdfGenerator.generatePDF();
    }
}

class InvoiceManager {
    constructor() {
        this.items = []; // Items in the invoice
        this.samples = []; // Sample items in the invoice
        this.vatRate = 0.20; // VAT rate
        this.discounts = []; // New discounts array
        this.subtotal = 0; // Subtotal before VAT
        this.vat = 0; // VAT amount
        this.total = 0; // Total amount after VAT
    }

    addItem(id, name, quantity, price) {
        // Adds or updates items
        const itemIndex = this.items.findIndex(item => item.id === id);
        if (itemIndex > -1) {
            this.items[itemIndex].quantity += quantity;
            this.items[itemIndex].totalPrice = this.items[itemIndex].price * this.items[itemIndex].quantity;
        } else {
            this.items.push({ id, name, quantity, price, totalPrice: price * quantity });
        }
        this.recalculateTotals();
    }

    removeItem(id) {
        // Removes items
        this.items = this.items.filter(item => item.id !== id);
        this.recalculateTotals();
    }

    addSample(id, name, pricePerHour, hoursWorked) {
        // Adds samples
        const totalPrice = pricePerHour * hoursWorked;
        this.samples.push({ id, name, pricePerHour, hoursWorked, totalPrice });
        this.recalculateTotals();
    }
    
    updateSample(id, name, pricePerHour, hoursWorked) {
        // Find the sample in the samples array by its ID
        const sampleIndex = this.samples.findIndex(sample => sample.id === id);
        if (sampleIndex > -1) {
            // If found, update the sample's details
            const sample = this.samples[sampleIndex];
            sample.name = name;
            sample.pricePerHour = pricePerHour;
            sample.hoursWorked = hoursWorked;
            sample.totalPrice = pricePerHour * hoursWorked; // Recalculate the total price for the sample
            // Recalculate the invoice totals to reflect the updated sample
            this.recalculateTotals();
        } else {
            console.error('Sample not found with ID:', id);
        }
    }

    removeSample(id) {
        // Removes samples
        this.samples = this.samples.filter(sample => sample.id !== id);
        this.recalculateTotals();
    }

    addDiscount(name, type, value) {
        console.log(`Adding discount: ${name}, Type: ${type}, Value: ${value}`);
        this.discounts.push({ name, type, value: parseFloat(value) });
        this.recalculateTotals();
        console.log("Discounts after adding:", this.discounts);
    }

    removeLastDiscount() {
        if (this.discounts.length > 0) {
            this.discounts.pop(); // Removes the last discount added
            this.recalculateTotals();
        }
    }

    //PDF GENERATION - This helps get a numeric price for % discounts and we subsequently get these in the generate pdf
    calculateDiscountValues() {
        // Start with the initial subtotal from items and samples
        let runningSubtotal = [...this.items, ...this.samples].reduce((acc, curr) => acc + curr.totalPrice, 0);

        // Temporarily store calculated values for percentage discounts
        this.discounts = this.discounts.map(discount => {
            if (discount.type === 'percent') {
                const value = runningSubtotal * (discount.value / 100);
                // Apply the discount to the running subtotal for subsequent discounts
                runningSubtotal -= value;
                return { ...discount, calculatedValue: parseFloat(value.toFixed(2)) };
            } else if (discount.type === 'flat') {
                // For flat discounts, just subtract the value from the running subtotal
                runningSubtotal -= discount.value;
                return discount; // Return flat discounts as-is
            }
            return discount;
        });
    }
    // TRY NOT TO TOUCH THIS I BARELY GOT IT TO WORK!
    recalculateTotals() {
        // Start with the initial subtotal from items and samples
        let subtotal = [...this.items, ...this.samples].reduce((acc, curr) => acc + curr.totalPrice, 0);
    
        // Apply each discount in the order they were added, regardless of type
        this.discounts.forEach(discount => {
            if (discount.type === 'percent') {
                // Apply percentage discount on the current subtotal
                subtotal -= subtotal * (discount.value / 100);
            } else if (discount.type === 'flat') {
                // Apply flat discount on the current subtotal
                subtotal -= discount.value;
            }
        });
    
        // Ensure subtotal does not go negative
        subtotal = Math.max(subtotal, 0);
    
        // Calculate VAT and total based on the final subtotal
        const vat = subtotal * this.vatRate;
        const total = subtotal + vat;
    
        // Update instance variables with the calculated values
        this.subtotal = subtotal;
        this.vat = vat;
        this.total = total;
    
        console.log(`Totals recalculated: Subtotal: £${this.subtotal.toFixed(2)}, VAT: £${this.vat.toFixed(2)}, Total: £${this.total.toFixed(2)}`);
        this.calculateDiscountValues();
    }

    getInvoiceSummary() {
        return {
            subtotal: this.subtotal.toFixed(2),
            vat: this.vat.toFixed(2),
            total: this.total.toFixed(2),
            discounts: this.discounts.map(discount => ({
                name: discount.name,
                type: discount.type,
                value: discount.value.toFixed(2)
            }))
        };
    }

    resetState() {
        this.items = [];
        this.samples = [];
        this.discounts = [];
        this.recalculateTotals();
    }
}

class SampleManager {
    constructor(invoiceManager, samplesTableSelector, samplesContainerSelector, updateUITotalsCallback) {
        this.invoiceManager = invoiceManager;
        this.samplesTable = document.querySelector(samplesTableSelector);
        this.samplesContainer = document.querySelector(samplesContainerSelector);
        this.updateUITotalsCallback = updateUITotalsCallback; // Store the callback
        this.nextId = 1; // Unique identifier for each sample
    }

    addSampleRow() {
        const row = this.samplesTable.insertRow();
        row.className = 'hover:bg-gray-200 transition-colors duration-200 border-gray-300 border text-center';
        row.innerHTML = `
            <td class="border p-2 whitespace-normal"><input type="text" class="sample-name-input border border-gray-300 p-2 rounded" placeholder="Sample Name"/></td>
            <td class="border p-2 whitespace-normal"><input type="number" class="price-per-hour-input border border-gray-300 p-2 rounded" placeholder="0" min="0"/></td>
            <td class="border p-2 whitespace-normal"><input type="number" class="hours-worked-input border border-gray-300 p-2 rounded" placeholder="0" min="0"/></td>
            <td class="sample-total-price p-2 border whitespace-normal">£0.00</td>
            <td class="sample-actions"><button class="calculate-sample-price bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Calculate</button></td>
        `;
        row.querySelector('.calculate-sample-price').addEventListener('click', () => this.calculateSamplePrice(row));
    
        // Make sure to show the container if it was hidden
        this.samplesContainer.classList.remove('hidden');
    }
    
    calculateSamplePrice(row, isEditing = false) {
        const nameInput = row.querySelector('.sample-name-input');
        const pricePerHourInput = row.querySelector('.price-per-hour-input');
        const hoursWorkedInput = row.querySelector('.hours-worked-input');
        const name = nameInput.value.trim();
        const pricePerHour = parseFloat(pricePerHourInput.value);
        const hoursWorked = parseFloat(hoursWorkedInput.value);
        
        if (!name || isNaN(pricePerHour) || pricePerHour <= 0 || isNaN(hoursWorked) || hoursWorked <= 0) {
            alert("Please fill in all fields with valid positive numbers and a sample name.");
            return;
        }
        
        const totalPrice = pricePerHour * hoursWorked;
        const totalCell = row.querySelector('.sample-total-price');
            totalCell.textContent = `£${totalPrice.toFixed(2)}`;
        
        // Convert inputs to text
        nameInput.parentElement.innerHTML = name;
        pricePerHourInput.parentElement.innerHTML = `£${pricePerHour.toFixed(2)}`;
        hoursWorkedInput.parentElement.innerHTML = hoursWorked;
        
        let sampleId; // Declare sampleId at a function scope accessible to both conditions below
        
        if (isEditing) {
            sampleId = parseInt(row.getAttribute('data-sample-id'));
            this.invoiceManager.updateSample(sampleId, name, pricePerHour, hoursWorked);
        } else {
            sampleId = this.nextId++;
            this.invoiceManager.addSample(sampleId, name, pricePerHour, hoursWorked);
            row.setAttribute('data-sample-id', sampleId.toString());
        }
        
        // Moved console logs and updateUITotalsCallback() call outside of the conditionals
        console.log(isEditing ? "Sample updated in InvoiceManager" : "New sample added to InvoiceManager");
        this.updateUITotalsCallback(); // Ensure this triggers UI update
        this.changeToEditAndRemoveButtons(row);
    }
    
    changeToEditAndRemoveButtons(row) {
        const actionsCell = row.querySelector('.sample-actions');
        actionsCell.innerHTML = `
            <button class="edit-sample text-blue-500 hover:text-blue-700 focus:outline-none transition mr-2"><i class="fas fa-edit"></i></button>
            <button class="remove-sample text-red-500 hover:text-red-700 focus:outline-none transition"><i class="fas fa-trash"></i></button>
        `;
        const editButton = actionsCell.querySelector('.edit-sample');
        const removeButton = actionsCell.querySelector('.remove-sample');

        editButton.addEventListener('click', () => this.editSample(row));
        removeButton.addEventListener('click', () => this.removeSample(row));
        this.updateUITotalsCallback();
    }

    editSample(row) {
        // Retrieve the sample ID from the row
        const sampleId = parseInt(row.getAttribute('data-sample-id'));
        
        // Find the sample directly from the InvoiceManager's samples array
        const sample = this.invoiceManager.samples.find(s => s.id === sampleId);
    
        if (!sample) {
            console.error("Sample not found");
            return;
        }
    
        // Replace text with inputs, filling them with the sample's current values
        row.innerHTML = `
            <td class="border p-2 whitespace-normal"><input type="text" class="sample-name-input border border-gray-300 p-2 rounded" value="${sample.name}"/></td>
            <td class="border p-2 whitespace-normal"><input type="number" class="price-per-hour-input border border-gray-300 p-2 rounded" value="${sample.pricePerHour}" min="0"/></td>
            <td class="border p-2 whitespace-normal"><input type="number" class="hours-worked-input border border-gray-300 p-2 rounded" value="${sample.hoursWorked}" min="0"/></td>
            <td class="sample-total-price border p-2 whitespace-normal">£${sample.totalPrice.toFixed(2)}</td>
            <td class="sample-actions border p-2 whitespace-normal"><button class="calculate-sample-price bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Calculate</button></td>
        `;

        // Reattach the event listener to the calculate button
        row.querySelector('.calculate-sample-price').addEventListener('click', () => this.calculateSamplePrice(row, true));
    }

    removeSample(row) {
        const sampleId = parseInt(row.getAttribute('data-sample-id'));
        this.invoiceManager.removeSample(sampleId);
        row.remove();
        this.updateUITotalsCallback();
    }
}

class PDFGenerator {
    constructor(invoiceManager) {
        this.invoiceManager = invoiceManager; // Change to directly use invoiceManager
    }

    initializePDF() {
        // Access jsPDF from the global window object
        const doc = new window.jspdf.jsPDF();
        doc.setFontSize(10);
        return doc;
    }

    addHeader(doc) {
        this.addLogo(doc);
        this.addBusinessInfo(doc);
    }

    addLogo(doc) {
        const img = new Image();
        img.src = 'logo.png'; // Replace with the path to your logo image file
        img.onload = () => {
            const imgWidth = 50; // Adjust the width as needed
            const imgHeight = (img.height * imgWidth) / img.width; // Calculate height based on aspect ratio
            doc.addImage(img, 'PNG', 10, 10, imgWidth, imgHeight);
        };
    }
    

    addBusinessInfo(doc) {
    const businessName = "S.A.M. Creations";
    const address = "326 Lee High Road, SE13 5PJ, London";
    const phoneNumber = "07935774269";
    const email = "s.a.m.creations.yk@gmail.com";
    const website = "https://samcreationsky.co.uk/";

    // Set font for the business info
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');

    // Business Name with line underneath
    doc.text(businessName, doc.internal.pageSize.getWidth() - 10, 20, { align: 'right' });
    doc.setDrawColor(0);
    doc.line(150, 22, doc.internal.pageSize.getWidth() - 10, 22);

    // Reset font to normal
    doc.setFont(undefined, 'normal');

    // Business Address and Contact Information
    doc.text(address, doc.internal.pageSize.getWidth() - 10, 30, { align: 'right' });
    doc.text(`Tel: ${phoneNumber}`, doc.internal.pageSize.getWidth() - 10, 35, { align: 'right' });
    doc.text(`Email: ${email}`, doc.internal.pageSize.getWidth() - 10, 40, { align: 'right' });
    doc.text(`Web: ${website}`, doc.internal.pageSize.getWidth() - 10, 45, { align: 'right' });

    return 50; // Return the Y position after the header for further content
}

    addTermsAndConditions(doc, yPos) {
        doc.setFontSize(12);
        doc.text('Terms & Conditions:', 10, yPos);
        yPos += 6;

        const terms = [
            "Due payment time frame is one week.",
            "Deposit of 50% is required of the beginning of production.",
            "Late payment enforced fees (1% a day after 2 weeks)",
            "If late on delivery the deadlines also change with the delivery delay of the materials.",
            "If no payments are done legal action will be taken.",
            "If customer is unsatisfied they can return goods for repair in 1 week.",
            "Renegotiation after agreement is not acceptable by the company.",
            "We do not take responsibility of goods damaged or lost during delivery"
        ];

        terms.forEach(term => {
            doc.text(term, 10, yPos);
            yPos = this.checkAndAddNewPage(yPos + 6, doc);
        });

        return yPos; // Return the updated yPos for further content
    }

    addBankDetails(doc, yPos) {
        yPos += 10; // Some space before the bank details
        doc.setFontSize(12);
        doc.text('Bank Details:', 10, yPos);
        yPos += 6;

        const bankDetails = [
            "Payment by:",
            "Account Number: 20397709",
            "Sort code: 20-45-45",
            "Name: S.A.M. CREATIONS LTD",
            "VAT Registration Number: 397121189"
        ];

        bankDetails.forEach(detail => {
            doc.text(detail, 10, yPos);
            yPos = this.checkAndAddNewPage(yPos + 6, doc);
        });

        return yPos; // Return the updated yPos for any further content
    }

    checkAndAddNewPage(yPos, doc) {
        if (yPos >= 280) { // A4 page height in mm
            doc.addPage();
            return 20; // Return new Y position after adding a page
        }
        return yPos; // Return current Y position if no new page is added
    }

    generatePDF() {
        const doc = this.initializePDF();
        let yPos = 20;

        this.addHeader(doc);
        yPos += 20; // Adjust position after the logo

        // Title
        doc.setFontSize(18);
        doc.text('Invoice Summary', 10, yPos);
        yPos += 10;

        // Reset font size for body
        doc.setFontSize(12);

        // Items
        doc.text("Items:", 10, yPos);
        yPos += 6;
        this.invoiceManager.items.forEach(item => {
            let itemText = `${item.name}: £${item.price.toFixed(2)} x ${item.quantity} = £${(item.price * item.quantity).toFixed(2)}`;
            doc.text(itemText, 10, yPos);
            yPos = this.checkAndAddNewPage(yPos + 6, doc);
        });

        // Samples
        if (this.invoiceManager.samples.length > 0) {
            doc.text("Samples:", 10, yPos);
            yPos += 6;
            this.invoiceManager.samples.forEach(sample => {
                let sampleText = `${sample.name}: £${sample.pricePerHour.toFixed(2)} x ${sample.hoursWorked} hours = £${sample.totalPrice.toFixed(2)}`;
                doc.text(sampleText, 10, yPos);
                yPos = this.checkAndAddNewPage(yPos + 6, doc);
            });
        }

        // Discounts
        if (this.invoiceManager.discounts.length > 0) {
            yPos += 5; // Some space before section
            doc.text("Discounts:", 10, yPos);
            yPos += 6; // Add space for section header
            this.invoiceManager.discounts.forEach(discount => {
                let discountText = discount.type === 'flat' ?
                    `Discount (${discount.name}): £${discount.value}` :
                    `Discount (${discount.name}): ${discount.value}% (£${discount.calculatedValue})`; // Use calculatedValue here
                doc.text(discountText, 10, yPos);
                yPos = this.checkAndAddNewPage(yPos + 6, doc);
            });
        }

        // Subtotal, VAT, Total
        yPos += 5;
        let subtotalText = `Subtotal: £${this.invoiceManager.subtotal.toFixed(2)}`;
        let vatText = `VAT: £${this.invoiceManager.vat.toFixed(2)}`;
        let totalText = `Total: £${this.invoiceManager.total.toFixed(2)}`;
        doc.text(subtotalText, 10, yPos);
        yPos = this.checkAndAddNewPage(yPos + 10, doc);
        doc.text(vatText, 10, yPos);
        yPos = this.checkAndAddNewPage(yPos + 10, doc);
        doc.text(totalText, 10, yPos);
        // After Subtotal, VAT, and Total
        yPos += 10; // Some space before the next section

        // Terms & Conditions
        yPos = this.addTermsAndConditions(doc, yPos);

        // Bank Details
        yPos = this.addBankDetails(doc, yPos);

        // Save PDF
        doc.save('invoice.pdf');
    }

    

    
}

// Initialize InvoicingUI after DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    invoicingUI = new InvoicingUI('.invoice-client-modal', '.invoice-dropdown-list', '#invoiceStylesTable', '#selectedItemsTable');
    window.invoicingUI = invoicingUI; // Make it accessible for inline handlers
    invoicingUI.loadClients();
    
    document.getElementById('removeDiscountButton').addEventListener('click', () => {
        invoicingUI.handleRemoveLastDiscount();
        console.log("Discount removed.");
    });
    
    document.getElementById('generatePDFButton').addEventListener('click', () => invoicingUI.generatePDF());

    document.getElementById('addSampleButtonn').addEventListener('click', () => {
        invoicingUI.sampleManager.addSampleRow();
        console.log("Add Sample button clicked.");
    });
}); 