//DECLARE TABLE
var table;
$(document).ready(function () {
  fetchClients();
  //Generating Datatables - Tab1 - Clients
  table = $("#clientsTable").DataTable({
   "dom":'<"top"l>rt<"bottom"i><"clear">',
   "info": false, 
   "paging": false, 
    columnDefs: [
      {
        targets: 0, // Target the first column (ID)
        visible: false, // Hide the first column
        width: "20%"
      },
      {
        targets: -1,
        width: "20%",
        data: null,
        render: function (data, type, row) {
          const editButton = createTableButton('edit', row[0]);
          const deleteButton = createTableButton('delete', row[0]);
          return `${editButton} ${deleteButton}`;
        }
      },
      {
        targets: 1,
        width: "20%",
      },
      {
        targets: 2,
        width: "20%",
      },
      {
        targets: 3,
        width: "20%",
      },
      {
        targets: 4,
        width: "20%",
      },
      { // Center buttons
        targets: -1, // Target the last column for the buttons 
        className: 'dt-body-center', 
      },
    ],
  });
// After initializing your DataTable - SHOULDNT RENDER 
$('#clientsTable').closest('.dataTables_wrapper').addClass('bg-white shadow-md rounded px-4 py-3 mb-5 flex flex-col border border-solid border-gray-300');

  fetchClients();

  $("#clientsTable tbody").on("click", ".editBtn, .saveBtn", function () {
    var $row = $(this).closest("tr");
    var clientId = $row.find("button").attr("data-client-id");
    var isEdit = $(this).hasClass('editBtn');
  
    if (isEdit) {
      // Convert to editable fields and switch to 'Save' button
      //eslint-disable-next-line
      $row.find("td").each(function (i, el) {
        if (i < 4) { // Assuming first 4 columns are editable
          var val = $(this).text();
          $(this).html(`<input class="background-inherit border border-gray-400 rounded pl-2 focus:border-neutral-300 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-sky-800" type='text' value='${val}'/>`);
        }
      });
      $(this).replaceWith(createButtonHtml('save', clientId));
    } else {
      // Save the data and switch back to 'Edit' button
      var rowData = [];
      $row.find("input").each(function () {
        rowData.push($(this).val());
        $(this).parent().text($(this).val());
      });
      editClient(clientId, rowData[0], rowData[1], rowData[2], rowData[3]);
      $(this).replaceWith(createButtonHtml('edit', clientId));
    }
  });
  
  //refactoring: buttons in render
  function createTableButton(buttonType, clientId) {
    const buttonClass = buttonType === 'edit' ? 'bg-blue-800 hover:bg-blue-700' : 'bg-red-700 hover:bg-red-600';
    const iconClass = buttonType === 'edit' ? 'fa-pen-to-square' : 'fa-trash-can';
    const buttonText = buttonType === 'edit' ? 'Edit' : 'Delete';
  
    return `<button class='${buttonType}Btn submit-button font-bold rounded px-2 py-2 mr-2 ${buttonClass} text-neutral-100 shadow-sm hover:shadow-md' data-client-id='${clientId}'>
              <i class="fa-regular ${iconClass} mr-1"></i>${buttonText}</button>`;
  }

  function createButtonHtml(state, clientId) {
    const buttonClasses = 'submit-button border rounded px-2 py-2 text-neutral-100';
    let buttonContent = '';

    if (state === 'edit') {
        buttonContent = `<i class="fa-regular fa-pen-to-square mr-1"></i>Edit`;
        return `<button class='editBtn ${buttonClasses} bg-blue-800 hover:bg-blue-700 shadow-sm hover:shadow-md' data-client-id='${clientId}'>${buttonContent}</button>`;
    } else if (state === 'save') {
        buttonContent = `<i class="fa-regular fa-circle-check mr-1"></i>Save`;
        return `<button class='saveBtn ${buttonClasses} bg-green-600 hover:bg-green-500 text-sm font-bold px-2 py-2 shadow-sm hover:shadow-md' data-client-id='${clientId}'>${buttonContent}</button>`;
    }
}
  
  // When the user clicks the button, open the modal
  $("#addClientBtn").on("click", function () {
    $("#addClientModal").show();
  });

  // When the user clicks on <span> (x), close the modal
  $("#addClientModal .close").on("click", function () {
    $("#addClientModal").hide();
  });

  // Close the modal if the user clicks anywhere outside of it
  $(window).on("click", function (event) {
    if ($(event.target).is("#addClientModal")) {
      $("#addClientModal").hide();
    }
  });
});

//Used in HTML
//eslint-disable-next-line
function openAddClientModal() {
  document.getElementById("addClientModal").style.display = "block";
}

