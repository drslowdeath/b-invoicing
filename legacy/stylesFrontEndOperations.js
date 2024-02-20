var stylesTable;
var clients = [];

$(document).ready(function () {
  stylesTable = $("#stylesTable").DataTable({
    autoWidth: false,
    columnDefs: [
      {
        targets: 0, // Hide the ID column
        visible: false,
      },
      {
        targets: -1, // Target the last column for action buttons
        data: null,
        defaultContent: "",
        width: "28.33%",
        render: function (data, type, row) {
          // Check if it's a new row by seeing if the ID is empty
          if (!row[0]) {
            // Assuming ID is in the first column
            return `
            <button class="saveNewStyleBtn submit-button bg-green-500 hover:bg-green-400 rounded px-2 py-2 text-sm font-bold text-neutral-100 shadow-sm hover:shadow-md">
            <i class="fa-regular fa-circle-check mr-1"></i>Save
            </button>

            <button class="cancelNewStyleBtn submit-button bg-red-700 hover:bg-red-600 rounded px-2 py-2 mr-2 text-sm font-bold text-neutral-100 shadow-sm hover:shadow-md">
              <i class="fa-regular fa-circle-xmark mr-1"></i>Cancel
            </button>`;
          } else {
            return `
            <div class="flex justify-center">
            <button class='editBtn submit-button rounded font-bold text-sm px-2 py-2 mr-2 bg-blue-800 hover:bg-blue-700 text-neutral-100 shadow-sm hover:shadow-md' data-style-id='${row[0]}'><i class="fa-regular fa-pen-to-square mr-1"></i>Edit</button> 
            
            <button class='deleteBtn submit-button rounded px-2 py-2 mr-2 bg-red-700 hover:bg-red-600 text-neutral-100 font-bold text-sm shadow-sm hover:shadow-md' data-style-id='${row[0]}'><i class="fa-regular fa-trash-can mr-1"></i>Delete</button>
            </div>
            `;
          }
        },
      },
      {
        targets: -1, // Assuming the action buttons are in the last column
        className: 'dt-body-center', // DataTables built-in class for center alignment
      },
      {
        targets: 1,
        width: "28.33%",
      },
      {
        targets: 2,
        width: "28.33%",
      },
      {
        targets: 3,
        width: "15%",
      },
    ],
  });

  fetchStyles();

  // Event listener for closing the modal
  document
    .querySelector("#editStyleModal .close")
    .addEventListener("click", closeEditStyleModal);

  // Close the modal if the user clicks anywhere outside of it
  window.onclick = function (event) {
    if (event.target === document.getElementById("editStyleModal")) {
      closeEditStyleModal();
    }
  };
  $('#stylesTable').closest('.dataTables_wrapper').addClass('bg-white shadow-md rounded px-4 py-3 mb-5 flex flex-col border border-solid border-gray-300');
  $("#stylesTable tbody").on("click", ".editBtn", function () {
    var $row = $(this).closest("tr");
    if ($(this).text() === "Edit") {
      // Change Style Name and Price fields to editable
      var styleNameVal = $row.find("td:eq(1)").text(); // 2nd column (Style Name)
      var stylePriceVal = $row.find("td:eq(2)").text(); // 3rd column (Price)

      $row
        .find("td:eq(1)")
        .html(`<input type='text' value='${styleNameVal}' class="background-inherit border border-gray-400 rounded pl-2 focus:border-neutral-300 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-sky-800"/>`); // Style Name
      $row
        .find("td:eq(2)")
        .html(`<input type='number' value='${stylePriceVal}' class="background-inherit border border-gray-400 rounded pl-2 focus:border-neutral-300 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-sky-800"/>`); // Price

      $(this).html("<i class='fa-regular fa-circle-check mr-1'></i> Save").removeClass('bg-blue-800 hover:bg-blue-700').addClass('bg-green-500 hover:bg-green-400');
      // 
    } else {
      // Save the data
      var styleName = $row.find("td:eq(1) input").val();
      var stylePrice = $row.find("td:eq(2) input").val();
      var styleId = $(this).data("style-id");

      editStyle(styleId, styleName, stylePrice);
      $(this).html("<i class='fa-regular fa-pen-to-square mr-1'></i> Edit").removeClass('bg-green-500 hover:bg-green-400').addClass('bg-blue-800 hover:bg-blue-700');
    }
  });
});

