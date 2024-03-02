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
                const addSampleButton = document.getElementById('addSampleButton');
                addSampleButton.classList.remove('opacity-50', 'cursor-not-allowed');
                addSampleButton.removeAttribute('disabled');
                addSampleButton.removeAttribute('title');
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
        // NEW
        updateTotalsUI() {
            const summary = this.invoiceManager.getInvoiceSummary();
        
            document.getElementById('invoiceSubtotal').textContent = `£${summary.subtotal}`;
            document.getElementById('invoiceVAT').textContent = `£${summary.vat}`;
            document.getElementById('invoiceTotal').textContent = `£${summary.total}`;
        
            // Clear previous adjustments display
            const discountRow = document.getElementById('discountRow');
            discountRow.style.display = 'none'; // Hide initially, show only if there's a discount
            const extrasContainer = document.getElementById('extrasRow');
            extrasContainer.innerHTML = ''; // Clear existing content
            extrasContainer.style.display = 'none'; // Hide initially, show only if there are extras
        
            // Iterate through adjustments to display them appropriately
            summary.adjustments.forEach(adjustment => {
                if (adjustment.type.includes('discount')) {
                    // Display discount information
                    const discountDescription = adjustment.type === 'discountFlat' ? 'Flat Discount' : 'Percentage Discount';
                    document.getElementById('discountDescription').textContent = discountDescription;
                    document.getElementById('invoiceDiscount').textContent = `£${adjustment.value}`;
                    discountRow.style.display = '';
                } else {
                    // Display extras
                    const row = document.createElement('tr');
                    row.innerHTML = `<td class="border p-2">${adjustment.note}</td><td class="border p-2">£${adjustment.value}</td>`;
                    extrasContainer.appendChild(row);
                    extrasContainer.style.display = '';
                }
            });
        }
        
        // Updates the UI to display adjustments
        updateAdjustmentsDisplay(adjustments) {
            const adjustmentsContainer = document.getElementById('adjustmentsContainer');
            adjustmentsContainer.innerHTML = ''; // Clear existing adjustments
        
            adjustments.forEach(adj => {
                const row = document.createElement('tr');
                let adjTypeDisplay = adj.type.replace(/([A-Z])/g, ' $1').trim(); // Convert camelCase to normal text
                row.innerHTML = `<td class="border p-2">${adj.note || adjTypeDisplay}</td><td class="border p-2">£${adj.value}</td>`;
                adjustmentsContainer.appendChild(row);
            });
        
            adjustmentsContainer.style.display = adjustments.length > 0 ? '' : 'none';
        }
        handleApplyDiscount() {
            const discountType = document.querySelector('#discountTypeSelect').value;
            const discountValue = parseFloat(document.querySelector('#discountValueInput').value);
            const note = discountType === 'percent' ? 'Percentage Discount' : 'Flat Discount';
        
            this.invoiceManager.addAdjustment(discountType === 'percent' ? 'discountPercentage' : 'discountFlat', discountValue, note);
            this.updateTotalsUI();
        }
        
        handleApplyExtra() {
            const extraNote = document.querySelector('#extraNoteInput').value;
            const extraValue = parseFloat(document.querySelector('#extraValueInput').value);
        
            const type = extraValue >= 0 ? 'extraCharge' : 'extraDiscount';
            this.invoiceManager.addAdjustment(type, Math.abs(extraValue), extraNote);
            this.updateTotalsUI();
        }
        
        handleRemoveLastAdjustment() {
            this.invoiceManager.removeLastAdjustment();
            this.updateTotalsUI();
        }
        resetTotalsAndItems() {
            this.invoiceManager.resetState(); // Resets the state of InvoiceManager
            this.clearUI(); // Clears the UI elements
            this.updateTotalsUI(); // Recalculate and update UI
        }
        
        clearUI() {
            // Clears input fields for discounts and extras
            document.getElementById('extraNoteInput').value = '';
            document.getElementById('extraValueInput').value = '';
            document.getElementById('discountValueInput').value = '';
            document.querySelector('#discountTypeSelect').selectedIndex = 0;
        
            // Assuming you have specific rows or containers for discounts and extras in your HTML,
            // you would clear or hide them here. Since there's no 'adjustmentsContainer', we'll skip that.
            // Hide the discount and extras sections if they are separate.
            const discountRow = document.getElementById('discountRow');
            if(discountRow) discountRow.style.display = 'none';
            const extrasRow = document.getElementById('extrasRow');
            if(extrasRow) {
                extrasRow.innerHTML = ''; // Clear the extras rows
                extrasRow.style.display = 'none';
            }
        
            // Reset totals display to default values
            document.getElementById('invoiceSubtotal').textContent = '£0.00';
            document.getElementById('invoiceVAT').textContent = '£0.00';
            document.getElementById('invoiceDiscount').textContent = '£0.00'; // Assuming you want to reset this as well
            document.getElementById('invoiceTotal').textContent = '£0.00';
        }
        
        //END NEW HERERERERER
        
        // PDF generation HERE 
        generateInvoicePDF() {
            const invoiceData = this.invoiceManager.getInvoiceSummary(); // Adjust to use the summary for PDF data
            const pdfGenerator = new PDFGenerator(invoiceData);
            pdfGenerator.downloadPDF();
        }
    }
    // You calculate all discounts and extras on the subtotal first then add the vat its quite simple really. Calculate subtotal. Always perform discounts on the subtotal. Adjust subtotal then perform another discount operation.Allowing the discount to be applied as percentage or flat rate and extra (discount) as flat rate 

    class InvoiceManager {
        constructor() {
            this.items = []; // Items in the invoice
            this.samples = []; // Sample items in the invoice
            this.vatRate = 0.20; // VAT rate
            this.adjustments = []; // Unified list for discounts and extras
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
    
        removeSample(id) {
            // Removes samples
            this.samples = this.samples.filter(sample => sample.id !== id);
            this.recalculateTotals();
        }
    
        addAdjustment(type, value, note = '') {
            // Adds any type of adjustment, including discounts and extra charges
            this.adjustments.push({ type, value, note });
            this.recalculateTotals();
        }
    
        removeLastAdjustment() {
            // Removes the last adjustment
            this.adjustments.pop();
            this.recalculateTotals();
        }
    
        recalculateTotals() {
            let subtotal = [...this.items, ...this.samples].reduce((acc, curr) => acc + curr.totalPrice, 0);
    
            // Process each adjustment
            this.adjustments.forEach(adj => {
                switch (adj.type) {
                    case 'discountFlat':
                        subtotal -= adj.value;
                        break;
                    case 'discountPercentage':
                        subtotal *= (1 - (adj.value / 100));
                        break;
                    case 'extraCharge':
                    case 'extraDiscount': // Assuming extraDiscount subtracts from the subtotal
                        subtotal -= adj.value;
                        break;
                }
            });
    
            subtotal = Math.max(subtotal, 0); // Ensure subtotal is not negative
            const vat = subtotal * this.vatRate;
            const total = subtotal + vat;
    
            this.subtotal = subtotal;
            this.vat = vat;
            this.total = total;
        }
    
        getInvoiceSummary() {
            // Formats the summary for display
            return {
                subtotal: this.subtotal.toFixed(2),
                vat: this.vat.toFixed(2),
                total: this.total.toFixed(2),
                adjustments: this.adjustments.map(adj => ({
                    type: adj.type,
                    value: adj.value.toFixed(2),
                    note: adj.note
                }))
            };
        }
    
        resetState() {
            // Resets the invoice to its initial state
            this.items = [];
            this.samples = [];
            this.adjustments = [];
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
            row.className = 'hover:bg-gray-200 transition-colors duration-200 border-gray-300 border text-center'
            row.innerHTML = `
                <td class="border p-2 whitespace-normal"><input type="text" class="sample-name-input border border-gray-300 p-2 rounded" placeholder="Sample Name"/></td>
                <td class="border p-2 whitespace-normal"><input type="number" class="price-per-hour-input border border-gray-300 p-2 rounded" placeholder="0" min="0"/></td>
                <td class="border p-2 whitespace-normal"><input type="number" class="hours-worked-input border border-gray-300 p-2 rounded" placeholder="0" min="0"/></td>
                <td class="sample-total-price p-2 border whitespace-normal">£0.00</td>
                <td class="sample-actions"><button class="calculate-sample-price bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Calculate</button></td>
            `;
            row.querySelector('.calculate-sample-price').addEventListener('click', () => this.calculateSamplePrice(row));
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
        
            if (isEditing) {
                const sampleId = parseInt(row.getAttribute('data-sample-id'));
                this.invoiceManager.updateSample(sampleId, totalPrice);
            } else {
                const sampleId = this.nextId++;
                this.invoiceManager.addSample({ id: sampleId, name, pricePerHour, hoursWorked, totalPrice });
                row.setAttribute('data-sample-id', sampleId.toString());
            }
            
            this.changeToEditAndRemoveButtons(row);
            this.updateUITotalsCallback();
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
        constructor(invoiceData) {
            this.invoiceData = invoiceData;
        }
    
        initializePDF() {
            // Initialize jsPDF
            const doc = new window.jspdf.jsPDF();
            doc.setFontSize(12);
            return doc;
        }
    
        generatePDF() {
            const doc = this.initializePDF();
            this.generateTitle(doc);
            this.generateBody(doc);
            // Any additional formatting or content
            return doc;
        }
    
        generateTitle(doc) {
            // Example of adding a title to the PDF
            doc.setFontSize(18);
            doc.text('Invoice Summary', 10, 20);
        }
    
        generateBody(doc) {
            // Subtotal, VAT, deposit and total controls
            let yPos = 30;
            this.invoiceData.items.forEach((item, index) => {
                doc.setFontSize(12);
                doc.text(`${item.name}: £${item.price.toFixed(2)} x ${item.quantity} = £${item.totalPrice.toFixed(2)}`, 10, yPos);
                yPos += 10;
            });
    
            // Add subtotal, VAT, and total
            yPos += 10; // Add some space before the summary
            doc.text(`Subtotal: £${this.invoiceData.subtotal}`, 10, yPos);
            yPos += 10;
            doc.text(`VAT: £${this.invoiceData.vat}`, 10, yPos);
            yPos += 10;
            doc.text(`Total: £${this.invoiceData.total}`, 10, yPos);
        }
    
        downloadPDF() {
            const doc = this.generatePDF();
            // This will prompt the user to save the PDF
            doc.save('invoice.pdf');
        }
    }

    // Initialize InvoicingUI after DOM is fully loaded
    document.addEventListener('DOMContentLoaded', () => {
        invoicingUI = new InvoicingUI('.invoice-client-modal', '.invoice-dropdown-list', '#invoiceStylesTable', '#selectedItemsTable');
        window.invoicingUI = invoicingUI; // Make it accessible for inline handlers
        invoicingUI.loadClients();

        document.getElementById('removeDiscountButton').addEventListener('click', function() {
            invoicingUI.handleRemoveLastAdjustment();
        })

        // Ev Listener to remove the last Extra Added
        document.getElementById('removeLastExtraButton').addEventListener('click', function() {
            invoicingUI.handleRemoveLastAdjustment();
            console.log("Hello Heather");
        });

        document.getElementById('generatePDFButton').addEventListener('click', () => invoicingUI.generateInvoicePDF());

        document.getElementById('addSampleButton').addEventListener('click', () => invoicingUI.sampleManager.addSampleRow());
    });

   