function addClient(name, companyName, address, email) {
  console.log("addClient called with:", { name, companyName, address, email }); // Log input parameters

  const url = "/clients";
  const data = { name, company_name: companyName, address, email };

  console.log("Sending data to server:", data); // Log data being sent

  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
    .then((response) => {
      console.log("Server response:", response); // Log raw response

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      console.log("Client added:", data); // Log successful response data
      // Populates the dropdowns
      fetchClients();
      //eslint-disable-next-line
      invoicing.populateClientDropdown();
    })

    .catch((error) => {
      console.log("Error in addClient:", error); // Log any errors
    });
}

// REMOVES THE STYLES ASSOCIATED WITH CLIENT AND REMOVES CLIENT
function removeClient(clientId) {
  // First, remove all styles associated with the client
  removeStylesForClient(clientId)
    .then(() => {
      // Then, remove the client
      const url = `/clients/${clientId}`;
      return fetch(url, {
        method: "DELETE",
      });
    })
    .then((response) => response.json())
    .then((data) => {
      console.log("Client removed:", data);
      // Refresh the DataTables
      fetchClients();
      //eslint-disable-next-line
      fetchStyles();
      //eslint-disable-next-line
      populateClientDropdown();
      //eslint-disable-next-line
      invoicing.populateClientDropdown();
      
    })
    .catch((error) => {
      console.error("Error in removeClient:", error);
    });
}
function removeStylesForClient(clientId) {
  // Fetch the styles for the client and delete each one
  return fetch(
    `/styles/client/${clientId}`,
  )
    .then((response) => response.json())
    .then((styles) => {
      // Use Promise.all to wait for all delete operations to complete
      return Promise.all(
        styles.map((style) => {
          return fetch(
            `/styles/${style.id}`,
            {
              method: "DELETE",
            },
          );
        }),
      );
    })
    .then(() => {
      // Call fetchStyles after all styles have been deleted
      //eslint-disable-next-line
      fetchStyles();
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

//ENDS HERE

function editClient(clientId, name, companyName, address, email) {
  const url = `/clients/${clientId}`;
  const data = { name, company_name: companyName, address, email };

  console.log("Sending edit request with data:", data);

  fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
  .then((response) => {
    if (!response.ok) {
      throw new Error("Server responded with status: " + response.status);
    }
    return response.json();
  })
  .then((data) => {
    console.log("Client updated:", data);
    fetchClients();
  })
  .catch((error) => {
    console.error("Error in editClient:", error);
  });
}



function fetchClients() {
  fetch("/clients")
    .then((response) => response.json())
    .then((data) => {
      console.log(data);
      table.clear();
      clients = data; // Update global clients variable
      data.forEach((client) => {
        table.row
          .add([
            client.id,
            client.name,
            client.company_name,
            client.address,
            client.email,
            "",
          ])
          .draw(false);
      });
    })
    .catch((error) => console.error("Error:", error));
}
// Helper function to handle form submissions - USED IN HTML
//eslint-disable-next-line
function handleSubmit(event, action) {
  event.preventDefault();
  let name, companyName, address, email;

  if (action === "add") {
    name = document.getElementById("nameAdd").value;
    companyName = document.getElementById("companyNameAdd").value;
    address = document.getElementById("addressAdd").value;
    email = document.getElementById("emailAdd").value;
    addClient(name, companyName, address, email);
  } else if (action === "remove") {
    const clientId = document.getElementById("removeClientDropdown").value;
    removeClient(clientId);
  } else if (action === "edit") {
    const clientId = document.getElementById("clientIdEdit").value;
    name = document.getElementById("nameEdit").value;
    companyName = document.getElementById("companyNameEdit").value;
    address = document.getElementById("addressEdit").value;
    email = document.getElementById("emailEdit").value;
    editClient(clientId, name, companyName, address, email);
  }
  //clear forms on submit
  if (action === "add") {
    // logic to handle add
    document.getElementById("addClientForm").reset();
  } else if (action === "edit") {
    // logic to handle edit
    document.getElementById("editClientForm").reset();
  } else if (action === "remove") {
    // logic to handle remove
    document.getElementById("removeClientForm").reset();
  }
}

// Event Listener for Delete Button
$("#clientsTable tbody").on("click", ".deleteBtn", function () {
  var row = table.row($(this).parents("tr"));
  var rowData = row.data();
  // Extract client ID from rowData
  var clientId = rowData[0];
  if (confirm("Are you sure you want to delete this client? This will delete all styles associated with the client.")) {
    removeClient(clientId);
    row.remove().draw();
  }
});