function openEditStyleModal() {
  document.getElementById("editStyleModal").style.display = "block";
}

function closeEditStyleModal() {
  document.getElementById("editStyleModal").style.display = "none";
}

function fetchStyles() {
  fetch("/styles")
    .then((response) => response.json())
    .then((styles) => {
      stylesTable.clear();
      styles.forEach((style) => {
        stylesTable.row.add([
          style.id,
          style.clientName || "No Client",
          style.styleName,
          style.price,
          "", // Assuming this is for action buttons
        ]);
      });
      stylesTable.draw(); // Redraw the table outside the loop
    })
    .catch((error) => console.error("Error:", error));
}


// Function to fetch and update clients data
function fetchAndPopulateClients() {
  fetch("/clients")
    .then((response) => response.json())
    .then((data) => {
      clients = data;
      // Update any client dropdowns if needed
      updateClientDropdowns();
    })
    .catch((error) => console.error("Error:", error));
}

// Function to update client dropdowns
function updateClientDropdowns() {
  // Update dropdowns if needed, e.g., in 'Add Style' form or new style row
}

function addNewStyleRow() {
  fetchAndPopulateClients(); // ensures client data is up to date

  var newRow = stylesTable.row
    .add([
      "", // Empty ID for new row
      getClientDropdownHtml(), // Dropdown for clients
      '<input type="text" placeholder="Style Name">', // Ensure this is a proper input tag
      '<input type="number" placeholder="Price">', // Input for Price
      "", // Actions will be handled by render function
    ])
    .draw(false)
    .node();

  $(newRow).addClass("new-style-row"); // This class is now only for styling
}

function populateClientDropdown() {
  fetch("/clients")
    .then((response) => response.json())
    .then((data) => {
      const styleClientDropdown = document.getElementById("styleClientAdd");

      // Check if the element exists
      if (styleClientDropdown) {
        styleClientDropdown.innerHTML =
          '<option value="">Select a client...</option>';

        data.forEach((client) => {
          const option = document.createElement("option");
          option.value = client.id;
          option.textContent = client.name;
          styleClientDropdown.appendChild(option);
        });
      }
    })
    .catch((error) => console.error("Error:", error));
}

// Function to handle style form submission
function handleStyleSubmit(event) {
  event.preventDefault();

  const clientId = document.getElementById("styleClientAdd").value;
  const styleName = document.getElementById("styleNameAdd").value;
  const stylePrice = document.getElementById("stylePriceAdd").value;

  addStyle(clientId, styleName, stylePrice);

  // Resetting the Form
  document.getElementById("addStyleForm").reset();
}

// Function to add a new style
function addStyle(clientId, styleName, stylePrice, rowElement) {
  fetch("/styles", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: styleName,
      price: stylePrice,
      client_id: clientId,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Style added:", data); // Check the structure of 'data'
      updateTableRowAfterAdd(data, rowElement);
      //eslint-disable-next-line
      invoicing.populateClientDropdown();
    })
    .catch((error) => console.error("Error:", error));
}
function updateTableRowAfterAdd(styleData, rowElement) {
  // Extract the ID from the message
  var styleId = styleData.message.match(/ID: (\d+)/)[1];

  var newData = [
    styleId, // Newly assigned ID from the response message
    rowElement.find("select").find(":selected").text(), // Client Name from the selected option
    rowElement.find('input[type="text"]').val(), // Style Name
    rowElement.find('input[type="number"]').val(), // Price
    "", // Placeholder for action buttons
  ];

  var rowIndex = stylesTable.row(rowElement).index();
  stylesTable.row(rowIndex).data(newData).draw();
}

