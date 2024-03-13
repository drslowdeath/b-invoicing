// invoicingUIRender.js
import { InvoicingDataService } from './invoicingDataService.js';
import { samLogoBase64 } from './imageData.js';
// Used for discount application logic
let invoicingUI; // Global
function isValidBase64(base64String) {
    const base64Pattern = /^data:image\/[a-z]+;base64,([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
    return base64Pattern.test(base64String);
}

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

            // Logic to enable to Add Discount button 
            const addDiscountButton = document.getElementById('invoicing-add-discount');
            addDiscountButton.classList.remove('opacity-50', 'cursor-not-allowed');
            addDiscountButton.removeAttribute('disabled');
            addDiscountButton.removeAttribute('title');
            console.log(`Button loaded: ${addDiscountButton}`);
            
            // Logic to enable the generate PDF button
            const generatePDFButton = document.getElementById('generatePDFButton');
            generatePDFButton.classList.remove('opacity-50', 'cursor-not-allowed');
            generatePDFButton.removeAttribute('disabled');
            generatePDFButton.removeAttribute('title');
            console.log(`Button loaded: ${generatePDFButton}`);
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
    async generatePDF() {
        const { nextInvoiceNumber } = await this.invoicingDataService.fetchNextInvoiceNumber();
        const pdfGenerator = new PDFGenerator(this.invoiceManager, this.invoicingDataService);
        await pdfGenerator.generatePDF(nextInvoiceNumber, this.currentClientId);
        await this.invoicingDataService.saveInvoice(nextInvoiceNumber);
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
    calculateDiscountValues(totalForCalculation) {
        // Use the total for calculations, but do not reduce the actual total
        this.discounts = this.discounts.map(discount => {
            if (discount.type === 'percent') {
                // Calculate the display value for percentage-based discounts
                const displayValue = totalForCalculation * (discount.value / 100);
                return { ...discount, displayValue: parseFloat(displayValue.toFixed(2)) };
            } else {
                // Flat discounts show the value directly
                return { ...discount, displayValue: parseFloat(discount.value.toFixed(2)) };
            }
        });
    }
    
    // TRY NOT TO TOUCH THIS I BARELY GOT IT TO WORK!
    recalculateTotals() {
        // Step 1: Calculate initial subtotal from items and samples
        let subtotal = [...this.items, ...this.samples].reduce((acc, curr) => acc + curr.totalPrice, 0);
    
        // Step 2: Apply flat discounts to the subtotal and recalculate VAT and total
        const flatDiscounts = this.discounts.filter(discount => discount.type === 'flat');
        let totalFlatDiscount = flatDiscounts.reduce((acc, curr) => acc + curr.value, 0);
        subtotal -= totalFlatDiscount; // Subtract total flat discounts from the subtotal
        
        // Ensure subtotal doesn't go below 0
        subtotal = Math.max(0, subtotal);
    
        let vat = subtotal * this.vatRate; // Recalculate VAT based on adjusted subtotal
        let total = subtotal + vat; // Recalculate total
    
        // Step 3: Apply percentage-based discounts on the total for deposit calculation
        // Note: These discounts do not reduce the total; they're for display purposes
        const percentageDiscounts = this.discounts.filter(discount => discount.type === 'percent');
        let effectiveTotal = total; // Start with the recalculated total
        percentageDiscounts.forEach(discount => {
            // Calculate the effective total after each percentage discount for deposit display
            let discountAmount = effectiveTotal * (discount.value / 100);
            discount.effectiveTotalAfterDiscount = effectiveTotal - discountAmount; // This is for display purposes
            effectiveTotal -= discountAmount; // Adjust effective total for next discount, if any
        });
    
        // Update instance variables with the recalculated values
        this.subtotal = subtotal;
        this.vat = vat;
        this.total = total; // Note: The actual total remains unchanged after percentage discounts
    
        console.log(`Totals recalculated: Subtotal: £${this.subtotal.toFixed(2)}, VAT: £${this.vat.toFixed(2)}, Total (before percentage discounts): £${this.total.toFixed(2)}`);
    }

    // Adjust getInvoiceSummary to include effective totals for discounts
    getInvoiceSummary() {
        const formatValue = value => typeof value === 'number' ? value.toFixed(2) : '0.00';

        return {
            subtotal: formatValue(this.subtotal),
            vat: formatValue(this.vat),
            total: formatValue(this.total),
            discounts: this.discounts.map((discount, index) => ({
                name: discount.name,
                type: discount.type,
                value: formatValue(discount.value),
                effectiveTotalAfterDiscount: formatValue(discount.effectiveTotalAfterDiscount)
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
            <td class="sample-actions"><button class="calculate-sample-price bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded submit-button">Calculate</button></td>
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

    async addHeader(doc) {
        await this.addLogo(doc);
        this.addBusinessInfo(doc);
    }
    
    addLogo(doc) {
        return new Promise((resolve, reject) => {
            if (isValidBase64(samLogoBase64)) {
                const imgData = samLogoBase64.split(',')[1]; // Extract the base64-encoded data
    
                // Convert the base64-encoded data to a Blob
                const blob = this.b64toBlob(imgData, 'image/png');
    
                new Compressor(blob, {
                    quality: 0.8, // Adjust the quality as needed (0.8 = 80% quality)
                    maxWidth: 500, // Adjust the maximum width as needed
                    maxHeight: 800, // Adjust the maximum height as needed
                    success(result) {
                        const reader = new FileReader();
                        reader.onloadend = function () {
                            const compressedBase64 = reader.result;
                            const compressedImgData = compressedBase64.split(',')[1];
    
                            // Add the compressed image to the PDF
                            doc.addImage(compressedImgData, 'PNG', 8, -1, 50, 75 * 0.73); // Assuming an aspect ratio of 1010:737
    
                            resolve(); // Resolve the Promise when the image is added to the PDF
                        };
                        reader.readAsDataURL(result);
                    },
                    error(err) {
                        console.error('Error compressing image:', err);
                        reject(err); // Reject the Promise if there's an error during compression
                    },
                });
            } else {
                console.error('Invalid base64 string for the logo image.');
                reject(); // Reject the Promise if the base64 string is invalid
            }
        });
    }
    
    // Helper function to convert base64-encoded data to a Blob
    b64toBlob(b64Data, contentType, sliceSize = 512) {
        const byteCharacters = atob(b64Data);
        const byteArrays = [];
    
        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);
    
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
    
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }
    
        return new Blob(byteArrays, { type: contentType });
    }

    addBusinessInfo(doc) {
        const businessName = "S.A.M. Creations LTD";
        const address = "326 Lee High Road, SE13 5PJ, London";
        const phoneNumber = "07935774269";
        const email = "s.a.m.creations.yk@gmail.com";
        const website = "https://samcreationsky.co.uk/";
        const bankDetails = [
            "Bank: Barclays",
            "Account Number: 20397709",
            "Sort code: 20-45-45",
            "Name: S.A.M. CREATIONS LTD",
            "VAT Registration Number: 397121189"
        ];
    
        // Set font size and color for the business name
        doc.setFontSize(20);
        doc.setTextColor("#B1202B");
        doc.setFont(undefined, 'bold');
    
        // Business Name with line underneath
        doc.text(businessName, doc.internal.pageSize.getWidth() - 10, 15, { align: 'right' });
        doc.setDrawColor(0);
        doc.line(140, 19, doc.internal.pageSize.getWidth() - 10, 19);
    
        // Reset font size, color, and style for the rest of the business info
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.setFont(undefined, 'normal');
    
        // Business Address and Contact Information
        doc.text(address, doc.internal.pageSize.getWidth() - 10, 25, { align: 'right' });
        doc.text(`Tel: ${phoneNumber}`, doc.internal.pageSize.getWidth() - 10, 30, { align: 'right' });
        doc.text(`Email: ${email}`, doc.internal.pageSize.getWidth() - 10, 35, { align: 'right' });
        doc.text(`Web: ${website}`, doc.internal.pageSize.getWidth() - 10, 40, { align: 'right' });
            
        // Bank Details
        const bankDetailsStartX = doc.internal.pageSize.getWidth() / 2;
        let yPos = 20;
        
        bankDetails.forEach(detail => {
            doc.text(detail, bankDetailsStartX, yPos, { align: 'center' });
            yPos += 5;
        });

        return 45; // Return a fixed Y position after the header for further content
    }

    addTermsAndConditions(doc, yPos) {
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'bold');
        doc.text('Terms & Conditions:', 10, yPos);
        doc.setFont(undefined, 'normal');
        yPos += 6;

        const terms = [
            "1. Payment Terms: Full payment is due within one week of invoice date.",
            "   A 50% deposit is required at the start of production.",
            "2. Late Payments: A 1% daily fee will be applied to outstanding balances after two weeks.",
            "   Late deliveries will result in adjusted payment deadlines.",
            "3. Non-Payment: Legal action will be pursued for non-payment.",
            "4. Returns: Unsatisfactory goods must be returned for repair within one week of receipt.",
            "5. Renegotiation: Post-agreement renegotiation is not accepted by the company.",
            "6. Shipping: The company is not liable for goods damaged or lost during delivery."  
        ];

        terms.forEach(term => {
            doc.text(term, 10, yPos);
            yPos = this.checkAndAddNewPage(yPos + 6, doc);
        });

        return yPos; // Return the updated yPos for further content
    }

    checkAndAddNewPage(yPos, doc) {
        if (yPos >= 280) { // A4 page height in mm
            doc.addPage();
            return 20; // Return new Y position after adding a page
        }
        return yPos; // Return current Y position if no new page is added
    }

    async fetchClientDetails(clientId) {
        return await invoicingUI.invoicingDataService.fetchClientById(clientId);
    }

    async generatePDF(invoiceNumber, clientId) {
        this.invoiceManager.calculateDiscountValues(this.invoiceManager.total);
        const doc = this.initializePDF();
        let yPos = 25;
    
        await this.addHeader(doc);
        yPos += 22; // Adjust position after the header
        doc.setDrawColor('#B1202B'); // Set the line color to #B1202B hex
        doc.setLineWidth(0.5); // Set the line width
        doc.line(10, yPos, doc.internal.pageSize.getWidth() - 10, yPos); // Draw the line
        yPos += 10; // Adjust position after the logo
    
        // Fetch client details
        const clientDetails = await this.fetchClientDetails(clientId);
        const client = clientDetails[0];
        const currentDate = new Date().toLocaleDateString('en-GB');
    
        // Client information
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'bold');
        doc.text('To:', 10, yPos);
        yPos += 8;
    
        doc.setFont(undefined, 'normal');
        doc.text(`Name: ${client.name}`, 10, yPos);
        yPos += 6;
        doc.text(`Company: ${client.company_name}`, 10, yPos);
        yPos += 6;
    
        // Format the address with each part on a new line
        doc.text('Address:', 10, yPos);
        yPos += 6;
        const addressParts = client.address.split(',').map(part => part.trim());
        addressParts.forEach(part => {
            doc.text(part, 20, yPos);
            yPos += 6;
        });
    
        // Invoice number and date
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Invoice Number: ${invoiceNumber}`, 110, 55);
        doc.text(`Date: ${currentDate}`, 110, 61);
        yPos += 10;
    
        // Reset font size for body
        doc.setFontSize(12);
    
        // Items Table
        yPos = this.addTableHeader(doc, yPos, 'Items');
        yPos = this.addItemsTable(doc, yPos);
    
        // Samples Table
        yPos = this.addTableHeader(doc, yPos, 'Samples');
        yPos = this.addSamplesTable(doc, yPos);
    
        // Totals Table
        yPos = this.addTableHeader(doc, yPos, 'Totals');
        yPos = this.addTotalsTable(doc, yPos);
    
        yPos += 10;
    
        // Terms & Conditions
        yPos = this.addTermsAndConditions(doc, yPos);
    
        // Generate the file name with the desired format
        const fileName = `Invoice_${invoiceNumber}_${client.company_name}_${currentDate}.pdf`;
    
        // Save PDF with the generated file name
        doc.save(fileName);
    }

    // Helper method to add a table header to the PDF
    addTableHeader(doc, yPos, title) {
        doc.setFontSize(14);
        doc.setTextColor("#B1202B");
        doc.setFont(undefined, 'bold');
        doc.text(title, 10, yPos);
        yPos += 5; // Adjust for space after the header
        return yPos;
    }

    addItemsTable(doc, yPos) {
        const tableData = [['Name', 'Quantity', 'Price']];
    
        this.invoiceManager.items.forEach(item => {
            tableData.push([item.name, item.quantity.toString(), `£${item.price.toFixed(2)}`]);
        });
    
        const tableHeaders = tableData.shift(); // Remove header row from data
        const cellPadding = 5;
        const cellWidth = (doc.internal.pageSize.getWidth() - 20) / tableHeaders.length;
    
        // Table headers
        doc.setFillColor("#B1202B");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12); // Set font size for table headers
        doc.setFont(undefined, 'bold'); // Set font style to bold for table headers
        doc.rect(10, yPos, doc.internal.pageSize.getWidth() - 20, 10, 'F'); // Draw header row background
        tableHeaders.forEach((header, index) => {
            doc.text(header, 10 + index * cellWidth + cellPadding, yPos + 8);
        });
        yPos += 10;
    
        // Table rows
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10); // Set font size for table rows
        doc.setFont(undefined, 'normal'); // Reset font style for table rows
        tableData.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                doc.setFillColor(rowIndex % 2 === 0 ? 255 : 240);
                doc.rect(10 + colIndex * cellWidth, yPos, cellWidth, 8, 'F');
                doc.text(cell.toString(), 10 + colIndex * cellWidth + cellPadding, yPos + 6);
            });
            yPos += 8;
        });
    
        return yPos + 10; // Add some space after the table
    }
    
    addSamplesTable(doc, yPos) {
        if (this.invoiceManager.samples.length === 0) return yPos;
    
        const tableData = [['Name', 'Price/Hour', 'Hours Worked', 'Total Price']];
    
        this.invoiceManager.samples.forEach(sample => {
            tableData.push([sample.name, `£${sample.pricePerHour.toFixed(2)}`, sample.hoursWorked.toString(), `£${sample.totalPrice.toFixed(2)}`]);
        });
    
        const tableHeaders = tableData.shift(); // Remove header row from data
        const cellPadding = 5;
        const cellWidth = (doc.internal.pageSize.getWidth() - 20) / tableHeaders.length;
    
        // Table headers
        doc.setFillColor("#B1202B");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12); // Set font size for table headers
        doc.setFont(undefined, 'bold'); // Set font style to bold for table headers
        doc.rect(10, yPos, doc.internal.pageSize.getWidth() - 20, 10, 'F'); // Draw header row background
        tableHeaders.forEach((header, index) => {
            doc.text(header, 10 + index * cellWidth + cellPadding, yPos + 8);
        });
        yPos += 10;
    
        // Table rows
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10); // Set font size for table rows
        doc.setFont(undefined, 'normal'); // Reset font style for table rows
        tableData.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                doc.setFillColor(rowIndex % 2 === 0 ? 255 : 240);
                doc.rect(10 + colIndex * cellWidth, yPos, cellWidth, 8, 'F');
                doc.text(cell.toString(), 10 + colIndex * cellWidth + cellPadding, yPos + 6);
            });
            yPos += 8;
        });
    
        return yPos + 10; // Add some space after the table
    }

    addDiscountsTable(doc, yPos) {
        const { flatDiscounts, percentageDiscounts } = this.invoiceManager.discounts.reduce((acc, discount) => {
            if (discount.type === 'flat') {
                acc.flatDiscounts.push(discount);
            } else if (discount.type === 'percent') {
                acc.percentageDiscounts.push(discount);
            }
            return acc;
        }, { flatDiscounts: [], percentageDiscounts: [] });

        // Flat Discounts
        if (flatDiscounts.length > 0) {
            yPos = this.addTableHeader(doc, yPos, 'Flat Discounts');
            flatDiscounts.forEach((discount, index) => {
                const description = `${discount.name}: £${discount.value.toFixed(2)}`;
                yPos = this.addDiscountRow(doc, yPos, description);
            });
        }

        // Percentage Discounts as Deposits
        if (percentageDiscounts.length > 0) {
            yPos += 5; // Space before percentage discounts section
            yPos = this.addTableHeader(doc, yPos, 'Deposits');
            percentageDiscounts.forEach((discount) => {
                // Ensure displayValue exists; otherwise, set a default or handle appropriately
                const displayValue = discount.displayValue !== undefined ? discount.displayValue.toFixed(2) : 'N/A';
                const description = `${discount.name}: ${discount.value}% (Equivalent: £${displayValue})`;
                yPos = this.addDiscountRow(doc, yPos, description);
            });
        }

        return yPos;
    }

    addDiscountRow(doc, yPos, text) {
        doc.setFontSize(10);
        doc.text(text, 10, yPos);
        return yPos + 5; // Increase yPos for next content
    }

    // Helper method to add a text row to the PDF for discounts, adjusted for alignment
    addTextRow(doc, yPos, leftText, rightText) {
        const pageWidth = doc.internal.pageSize.getWidth();
        const leftMargin = 10;
        const rightTextIndent = 60; // Adjust this to control where the right text starts

        doc.setFontSize(10);
        // Print the left text (description)
        doc.text(leftText, leftMargin, yPos);
        
        // Calculate the position for the right text (amount) based on the page width and a fixed indent
        const rightTextPosition = pageWidth - rightTextIndent; // Calculate the x position for the right text
        
        // Print the right text slightly indented from the calculated position to simulate "tabbing"
        doc.text(rightText, rightTextPosition, yPos, { align: "left" });
        return yPos + 5; // Increase yPos for next content
    }


    addTotalsTable(doc, yPos) {
        const tableData = [
            ['Subtotal', `£${this.invoiceManager.subtotal.toFixed(2)}`],
            ['VAT', `£${this.invoiceManager.vat.toFixed(2)}`],
        ];
    
        // Add flat discounts to the table data
        this.invoiceManager.discounts
            .filter(discount => discount.type === 'flat')
            .forEach(discount => {
                tableData.push([`${discount.name}`, `£${discount.value.toFixed(2)}`]);
            });
    
        // Add percentage discounts (deposits) to the table data
        this.invoiceManager.discounts
            .filter(discount => discount.type === 'percent')
            .forEach(discount => {
                const displayValue = discount.displayValue !== undefined ? discount.displayValue.toFixed(2) : 'N/A';
                tableData.push([`${discount.name} (${discount.value}%)`, `£${displayValue}`]);
            });
    
        tableData.push(['Total', `£${this.invoiceManager.total.toFixed(2)}`]);
    
        const cellPadding = 5;
        const cellWidth = (doc.internal.pageSize.getWidth() - 20) / 2;
    
        // Table headers
        doc.setFillColor("#B1202B");
        doc.setTextColor(255, 255, 255);
        doc.rect(10, yPos, doc.internal.pageSize.getWidth() - 20, 10, 'F');
        doc.setFont(undefined, 'bold');
        doc.text('Description', 10 + cellPadding, yPos + 8);
        doc.text('Amount', 10 + cellWidth + cellPadding, yPos + 8);
        yPos += 10;
    
        // Table rows
        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        tableData.forEach((row, rowIndex) => {
            doc.setFillColor("#FFFFFF");
            doc.rect(10, yPos, cellWidth, 8, 'F');
            doc.text(row[0], 10 + cellPadding, yPos + 6);
            doc.setFillColor("#FFFFFF");
            doc.rect(10 + cellWidth, yPos, cellWidth, 8, 'F');
            doc.text(row[1], 10 + cellWidth + cellPadding, yPos + 6);
            yPos += 8;
        });
    
        return yPos + 10;
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
    
    document.getElementById('generatePDFButton').addEventListener('click', async () => {
        await invoicingUI.generatePDF();
    });

    document.getElementById('addSampleButtonn').addEventListener('click', () => {
        invoicingUI.sampleManager.addSampleRow();
        console.log("Add Sample button clicked.");
    });
}); 