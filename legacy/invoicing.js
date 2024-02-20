//const { jsPDF } = require("jspdf");
//const fs = require('fs');
var items = [];
let pdfFilePath = '';
let totalBeforeVAT = parseFloat($("#totalAmount").text().replace(/[^\d.-]/g, "")); // declaring totalBeforeVat globally so it can be used in the FinancialAdjustments class


class Invoicing {
  constructor() {
    this.clients = [];
    this.selectedClientId = null; // New property to store the selected client's ID
  }

  fetchClientsForInvoicing() {
    return fetch("/clients")
      .then((response) => response.json())
      .then((data) => {
        this.clients = data;
        return data;
      })
      .catch((error) =>
        console.error("Error fetching clients for invoicing:", error)
      );
  }

  populateClientDropdown() {
    this.fetchClientsForInvoicing().then(() => {
      const $clientSelect = $("#clientSelect");
      $clientSelect.find("option:not(:first)").remove();
      this.clients.forEach((client) => {
        $clientSelect.append(`<option value="${client.id}">${client.name}</option>`);
      });

      // Capture the client ID when a client is selected
      $clientSelect.change(() => {
        this.selectedClientId = $clientSelect.val();
      });
    });
  }
}
const invoicing = new Invoicing();

$(document).ready(() => {
  invoicing.populateClientDropdown();
});

function initializePDF() {
  const doc = new window.jspdf.jsPDF();
  doc.setFontSize(12);
  return doc;
}

function addTextToPDF(doc, text, x, y) {
  doc.text(text, x, y);
}

function formatInvoiceRow(tr) {
  let row = $(tr).find("td").map(function () {
    return $(this).text();
  }).get();

  let [styleName, pricePerHour, quantity, total] = row;
  pricePerHour = pricePerHour.replace(/[^0-9.]/g, "");
  quantity = quantity.replace(/[^\d]/g, "");
  total = total.replace(/[^0-9.]/g, "");

  if (styleName.endsWith("-sample")) {
    styleName = styleName.replace("-sample", " (sample)");
    quantity += " hrs";
  }

  return `${styleName} - £${pricePerHour} - x${quantity} - £${total}`;
}

function processInvoiceRows(doc, yPos) {
  $("#invoiceTable tbody tr").each(function () {
    let rowData = formatInvoiceRow(this);
    addTextToPDF(doc, rowData, 10, yPos);
    yPos += 5;
  });
  return yPos;
}

function addTotalsToPDF(doc, yPos) {
  const maxPageHeight = 290;
  const rowHeight = 5;

  // Check for new page
  if (yPos > maxPageHeight) {
    doc.addPage();
    yPos = 20;
  }

  // Adding line
  doc.line(10, yPos, 200, yPos);
  yPos += rowHeight;

  // Adding Total Amount (Subtotal)
  let totalAmount = $("#totalAmount").text();
  addTextToPDF(doc, `Total Amount: ${totalAmount}`, 10, yPos);
  yPos += rowHeight;

  // Adding VAT
  let vatAmount = $("#vatAmount").text();
  addTextToPDF(doc, `VAT (20%): ${vatAmount}`, 10, yPos);
  yPos += rowHeight;

  // Adding Discount if applicable
  if ($("#applyDiscountCheckbox").is(":checked")) {
    let discountAmount = calculateDiscount();
    addTextToPDF(doc, `Discount: ${discountAmount}`, 10, yPos); 
    yPos += rowHeight;
  }

  // Adding Final Total
  let finalTotal = $("#finalTotal").text();
  addTextToPDF(doc, `Total: ${finalTotal}`, 10, yPos);
  yPos += rowHeight;

  // Adding 50% Deposit if applicable
  if ($("#apply50PercentDeposit").is(":checked")) {
    let fiftyPercentDeposit = (parseFloat(finalTotal.replace(/[^\d.-]/g, '')) * 0.5).toFixed(2);
    addTextToPDF(doc, `50% Deposit: £${fiftyPercentDeposit}`, 10, yPos);
    yPos += rowHeight;
  }

  // Adding Second Deposit if applicable
  let secondDeposit = parseFloat($("#secondDeposit").val()) || 0;
  if (secondDeposit > 0) {
    addTextToPDF(doc, `Second Deposit: £${secondDeposit.toFixed(2)}`, 10, yPos);
    yPos += rowHeight;
  }

  // Adding Balance Due
  let balanceDue = $("#balanceDue").text();
  addTextToPDF(doc, `Balance Due: ${balanceDue}`, 10, yPos);
  yPos += rowHeight;

  return yPos;
}



