// Populate Style Dropdowns
function populateStyleDropdown() {
  fetch("/styles")
    .then((response) => response.json())
    .then((data) => {
      const removeStyleDropdown = document.getElementById(
        "removeStyleDropdown",
      );

      // Check if the element exists
      if (removeStyleDropdown) {
        removeStyleDropdown.innerHTML =
          '<option value="">Select a style...</option>';

        data.forEach((style) => {
          const option = document.createElement("option");
          option.value = style.id;
          option.textContent = style.styleName;
          removeStyleDropdown.appendChild(option);
        });
      }
    })
    .catch((error) => console.error("Error:", error));
}

// REMOVING STYLES

// Populate Client Dropdown for Remove
function populateClientDropdownForRemove() {
  fetch("/clients")
    .then((response) => response.json())
    .then((data) => {
      const removeStyleClientDropdown = document.getElementById(
        "removeStyleClientDropdown",
      );

      // Check if the element exists
      if (removeStyleClientDropdown) {
        removeStyleClientDropdown.innerHTML =
          '<option value="">Select a client...</option>';

        data.forEach((client) => {
          const option = document.createElement("option");
          option.value = client.id;
          option.textContent = client.name;
          removeStyleClientDropdown.appendChild(option);
        });
      }
    })
    .catch((error) => console.error("Error:", error));
}

// Populate Style Dropdown for Remove
function populateStyleRemoveDropdown(clientId) {
  const styleRemoveOptions = document.getElementById("styleRemoveOptions");

  // Check if the element exists
  if (!styleRemoveOptions) {
    console.error("styleRemoveOptions element not found");
    return;
  }

  if (!clientId) {
    styleRemoveOptions.innerHTML = "";
    return;
  }

  fetch(`/styles/client/${clientId}`)
    .then((response) => response.json())
    .then((data) => {
      styleRemoveOptions.innerHTML = "";

      data.forEach((style) => {
        const option = document.createElement("option");
        option.value = style.id;
        option.textContent = style.styleName;
        styleRemoveOptions.appendChild(option);
      });
    })
    .catch((error) => console.error("Error:", error));
}

// Handle Remove Style Form Submission USED IN HTML
//eslint-disable-next-line
function handleStyleRemoveSubmit(event) {
  event.preventDefault();
  const styleInput = document.getElementById("removeStyleDropdown");
  const selectedStyleId = styleInput.value;
  const isValidStyle = Array.from(
    document.getElementById("styleRemoveOptions").options,
  ).some((option) => option.value === selectedStyleId);

  if (!isValidStyle) {
    alert("Please select a valid style to remove.");
    return;
  }

  removeStyle(selectedStyleId);
}

// Function to Remove a Style
function removeStyle(styleId) {
  fetch(`/styles/${styleId}`, {
    method: "DELETE",
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Style removed:", data);
      // Additional logic after style removal, e.g., update UI
      fetchStyles();
      populateStyleDropdown();
      populateClientDropdownForEdit();
      //eslint-disable-next-line
      invoicing.populateClientDropdown();
    })
    .catch((error) => console.error("Error:", error));
}

// Alpine function - Might not need this
function dropdownComponent() {
  return {
    search: "",
    open: false,
    items: [],
    selectedClientId: null,

    init() {
      this.fetchClients();
    },

    fetchClients() {
      fetch("/clients")
        .then((response) => response.json())
        .then((data) => {
          this.items = data;
        })
        .catch((error) => console.error("Error:", error));
    },

    get filteredItems() {
      return this.search === ""
        ? this.items
        : this.items.filter((item) =>
            item.name.toLowerCase().includes(this.search.toLowerCase()),
          );
    },

    selectItem(item) {
      this.search = item.name;
      this.selectedClientId = item.id;
      this.open = false;

      // Populate styles based on selected client
      populateStyleRemoveDropdown(this.selectedClientId); // Assuming you have this function in your stylesFrontEndOperations.js
    },
  };
}

// EDDITING STYLES
// Function to Populate Client Dropdown for Edit
function populateClientDropdownForEdit() {
  fetch("/clients")
    .then((response) => response.json())
    .then((data) => {
      const editStyleClientDropdown = document.getElementById(
        "editStyleClientDropdown",
      );

      // Check if the element exists
      if (editStyleClientDropdown) {
        editStyleClientDropdown.innerHTML =
          '<option value="">Select a client...</option>';

        data.forEach((client) => {
          const option = document.createElement("option");
          option.value = client.id;
          option.textContent = client.name;
          editStyleClientDropdown.appendChild(option);
        });
      }
    })
    .catch((error) => console.error("Error:", error));
}

