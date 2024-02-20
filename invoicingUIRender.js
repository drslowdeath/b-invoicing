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
            this.resetTotalsAndItems(); // Resets totals and items when a new client is selected
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

        updateTotalsUI() {
            const summary = this.invoiceManager.getInvoiceSummary();
    
            document.getElementById('invoiceSubtotal').textContent = `£${summary.subtotal}`;
            document.getElementById('invoiceVAT').textContent = `£${summary.vat}`;
            document.getElementById('invoiceTotal').textContent = `£${summary.total}`;
    
            // Update and display discount row if applicable
            const discountAmount = parseFloat(summary.discount);
            if (discountAmount > 0) {
                document.getElementById('discountRow').style.display = '';
                document.getElementById('invoiceDiscount').textContent = `£${summary.discount}`;
                // Update discount description based on type if necessary
                // document.getElementById('discountDescription').textContent = `Discount (${this.invoiceManager.discountType === 'flat' ? '£' : '%' })`;
            } else {
                document.getElementById('discountRow').style.display = 'none';
            }
        }

        removeFromSelectedItems(id) {
            this.invoiceManager.removeItem(id); // Remove the item using its ID
            this.updateSelectedItemsTable(); // Refresh the items table
            this.updateTotalsUI(); // Update totals to reflect the change
        }
        
        
        // Include method to handle applying discounts through UI interactions
        handleApplyDiscount() {
            const discountType = document.querySelector('#discountTypeSelect').value; 
            const discountValue = parseFloat(document.querySelector('#discountValueInput').value);
    
            if (isNaN(discountValue)) {
                alert("Please enter a valid discount value.");
                return;
            }
    
            this.applyDiscount(discountType, discountValue);
        }
    
        applyDiscount(discountType, discountValue) {
            if (discountType === 'flat') {
                this.invoiceManager.applyDiscount(0, discountValue);
            } else { // 'percent'
                this.invoiceManager.applyDiscount(discountValue, 0);
            }
            this.updateTotalsUI();
        }

        handleRemoveDiscount() {
            this.invoiceManager.removeDiscount();
            this.updateTotalsUI();
        }

        resetTotalsAndItems() {
            // Resets InvoiceManager state
            this.invoiceManager.resetState();

            // Clears selected items from the UI
            const selectedItemsTbody = this.selectedItemsTable.querySelector('tbody');
            selectedItemsTbody.innnerHTML = '';

            // Clears samples from the UI
            const samplesTbody = document.querySelector('#samplesTable tbody');
            if (samplesTbody) samplesTbody.innerHTML = '';

            // Reset totals UI to default values
            document.getElementById('invoiceSubtotal').textContent = '£0.00';
            document.getElementById('invoiceVAT').textContent = '£0.00';
            document.getElementById('invoiceDiscount').textContent = '£0.00';
            document.getElementById('invoiceTotal').textContent = '£0.00';
            document.getElementById('discountRow').style.display = 'none'; // Hide discount row
        }

        // PDF generation HERE 
        generateInvoicePDF() {
            const invoiceData = {
                items: this.invoiceManager.items,
                subtotal: this.invoiceManager.subtotal.toFixed(2),
                vat: this.invoiceManager.calculateVAT(this.invoiceManager.subtotal).toFixed(2),
                total: this.invoiceManager.total.toFixed(2)
            };
            const pdfGenerator = new PDFGenerator(invoiceData);
            pdfGenerator.downloadPDF();
        }
    }

    class InvoiceManager {
        constructor() {
            this.items = []; // Holds items with { id, name, quantity, price, totalPrice }
            this.samples = []; // Holds samples with { id, name, pricePerHour, hoursWorked, totalPrice }
            this.subtotal = 0;
            this.vatRate = 0.20; // 20% VAT
            this.discount = { percentage: 0, flat: 0 };
            this.total = 0;
        }
        
        addItem(id, name, quantity, price) {
            const existingItem = this.items.find(item => item.id === id);
            if (existingItem) {
                existingItem.quantity += quantity;
                existingItem.totalPrice = existingItem.price * existingItem.quantity;
            } else {
                this.items.push({ id, name, quantity, price, totalPrice: price * quantity });
            }
            this.calculateTotals();
            console.log('Item Added', {id, name, quantity , price});
            this.logCurrentState();
        }
        
        removeItem(id) {
            const itemIndex = this.items.findIndex(item => item.id === id);
            if (itemIndex > -1) {
                this.items.splice(itemIndex, 1);
                this.calculateTotals();
            }
            console.log(`Item Removed: ${id}`);
            this.logCurrentState();
        }
    
        addSample({id, name, pricePerHour, hoursWorked, totalPrice}) {
            this.samples.push({id, name, pricePerHour, hoursWorked, totalPrice});
            this.calculateTotals();
            console.log('Sample Added', {id, name, pricePerHour, hoursWorked, totalPrice});
            this.logCurrentState();
        }
    
        removeSample(id) {
            const index = this.samples.findIndex(sample => sample.id === id);
            if (index > -1) {
                this.samples.splice(index, 1);
                this.calculateTotals();
            }
            console.log(`Sample Removed: ${id}`);
            this.logCurrentState();
        }
    
        updateSample(id, newTotal) {
            const sample = this.samples.find(sample => sample.id === id);
            if (sample) {
                sample.totalPrice = newTotal;
                this.calculateTotals();
            }
            console.log(`Sample Updated: ${id}, New Total: ${newTotal}`);
            this.logCurrentState();
        }
        
        applyDiscount(percentage = 0, flat = 0) {
            this.discount = { percentage, flat };
            this.calculateTotals();
            console.log(`Discount Applied: ${percentage}% £${flat}`);
            this.logCurrentState();
        }
        
        calculateTotals() {
            const itemsTotal = this.items.reduce((acc, item) => acc + item.totalPrice, 0);
            const samplesTotal = this.samples.reduce((acc, sample) => acc + sample.totalPrice, 0);
            this.subtotal = itemsTotal + samplesTotal;
            const discountAmount = this.calculateDiscount();
            const vatAmount = this.calculateVAT(this.subtotal - discountAmount);
            this.total = this.subtotal - discountAmount + vatAmount;
            this.logCurrentState(); // Optional: log state after each calculation
        }
        
        calculateDiscount() {
            const discountFromPercentage = (this.subtotal * this.discount.percentage) / 100;
            return discountFromPercentage + this.discount.flat;
        }
        
        calculateVAT(subtotal) {
            return subtotal * this.vatRate;
        }
        
        getInvoiceSummary() {
            return {
                subtotal: this.subtotal.toFixed(2),
                vat: this.calculateVAT(this.subtotal - this.calculateDiscount()).toFixed(2),
                discount: this.calculateDiscount().toFixed(2),
                total: this.total.toFixed(2),
            };
        }
    
        removeDiscount() {
            this.applyDiscount(0, 0);
            this.calculateTotals();
            console.log('Discount Removed');
        }
    
        logCurrentState() {
            console.log('Current State:', {
                items: this.items,
                samples: this.samples,
                subtotal: this.subtotal,
                discount: this.discount,
                vat: this.calculateVAT(this.subtotal - this.calculateDiscount()),
                total: this.total
            });
        }
    
        resetState() {
            this.items = [];
            this.samples = [];
            this.subtotal = 0;
            this.discount = { percentage: 0, flat: 0 };
            this.total = 0;
            console.log('State Reset');
            this.logCurrentState();
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
            // Example of adding invoice items to the PDF
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
            invoicingUI.handleRemoveDiscount();
        })

        document.getElementById('generatePDFButton').addEventListener('click', () => invoicingUI.generateInvoicePDF());

        document.getElementById('addSampleButton').addEventListener('click', () => invoicingUI.sampleManager.addSampleRow());
    });

   