function calculateDiscount(subtotal) {
  if (!$("#applyDiscountCheckbox").is(":checked")) {
      return 0;
  }

  let discountType = $("input[name='discountType']:checked").val();
  let discountValue = parseFloat($("#discountValue").val()) || 0;
  let discountAmount = 0;

  if (discountType === "percent") {
      discountAmount = subtotal * (discountValue / 100);
  } else if (discountType === "fixed") {
      discountAmount = discountValue;
  }

  return discountAmount || 0; // Ensure NaN is not returned
}





















// HERE WE NEED TO PUT THE INVOICE NUMBER - Other instances contain logic for this and are interdependent
async function generatePDFFileName(clientName) {
  const dateStr = getFormattedDate();
  const formattedClientName = clientName.replace(/[^a-zA-Z0-9]/g, '_');
  const invoiceNumberForPDF = await getNextInvoiceNumber();
  
  const fileName = `${dateStr}_${formattedClientName}_INVOICE_NUMBER_${invoiceNumberForPDF}.pdf`;
  console.log("Generated PDF File Name:", fileName);
  return fileName;
}

async function collectInvoiceDataForPDF() {
  let selectedClientId = parseInt($("#clientSelect").val(), 10);
  let selectedClient = invoicing.clients.find(client => client.id === selectedClientId);
  let isDiscountApplied = $("#applyDiscountCheckbox").is(":checked");
  let firstDeposit = $("#apply50PercentDeposit").is(":checked") ? financialDetails.finalTotal * 0.5 : 0;
  let secondDeposit = parseFloat($("#secondDeposit").val()) || 0;
  let discountType = null;
  let discountValue = 0;
  console.log("Selected Client ID:", selectedClientId);
  console.log("Client selected:", selectedClient);
  if (!selectedClient) {
    console.error("Client not selected or not found");
    return null;
  }
  if (isDiscountApplied) {
    discountType = $("input[name='discountType']:checked").val() || null;
    discountValue = parseFloat($("#discountValue").val()) || 0;
  }
  let items = collectItemsFromInvoiceTable();

  // Subtotal, VAT, and Total calculations
  let financialDetails = calculateFinancialDetails(items);

  return {
    clientId: invoicing.selectedClientId,
    clientName: selectedClient.name,
    companyName: selectedClient.company_name,
    clientAddress: selectedClient.address,
    discountValue: discountValue,
    discountType: discountType,
    deposit1: firstDeposit,
    deposit2: secondDeposit,
    items: items,
    ...financialDetails
  };
}

function collectItemsFromInvoiceTable() {
  let items = [];
  $("#invoiceTable tbody tr").each(function () {
    let [styleName, price, quantity] = $(this).find("td").map(function () {
      return $(this).text();
    }).get();

    items.push({
      styleName,
      price: parseFloat(price.replace(/[^0-9.]/g, "")),
      quantity: parseInt(quantity.replace(/[^\d]/g, "")),
    });
  });
  return items;
}

function calculateFinancialDetails(items) {
  let subtotal = items.reduce((total, item) => total + (item.price * item.quantity), 0);
  let vatAmount = subtotal * 0.2; // Example VAT rate
  let discountValue = parseFloat($("#discountValue").val()) || 0;
  let discountAmount = $("#discountType").val() === "percent" ? subtotal * (discountValue / 100) : discountValue;
  let finalTotal = subtotal + vatAmount - discountAmount;

  // Ensure that all values are numbers and not NaN
  subtotal = isNaN(subtotal) ? 0 : subtotal;
  vatAmount = isNaN(vatAmount) ? 0 : vatAmount;
  discountAmount = isNaN(discountAmount) ? 0 : discountAmount;
  finalTotal = isNaN(finalTotal) ? 0 : finalTotal;

  return {
    subtotal,
    vatAmount,
    discountAmount,
    finalTotal
  };
}


async function generatePDF(clientName, companyName, clientAddress) {
  const doc = initializePDF();
  let yPos = 90;

  addTextToPDF(doc, `Date: ${getCurrentFormattedDate()}`, 10, 10);
  addTextToPDF(doc, "From: S.A.M. Creations\nAddress: 326 Lee High Road\nLewisham, London, SE13 5RS", 10, 60);
  addTextToPDF(doc, `To: ${clientName}\nCompany: ${companyName}\nAddress: ${clientAddress}`, 110, 60);
  addTextToPDF(doc, "Invoice:", 10, 80);
  doc.line(10, 83, 200, 83);

  yPos = processInvoiceRows(doc, yPos);

  if (yPos > 290) {
    doc.addPage();
    yPos = 20;
  }

  yPos = addTotalsToPDF(doc, yPos);

  const pdfFileName = await generatePDFFileName(clientName);
  const pdfBlob = new Blob([doc.output()], { type: "application/pdf" });
  const pdfPath = await uploadPDF(pdfBlob, pdfFileName); // Await the upload and get the path
  console.log("Generated PDF Path:", pdfPath);
  return pdfPath; // Return the path
}