// Function to Populate Style Dropdown for Edit
function populateStyleEditDropdown(clientId) {
  fetch(`/styles/client/${clientId}`)
    .then((response) => response.json())
    .then((data) => {
      const styleOptions = document.getElementById("styleOptions");
      styleOptions.innerHTML = "";

      data.forEach((style) => {
        const option = document.createElement("option");
        option.value = style.id;
        option.textContent = style.styleName;
        styleOptions.appendChild(option);
      });
    })
    .catch((error) => console.error("Error:", error));
}

// Function to Fetch Style Details by ID -  Might not need this
function fetchStyleDetails(styleId) {
  fetch(`/styles/${styleId}`)
    .then((response) => response.json())
    .then((data) => {
      document.getElementById("styleIdEdit").value = data.id;
      document.getElementById("styleNameEdit").value = data.name;
      document.getElementById("stylePriceEdit").value = data.price;
      openEditStyleModal();
    })
    .catch((error) => console.error("Error:", error));
}

// Handle Edit Style Form Submission - Might not need this
function handleStyleEditSubmit(event) {
  event.preventDefault();
  const styleId = document.getElementById("styleIdEdit").value;
  const styleName = document.getElementById("styleNameEdit").value;
  const stylePrice = document.getElementById("stylePriceEdit").value;

  editStyle(styleId, styleName, stylePrice);

  // Resetting the form
  document.getElementById("editStyleForm").reset();
}

// Function to Edit a Style
function editStyle(styleId, styleName, stylePrice) {
  // Ensure the styleId is not empty
  if (!styleId) {
    console.error("Style ID is missing.");
    return;
  }

  fetch(`/styles/${styleId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: styleName,
      price: parseFloat(stylePrice) || 0, // Ensure price is a number
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log("Style edited:", data);
      fetchStyles();
      //eslint-disable-next-line
      invoicing.populateClientDropdown();
    })
    .catch((error) => console.error("Error:", error));
}

// Function to create client dropdown HTML
function getClientDropdownHtml() {
  var dropdownHtml = '<select><option value="">Select a client...</option>';
 

  clients.forEach(function (client) {
    dropdownHtml += `<option value="${client.id}">${client.name}</option>`;
  });
  dropdownHtml += "</select>";
  return dropdownHtml;
}

// Event listener for Cancel/Delete button in the new row
$("#stylesTable").on("click", ".cancelNewStyleBtn", function () {
  var $row = $(this).closest("tr");
  stylesTable.row($row).remove().draw();
});

// Event listener for Save button in the new row
$("#stylesTable").on("click", ".saveNewStyleBtn", function () {
  var $row = $(this).closest("tr");
  var selectedClientId = $row.find("select").val();
  var styleName = $row.find('input[type="text"]').val();
  var stylePrice = $row.find('input[type="number"]').val();

  // Call the function to add the new style
  addStyle(selectedClientId, styleName, stylePrice, $row);
});

// Attempting to redraw table in Tab 2!!!!
function redrawTable() {
  $("#stylesTable").DataTable().draw();
}

window.addEventListener("load", populateClientDropdown());
window.addEventListener("load", populateStyleDropdown());
window.addEventListener("load", populateClientDropdownForEdit());
window.addEventListener("load", populateClientDropdownForRemove());
window.addEventListener("load", fetchAndPopulateClients());
$("#stylesTable tbody").on("click", ".deleteBtn", function () {
  var styleId = $(this).data("style-id");
  if (confirm("Are you sure you want to delete this style?")) {
    removeStyle(styleId);
  }
});
$("#stylesTable").on("click", ".cancelNewStyleBtn", function () {
  var $row = $(this).closest("tr");
  stylesTable.row($row).remove().draw();
});
$("#plusButtonId").on("click", function () {
  addNewStyleRow();
});
