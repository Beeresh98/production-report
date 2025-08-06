// !!! IMPORTANT: PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE !!!
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwVvTSZ0G0IAW4QmaPngUuvKGXTBdLsZLQNZcsEXBnn-cEQoifLnHLMJ0Pf2VqhfDqmCg/exec';

// App State: A simple object to hold session data
const state = {
  operator: null,
  helpers: [],
  logIds: [],
};

// Screen Elements: References to the different screen divs
const screens = {
  setup: document.getElementById('shiftSetupScreen'),
  main: document.getElementById('mainAppScreen'),
  ended: document.getElementById('shiftEndedScreen'),
};

// UI Elements: References to all interactive elements
const ui = {
  operatorSelect: document.getElementById('operatorSelect'),
  helpersSelect: document.getElementById('helpersSelect'),
  startShiftButton: document.getElementById('startShiftButton'),
  currentOperator: document.getElementById('currentOperator'),
  endShiftButton: document.getElementById('endShiftButton'),
  reportForm: document.getElementById('reportForm'),
  submitReportButton: document.getElementById('submitReportButton'),
  statusMessage: document.getElementById('statusMessage'),
  dataTable: document.getElementById('dataTable'),
  refreshButton: document.getElementById('refreshButton'),
};

// --- CORE FUNCTIONS ---

// A single function to communicate with our Google Apps Script backend
async function apiCall(action, data = {}) {
  ui.submitReportButton.disabled = true; // Disable button during API call
  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action, data }),
    });
    if (!response.ok) throw new Error("Network error. Please check your connection.");
    const result = await response.json();
    if (result.result === "Error") throw new Error(result.message);
    return result;
  } finally {
    ui.submitReportButton.disabled = false; // Re-enable button
  }
}

// Initialize the application when the page first loads
async function initialize() {
  try {
    const response = await fetch(WEB_APP_URL);
    const data = await response.json();
    if(data.error) throw new Error(data.error);
    
    populateEmployeeDropdowns(data.employees);
    updateReportsTable(data.reports);
  } catch (error) {
    alert("Fatal Error: Could not load initial application data. " + error.message);
  }
}

// Fills the operator and helper dropdowns from the employee list
function populateEmployeeDropdowns(employees) {
  // Clear existing options
  ui.operatorSelect.innerHTML = '<option value="" disabled selected>-- Select Name --</option>';
  ui.helpersSelect.innerHTML = '';
  
  employees.forEach(emp => {
    const option = new Option(emp.name, JSON.stringify(emp));
    if (emp.role === 'Operator') {
      ui.operatorSelect.add(option);
    } else if (emp.role === 'Helper') {
      ui.helpersSelect.add(option);
    }
  });
}

// Builds and displays the table of recent reports
function updateReportsTable(reports) {
    if (!reports || reports.length === 0) {
        ui.dataTable.innerHTML = "<p>No production reports have been submitted yet.</p>";
        return;
    }
    const headers = Object.keys(reports[0]);
    let tableHtml = '<table><thead><tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr></thead><tbody>';
    reports.forEach(row => {
        tableHtml += '<tr>' + headers.map(h => `<td>${row[h] || ''}</td>`).join('') + '</tr>';
    });
    tableHtml += '</tbody></table>';
    ui.dataTable.innerHTML = tableHtml;
}

// Simple function to switch between the visible screens
function switchScreen(screenName) {
  Object.values(screens).forEach(s => s.classList.add('hidden'));
  screens[screenName].classList.remove('hidden');
}


// --- EVENT HANDLERS ---

// When the "Confirm and Start Shift" button is clicked
ui.startShiftButton.addEventListener('click', async () => {
  if (!ui.operatorSelect.value) {
    alert("Please select an operator to start the shift.");
    return;
  }
  const selectedOperator = JSON.parse(ui.operatorSelect.value);
  const selectedHelpers = [...ui.helpersSelect.selectedOptions].map(opt => JSON.parse(opt.value));
  
  ui.startShiftButton.disabled = true;
  ui.startShiftButton.textContent = "Starting...";

  try {
    const result = await apiCall('startShift', { operator: selectedOperator, helpers: selectedHelpers });
    state.operator = selectedOperator;
    state.logIds = result.logIds;
    ui.currentOperator.textContent = state.operator.name;
    switchScreen('main');
  } catch (error) {
    alert("Error starting shift: " + error.message);
  } finally {
    ui.startShiftButton.disabled = false;
    ui.startShiftButton.textContent = "Confirm and Start Shift";
  }
});

// When the hourly production report form is submitted
ui.reportForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  ui.submitReportButton.textContent = "Submitting...";
  
  const formData = new FormData(ui.reportForm);
  const data = Object.fromEntries(formData.entries());
  data.operatorName = state.operator.name;

  try {
    await apiCall('addReport', data);
    ui.statusMessage.textContent = "Report submitted successfully!";
    ui.statusMessage.style.color = 'green';
    ui.reportForm.reset();
    const newData = await fetch(WEB_APP_URL).then(res => res.json());
    updateReportsTable(newData.reports);
  } catch (error) {
    ui.statusMessage.textContent = "Error: " + error.message;
    ui.statusMessage.style.color = 'red';
  } finally {
    ui.submitReportButton.textContent = "Submit Hourly Report";
  }
});

// When the "End Shift" button is clicked
ui.endShiftButton.addEventListener('click', async () => {
  const confirmed = confirm("Are you sure you want to end your shift? This action cannot be undone.");
  if (!confirmed) return;

  ui.endShiftButton.disabled = true;
  ui.endShiftButton.textContent = "Ending Shift...";

  try {
    await apiCall('endShift', { logIds: state.logIds });
    switchScreen('ended');
  } catch (error) {
    alert("Error ending shift: " + error.message);
    ui.endShiftButton.disabled = false;
    ui.endShiftButton.textContent = "End Shift & Logout";
  }
});

// When the "Refresh Data" button is clicked
ui.refreshButton.addEventListener('click', async () => {
    ui.refreshButton.textContent = "Refreshing...";
    try {
        const newData = await fetch(WEB_APP_URL).then(res => res.json());
        updateReportsTable(newData.reports);
    } catch (error) {
        alert("Could not refresh data: " + error.message);
    } finally {
        ui.refreshButton.textContent = "Refresh Data";
    }
});

// --- START THE APP ---
document.addEventListener('DOMContentLoaded', initialize);