// DATE CODE
function getCurrentFormattedDate() {
  const today = new Date();
  const year = today.getFullYear();
  // Array of month names
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const month = monthNames[today.getMonth()]; // Get month name
  const day = String(today.getDate()).padStart(2, "0");
  return `${day} ${month} ${year}`;
}
function getFormattedDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}_${month}_${day}`;
}
function clearUI() {
  document.querySelector("#totalAmount").textContent = 0;
  document.querySelector("#vatAmount").textContent = 0;
  document.querySelector("#finalTotal").textContent = 0;
}














// function calculateInvoiceTotals() {
//   let subtotal = 0;
//   $("#invoiceTable tbody tr").each(function () {
//     let total = parseFloat($(this).find("td:eq(3)").text().replace(/[^0-9.]/g, ""));
//     subtotal += total;
//   });

//   totalBeforeVAT = subtotal;

//   let vatAmount = subtotal * 0.2; // VAT is 20% of subtotal
//   let finalTotal = subtotal + vatAmount; // Total including VAT

//   let firstDepositApplied = $("#apply50PercentDeposit").is(":checked");
//   let secondDeposit = parseFloat($("#secondDeposit").val()) || 0;

//   let firstDepositAmount = firstDepositApplied ? finalTotal * 0.5 : 0;
//   let balanceDue = finalTotal - firstDepositAmount - secondDeposit;

//   updateUI(subtotal, vatAmount, finalTotal, firstDepositAmount, secondDeposit, balanceDue);
// }

function calculateInvoiceTotals() {
  let items = collectItemsFromInvoiceTable();
  let financialDetails = calculateFinancialDetails(items);

  // Initial calculations
  let subtotal = financialDetails.subtotal;

  // Calculate and apply discount
  let discountAmount = calculateDiscount(subtotal);
  subtotal -= discountAmount; // Apply discount to subtotal

  let vatAmount = subtotal * 0.20; // Recalculate VAT based on discounted subtotal
  let finalTotal = subtotal + vatAmount;

  // Deposit calculations
  let firstDepositApplied = $("#apply50PercentDeposit").is(":checked");
  let secondDeposit = parseFloat($("#secondDeposit").val()) || 0;
  let depositTotal = (firstDepositApplied ? finalTotal * 0.5 : 0) + secondDeposit;
  let balanceDue = finalTotal - depositTotal;

  // Ensure balance due is not negative
  if (balanceDue < 0) balanceDue = 0;

  updateUI(subtotal, vatAmount, finalTotal, balanceDue, discountAmount);
}



function updateUI(subtotal, vatAmount, finalTotal, balanceDue, discountAmount) {
  $("#totalAmount").text(`£${subtotal.toFixed(2)}`);
  $("#vatAmount").text(`£${vatAmount.toFixed(2)}`);
  $("#finalTotal").text(`£${finalTotal.toFixed(2)}`);
  $("#balanceDue").text(`£${balanceDue.toFixed(2)}`);
  $("#discountAmount").text(`£${discountAmount.toFixed(2)}`); // Display discount amount
}






















// CALCULATING TOTAL 
function updateRowTotal(element) {
  var row = element.closest("tr");
  var pricePerHour =
    parseFloat(row.querySelector(".pricePerHourInput").value) || 0;
  var hoursWorked = parseInt(row.querySelector(".hoursWorkedInput").value) || 0;
  var total = pricePerHour * hoursWorked;
  // Assuming the total is in the 4th column
  row.querySelector("td:nth-child(4)").textContent = total.toFixed(2);
  // Recalculate the entire invoice totals
  calculateInvoiceTotals();
}
// SAMPLE ROW CODE | SAMPLE ROW CODE | SAMPLE ROW CODE | SAMPLE ROW CODE | SAMPLE ROW CODE | SAMPLE ROW CODE | SAMPLE ROW CODE
function addSampleRowToInvoiceTable() {
  var invoiceTable = $("#invoiceTable").DataTable();
  // Add a new row with editable fields and a Confirm button
  invoiceTable.row
    .add([
      '<input type="text" class="styleInput border border-gray-400 rounded pl-2 focus:border-neutral-300 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-sky-800" placeholder="Sample Name">',
      '<input type="number" class="pricePerHourInput border border-gray-400 rounded pl-2 focus:border-neutral-300 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-sky-800" min="0" placeholder="Price Per Hour">',
      '<input type="number" class="hoursWorkedInput border border-gray-400 rounded pl-2 focus:border-neutral-300 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-sky-800" min="0" placeholder="Hours Worked">',
      "0.00", // Initial total
      '<button class="confirmStyleToInvoice submit-button bg-green-600 hover:bg-green-500 shadow-sm hover:shadow-md text-neutral-100 rounded px-2 py-2 text-sm font-bold"><i class="fa-regular fa-circle-check mr-1"></i>Confirm</button>',
    ])
    .draw();
  calculateInvoiceTotals(); // Recalculate totals
  attachSampleEventListeners();
}
function confirmSampleRow(buttonElement) {
  var row = buttonElement.closest("tr");
  var style = row.find(".styleInput").val() + "-sample"; // Appending "-sample" to the style name
  var pricePerHour = parseFloat(row.find(".pricePerHourInput").val()) || 0;
  var hoursWorked = parseInt(row.find(".hoursWorkedInput").val()) || 0;
  var total = pricePerHour * hoursWorked;
  var item = {
    styleName: style,
    pricePerUnit: null,
    hoursWorked: hoursWorked,
    quantity: null,
    total: total,
    samplePrice: pricePerHour, // Use pricePerHour directly here
  };
  items.push(item);
  // Format the quantity display as "x hrs" for sample items
  var formattedQuantity = `x${hoursWorked} hrs`;
  // Update the row data in the DataTable
  var invoiceTable = $("#invoiceTable").DataTable();
  invoiceTable
    .row(row)
    .data([
      style,
      `£${pricePerHour.toFixed(2)}`,
      formattedQuantity, // Updated to display as "x hrs"
      `£${total.toFixed(2)}`,
      '<button class="removeStyleFromInvoice submit-button rounded px-2 py-2 mr-2 bg-red-700 hover:bg-red-600 text-neutral-100 text-sm font-bold shadow-sm hover:shadow-md"><i class="fa-regular fa-trash-can mr-1"></i>Remove</button>',
    ])
    .draw();
  calculateInvoiceTotals(); // Recalculate totals
}

class FinancialAdjustments {
  constructor() {
    this.adjustments = [];
  }

  addAdjustment(type, value) {
    this.adjustments.push({ type, value });
  }

  calculateTotalAdjustments(subtotal) {
    let totalAdjustment = 0;
    this.adjustments.forEach(adj => {
      if (adj.type === "percent") {
        totalAdjustment += subtotal * (parseFloat(adj.value) / 100);
      } else {
        totalAdjustment += parseFloat(adj.value);
      }
    });
    return totalAdjustment;
  }
}

let financialAdjustments = new FinancialAdjustments();


// EVENT LISTENERS | EVENT LISTENERS | EVENT LISTENERS | EVENT LISTENERS | EVENT LISTENERS | EVENT LISTENERS | EVENT LISTENERS 
// Initialize the DataTables when document is ready
$(document).ready(function () {
  $("#clientStylesTable").DataTable();

  $("#invoiceTable").DataTable({
    paging: false,
    searching: false,

    columnDefs: [
      {
        targets: -1,
        className: "dt-body-right",
      },
    ],
  });
// ADD STYLE TO INVOICE
$(document).on("click", ".addStyleToInvoice", function () {
  var row = $(this).closest("tr");
  var styleName = row.find("td:eq(0)").text();
  var price = parseFloat(row.find("td:eq(1)").text());
  var quantity = parseInt(row.find(".quantityInput").val());
  var invoiceTable = $("#invoiceTable").DataTable();

  // Check if the item already exists in the invoice
  var existingRow = null;
  invoiceTable.rows().every(function () {
    var rowData = this.data();
    if (rowData[0] === styleName) {
      existingRow = this;
      return false; // to break the loop
    }
    return true; // to continue the loop
  });

  if (existingRow) {
    // Update existing item
    var currentQuantity = parseInt(existingRow.data()[2].replace("x", "")) || 0;
    var newQuantity = currentQuantity + quantity;
    var newTotal = price * newQuantity;
    existingRow
      .data([
        styleName,
        `£${price.toFixed(2)}`,
        `x${newQuantity}`,
        `£${newTotal.toFixed(2)}`,
        existingRow.data()[4],
      ])
      .draw();
  } else {
    // Add new item
    var total = price * quantity;
    invoiceTable.row
      .add([
        styleName,
        `£${price.toFixed(2)}`,
        `x${quantity}`, // Changed to display as x1, x2, etc.
        `£${total.toFixed(2)}`,
        `<button class="removeStyleFromInvoice submit-button rounded px-2 py-2 mr-2 bg-red-700 hover:bg-red-600 text-neutral-100 text-sm font-bold shadow-sm hover:shadow-md"><i class="fa-regular fa-trash-can mr-1"></i>Remove</button>`,
      ])

      .draw();
  }
  calculateInvoiceTotals();
});
// REMOVE STYLE FROM INVOICE BUTTON 
$(document).on("click", ".removeStyleFromInvoice", function () {
  var invoiceTable = $("#invoiceTable").DataTable();
  invoiceTable.row($(this).closest("tr")).remove().draw();
  calculateInvoiceTotals(); // Recalculate totals after removing a row
});
// ADD SAMPLE TO INVOICE BUTTON
  $("#addSampleButton").click(function () {
    var clientId = $("#clientSelect").val();
    if (!clientId) {
      alert("Please select a client first.");
      return;
    }
    addSampleRowToInvoiceTable();
  });
});
// ADDITIONAL SAMPLE LISTENERS - POSSIBILITY FOR REFACTOR - COMBINE IN 1 EVENT LISTENER? 
  function attachSampleEventListeners() {
    // Event listener for Confirm button
    $(".confirmStyleToInvoice")
      .off("click")
      .on("click", function () {
        confirmSampleRow($(this));
      });
  
    // Update total when price per hour or hours worked changes
    $(".pricePerHourInput, .hoursWorkedInput")
      .off("input")
      .on("input", function () {
        updateRowTotal(this); // Call updateRowTotal here
      });
  }

// RELEVANT TO SAMPLE EVENT LISTENERS 
document
  .querySelectorAll(".pricePerHourInput, .hoursWorkedInput")
  .forEach((element) =>
    element.addEventListener("input", function () {
      updateRowTotal(this);
    })
);
// POSSIBLY ONE IS NOT NEEDED OR A LITTLE REFACTORING TO COMBINE THEM? 
document
  .querySelectorAll(
    ".pricePerHourInput, .hoursWorkedInput, #discountType, #discountValue, #applyDiscount"
  )
  .forEach((element) =>
    element.addEventListener("change", calculateInvoiceTotals)
);
// GENERATE PDF BUTTON
$(document).ready(function () {
  $("#generatePdfBtn").on("click", async function () {
    if (!invoicing.selectedClientId) {
      alert("Please select a client first.");
      return;
    }
    console.log("Generate PDF button clicked.");

    try {
      console.log("Fetching invoice data for PDF...");
      let invoiceData = await collectInvoiceDataForPDF();
      console.log("Invoice data fetched:", invoiceData);

      if (invoiceData) {
        // Validate the financial details
        if (isNaN(invoiceData.subtotal) || isNaN(invoiceData.vatAmount) || isNaN(invoiceData.finalTotal)) {
          console.error("Invalid financial details");
          alert("There was an error calculating the invoice totals. Please check the invoice data.");
          return;
        }

        console.log("Fetching next invoice number...");
        const nextInvoiceNumber = await getNextInvoiceNumber();
        console.log("Next invoice number:", nextInvoiceNumber);

        console.log("Generating PDF...");
        const pdfPath = await generatePDF(
          invoiceData.clientName,
          invoiceData.companyName,
          invoiceData.clientAddress,
          nextInvoiceNumber // Pass the invoice number to the PDF generation function
        );
        console.log("PDF generated. Path:", pdfPath);

        const dataToSend = {
          invoice_number: nextInvoiceNumber,
          client_id: invoiceData.clientId,
          date_created: new Date().toISOString().slice(0, 10),
          total_amount: invoiceData.subtotal,
          vat_amount: invoiceData.vatAmount,
          discount_value: invoiceData.discountValue || 0,
          discount_type: invoiceData.discountType,
          final_total: invoiceData.finalTotal,
          status: 'Unpaid',
          notes: '',
          pdf_path: pdfPath
        };

        console.log("Data being sent to server:", JSON.stringify(dataToSend));
        $.ajax({
          url: "/api/invoices",
          type: "POST",
          contentType: "application/json",
          data: JSON.stringify(dataToSend),
          success: function (response) {
            console.log("Invoice saved successfully:", response);
            // Call function to update the invoice list here
            window.invoicingSystem.fetchAndUpdateInvoices();
          },
          error: function (error) {
            console.error("Error saving the invoice:", error);
            alert("Error saving the invoice. Please check the console for more details.");
          },
        });
      } else {
        console.error("Invoice data is null or undefined.");
        alert("Invoice data is missing. Please ensure all fields are correctly filled.");
      }
    } catch (error) {
      console.error("Error in generating PDF or updating invoices:", error);
      alert("An error occurred during the invoice generation process. Please check the console for more details.");
    }
  });

});



// JQUERY to handle client selection and table generation
$("#clientSelect").change(function () {
  var clientId = $(this).val();
  // Fetch and populate the styles table
  fetch(`/styles/client/${clientId}`)
    .then((response) => response.json())
    .then((styles) => {
      var stylesTable = $("#clientStylesTable").DataTable();
      stylesTable.clear();

      styles.forEach((style) => {
        stylesTable.row.add([
          style.styleName,
          style.price,
          `<input type="number" class="quantityInput border border-gray-400 rounded pl-2 focus:border-neutral-300 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-sky-800" min="1" value="1" style="width: 50px;">`,

          `<button class="addStyleToInvoice bg-green-600 hover:bg-green-500 shadow-sm hover:shadow-md submit-button text-neutral-100 rounded px-2 py-2 text-sm font-bold" data-style-id="${style.id}"><i class="fa-regular fa-circle-check mr-1"></i>Add to Invoice</button>`,
        ]);
      });

      stylesTable.draw();
      clearUI();
    })
    .catch((error) => console.error("Error fetching styles:", error));

  // Clear the invoice table
  var invoiceTable = $("#invoiceTable").DataTable();
  invoiceTable.clear().draw();

  // Reset VAT, discount, and total fields
  calculateInvoiceTotals;
});
// DISCOUNT JQUERY - EV listener
$("#applyDiscount").change(function () {
  if (this.checked) {
    $("#discountType").show();
    $("#discountValue").show();
  } else {
    $("#discountType").hide();
    $("#discountValue").hide();
  }

  calculateInvoiceTotals(); // Recalculate totals
});

$("#discountType, #discountValue").on("change input", function () {
  calculateInvoiceTotals(); // Recalculate totals
});

//Event listener for the add deposit button 
$("#addDepositButton").on("click", function() {
  let type = "50% DEPOSIT"; // Or "SecondDeposit", as per your naming
  let value = $("#depositValue").val(); // The deposit amount
  financialAdjustments.addAdjustment(type, value);

  calculateInvoiceTotals();
});
// Event listener for deposit input fields
$("#firstDeposit, #secondDeposit").on("change input", function() {
  // Logic to handle deposit values
  let firstDeposit = parseFloat($("#firstDeposit").val()) || 0;
  let secondDeposit = parseFloat($("#secondDeposit").val()) || 0;

  financialAdjustments.addAdjustment("First Deposit", firstDeposit);
  financialAdjustments.addAdjustment("Second Deposit", secondDeposit);

  calculateInvoiceTotals();
});


async function uploadPDF(pdfBlob, pdfFileName) {
  const formData = new FormData();
  formData.append("pdf", pdfBlob, pdfFileName);

  const response = await fetch("/upload-pdf", {
    method: "POST",
    body: formData
  });

  const data = await response.json();
  if (data.filePath) {
    return data.filePath; // Assuming the server returns the file path in the response
  } else {
    throw new Error("PDF upload failed");
  }
}


async function getNextInvoiceNumber() {
  return fetch("/api/getNextInvoiceNumber")
    .then((response) => response.json())
    .then((data) => data.nextInvoiceNumber);
}

// Place this in your invoicing.js file
function emailModalData() {
  return {
    open: false,
    clientName: '',
    emails: [''],
    invoiceNumber: '',
    emailSubject: '',
    emailBody: '',
    invoiceFileName: '', 

    sendEmail() {
      // Construct the data to send
      const emailData = {
        to: this.emails,
        subject: this.emailSubject,
        text: this.emailBody,
        invoicePath: this.invoiceFileName, // Adjust the path as necessary
      };
      console.log("Email Data being sent:", emailData);
      fetch("/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailData),
      })
      .then(response => response.text())
      .then(data => {
        console.log("Email sent:", data);
       // this.open = false; // Close the modal

    // Dispatch success event
    window.dispatchEvent(new CustomEvent('notice', { 
      detail: { type: 'success', text: '🔥 Email sent!' }
     }));
    })
  .catch(error => {
    console.error("Error sending email:", error);

    // Dispatch error event
    window.dispatchEvent(new CustomEvent('notice', { 
      detail: { type: 'error', text: '😵 Error sending mail!' }
    }));
  });
  }

  };
}

class InvoicingModal {
  constructor() {
    this.invoices = [];
    this.statusData = [];
    this.selectedInvoice = null;
    this.isInvoiceTrackingModalOpen = false;
  }

  // Fetch all invoices from the server
  fetchInvoices() {
    const url = "/api/invoices?includeClientNames=true";
    return fetch(url)
      .then((response) => response.json())
      .then((data) => {
        console.log("Fetched invoices:", data);
        this.invoices = data;
      })
      .catch((error) => console.error("Error fetching invoices:", error));
  }

  fetchInvoicesWithStatus() {
    return fetch("/api/invoices/statuses")
      .then((response) => response.json())
      .then((data) => {
        if (!Array.isArray(data)) {
          throw new Error("Invalid data format received");
        }
        console.log("Fetched invoices with status:", data);
        this.statusData = data; // Store the data
        return data; 
      })
      .catch((error) =>
        console.error("Error fetching invoices with status:", error)
      );
  }

  // New method to fetch and update invoices
  fetchAndUpdateInvoices() {
    return this.fetchInvoices()
      .then(() => this.fetchInvoicesWithStatus())
      .then((statusData) => {
        this.updateInvoiceList(); // Update invoice list
        this.updateInvoiceStatusToggles(statusData); // Update status toggles
      })
      .catch((error) => console.error("Error fetching and updating invoices:", error));
  }

  // This function updates the invoice list without handling the status.
  updateInvoiceList() {
    const invoiceListElement = document.getElementById("invoiceList");
    invoiceListElement.innerHTML = "";

    this.invoices.forEach((invoice) => {
      const invoiceItem = document.createElement("div");
      invoiceItem.id = "invoice_" + invoice.invoice_number; // Assign unique ID
      invoiceItem.classList.add(
        "invoice-item",
        "flex",
        "justify-between",
        "items-center",
        "mb-5"
      );
    
      // Add invoice details (without status)
      const finalTotal = parseFloat(invoice.final_total).toFixed(2);
      const invoiceDetails = `
            <div>
                <strong>Invoice_${invoice.invoice_number}</strong><br>
                Client Name: ${invoice.client_name || "Unknown"}<br>
                Total: ${finalTotal}
            </div>
        `;
      const statusText = `<div class="status-text unpaid" style="text-align: right;">Unpaid</div>`;
      // Email and Delete Icons
      const emailIcon = `
        <div class="email-icon-container relative cursor-pointer mr-3 submit-button" id="emailModal">
          <i class="fa-regular fa-paper-plane text-xl"></i>
        </div>
      `;
      const deleteIcon = `
        <div class="delete-icon-container cursor-pointer ml-2 mr-3 submit-button">
          <i class="fa-solid fa-trash-can text-xl"></i>
        </div>
      `;  
    
      invoiceItem.innerHTML = invoiceDetails + statusText + emailIcon + deleteIcon;
      invoiceListElement.appendChild(invoiceItem);

      // Event listener for selecting an invoice
      invoiceItem.addEventListener("click", () => this.selectInvoice(invoice.invoice_number));

      // Event listener for the email icon
      invoiceItem.querySelector('.email-icon-container').addEventListener("click", (e) => {
        e.stopPropagation(); // Prevents triggering the invoice selection event
        this.sendEmailInvoiceModal(invoice.invoice_number);
    });

      // Event listener for the delete icon
      invoiceItem.querySelector('.delete-icon-container').addEventListener("click", (e) => {
        e.stopPropagation(); // Prevents triggering the invoice selection event
        this.deleteInvoice(invoice.invoice_number);
      });
    });
  }
  
  sendEmailInvoiceModal(invoiceNumber) {
    this.selectInvoice(invoiceNumber);
    if (this.selectedInvoice) {
      console.log("Selected Invoice Details:", this.selectedInvoice);
      const pdfFileName = this.selectedInvoice.pdf_path; // Use the path from the selected invoice
      window.dispatchEvent(new CustomEvent('open-modal', {
        detail: {
          clientName: this.selectedInvoice.client_name || "Unknown",
          invoiceFileName: pdfFileName,
          invoiceNumber: invoiceNumber
        }
      }));
    }
  }

  deleteInvoice(invoiceNumber) {
    // Implement the invoice deletion logic here
  }

  // This function updates the status toggles for each invoice.
  updateInvoiceStatusToggles(statusData) {
    statusData.forEach((status) => {
      //const invoiceItem = document.querySelector(`#invoice_${status.invoice_number}`);
      const invoiceItem = document.getElementById(
        "invoice_" + status.invoice_number
      );

      if (invoiceItem) {
        // Add the status toggle to the corresponding invoice item
        const isChecked = status.status === "paid";
        const toggleSwitch = `
        <label class="relative inline-flex items-center mb-5 cursor-pointer">
        <input type="checkbox" value="" id="statusToggle_${status.invoice_number}"
        ${isChecked ? "checked" : ""}
        onchange="invoicingSystem.changeInvoiceStatus(event, ${status.invoice_number}, this.checked)"
        class="sr-only peer">

            <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-blue-300 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
            
        </label>
        `;
        // insertAdjacentHTML is used to add the toggleSwitch without overwriting existing content
        invoiceItem.insertAdjacentHTML("beforeend", toggleSwitch);

        const statusTextElement = invoiceItem.querySelector(".status-text");
        if (statusTextElement) {
          const statusClass = status.status === "paid" ? "paid" : "unpaid";
          statusTextElement.textContent =
            status.status.charAt(0).toUpperCase() + status.status.slice(1); // Capitalize the first letter
          statusTextElement.className = "status-text " + statusClass;
        }
      }
    });
  }

  changeInvoiceStatus(event, invoiceNumber, isToggled) {
    event.stopPropagation();
    const status = isToggled ? "paid" : "unpaid";
-
    fetch(`/api/invoices/${invoiceNumber}/updateStatus`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: status }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Status updated:", data);
        // Update the status text in the UI immediately
        const invoiceItem = document.getElementById("invoice_" + invoiceNumber);
        if (invoiceItem) {
          const statusTextElement = invoiceItem.querySelector(".status-text");
          if (statusTextElement) {
            statusTextElement.textContent =
              status.charAt(0).toUpperCase() + status.slice(1);
            statusTextElement.className =
              "status-text " + (status === "paid" ? "paid" : "unpaid");
          }
        }
      })
      .catch((error) => console.error("Error updating status:", error));
  }

  // Select an invoice and display its details
  selectInvoice(invoiceNumber) {
    this.selectedInvoice = this.invoices.find(invoice => invoice.invoice_number === invoiceNumber);
    if (this.selectedInvoice) {
      this.updateInvoiceDetails(this.selectedInvoice.client_name);
      
      // Highlighting logic
      document.querySelectorAll('.invoice-item').forEach(el => el.classList.remove('selected-invoice'));
      const selectedInvoiceElement = document.getElementById("invoice_" + invoiceNumber);
      if (selectedInvoiceElement) {
        selectedInvoiceElement.classList.add('selected-invoice');
      }
    } else {
      console.error("Selected invoice not found");
    }
  }

  updateInvoiceDetails() {
    const invoicePdfDisplay = document.getElementById("invoicePdfDisplay");
  
    if (this.selectedInvoice && this.selectedInvoice.pdf_path) {
      const pdfUrl = this.selectedInvoice.pdf_path;
      console.log("Displaying PDF at URL:", pdfUrl);
      invoicePdfDisplay.src = pdfUrl; // Use the path from the selected invoice
    } else {
      invoicePdfDisplay.src = ''; // Reset the iframe source if no invoice is selected
    }
  }
  
  
  
  openInvoiceTrackingModal() {
    this.isInvoiceTrackingModalOpen = true;
    this.fetchInvoices()
      .then(() => this.fetchInvoicesWithStatus())
      .then((statusData) => {
        this.updateInvoiceList();
        this.updateInvoiceStatusToggles(statusData);
      })
      .catch((error) =>
        console.error("Error in openInvoiceTrackingModal:", error)
      );
  }

  // Close the invoice tracking modal
  closeInvoiceTrackingModal() {
    this.isInvoiceTrackingModalOpen = false;
  }
}
// Call this function when the document is ready
document.addEventListener("DOMContentLoaded", () => {
  // Other initialization code can go here
});
document.getElementById('refreshInvoicesBtn').addEventListener('click', () => {
  window.invoicingSystem.fetchAndUpdateInvoices();
});

//Makes InvoicingModal globally accessible
window.invoicingSystem = new InvoicingModal();
