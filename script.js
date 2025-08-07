const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwVvTSZ0G0IAW4QmaPngUuvKGXTBdLsZLQNZcsEXBnn-cEQoifLnHLMJ0Pf2VqhfDqmCg/exec';

const state = { operator: null, helpers: [], logIds: [] };

const screens = {
  setup: document.getElementById('shiftSetupScreen'),
  main: document.getElementById('mainAppScreen'),
  ended: document.getElementById('shiftEndedScreen'),
};

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
  welcomeMessage: document.getElementById('welcomeMessage'),
  clock: document.getElementById('clock'),
  startNewShiftButton: document.getElementById('startNewShiftButton'),
  redirectMessage: document.getElementById('redirectMessage'),
};

const helpersChoices = new Choices(ui.helpersSelect, {
  removeItemButton: true,
  placeholder: true,
  placeholderValue: 'Click to add helpers...',
});

async function apiCall(action, data = {}) {
  const btn = action === 'addReport' ? ui.submitReportButton : ui.startShiftButton;
  if(btn) btn.disabled = true;
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
    if(btn) btn.disabled = false;
  }
}

async function initialize() {
  const savedState = localStorage.getItem('aaryaOpsLinkShiftState');
  if (savedState) {
    Object.assign(state, JSON.parse(savedState));
    ui.currentOperator.textContent = state.operator.name;
    switchScreen('main');
    const newData = await fetch(WEB_APP_URL).then(res => res.json());
    updateReportsTable(newData.reports);
  } else {
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
}

function populateEmployeeDropdowns(employees) {
  const operatorOptions = [{ value: '', label: '-- Select Name --', disabled: true, selected: true }];
  const helperOptions = [];
  employees.forEach(emp => {
    const option = { value: JSON.stringify(emp), label: emp.name };
    if (emp.role === 'Operator') {
      operatorOptions.push(option);
    } else if (emp.role === 'Helper') {
      helperOptions.push(option);
    }
  });
  ui.operatorSelect.innerHTML = operatorOptions.map(o => `<option value='${o.value}' ${o.disabled ? 'disabled' : ''} ${o.selected ? 'selected' : ''}>${o.label}</option>`).join('');
  helpersChoices.setChoices(helperOptions, 'value', 'label', true);
}

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

function switchScreen(screenName) {
  Object.values(screens).forEach(s => s.classList.add('hidden'));
  screens[screenName].classList.remove('hidden');
}

function updateClock() {
  const now = new Date();
  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateString = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  ui.clock.textContent = `${dateString} | ${timeString}`;
}

function setWelcomeMessage() {
  const hour = new Date().getHours();
  let greeting = 'Welcome';
  if (hour >= 4 && hour < 12) greeting = 'Good Morning';
  else if (hour >= 12 && hour < 18) greeting = 'Good Afternoon';
  else greeting = 'Good Evening';
  ui.welcomeMessage.textContent = greeting;
}

function startRedirectTimer() {
  let seconds = 5;
  ui.redirectMessage.textContent = `Restarting in ${seconds} seconds...`;
  const interval = setInterval(() => {
    seconds--;
    ui.redirectMessage.textContent = `Restarting in ${seconds} seconds...`;
    if (seconds <= 0) {
      clearInterval(interval);
      window.location.reload();
    }
  }, 1000);
}

ui.startShiftButton.addEventListener('click', async () => {
  if (!ui.operatorSelect.value) {
    alert("Please select an operator to start the shift.");
    return;
  }
  const selectedOperator = JSON.parse(ui.operatorSelect.value);
  const selectedHelpers = helpersChoices.getValue(true).map(val => JSON.parse(val));
  
  ui.startShiftButton.textContent = "Starting...";
  try {
    const result = await apiCall('startShift', { operator: selectedOperator, helpers: selectedHelpers });
    state.operator = selectedOperator;
    state.logIds = result.logIds;
    localStorage.setItem('aaryaOpsLinkShiftState', JSON.stringify(state));
    ui.currentOperator.textContent = state.operator.name;
    switchScreen('main');
  } catch (error) {
    alert("Error starting shift: " + error.message);
  } finally {
    ui.startShiftButton.textContent = "Confirm and Start Shift";
  }
});

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

ui.endShiftButton.addEventListener('click', async () => {
  const confirmed = confirm("Are you sure you want to end your shift? This action cannot be undone.");
  if (!confirmed) return;
  ui.endShiftButton.disabled = true;
  ui.endShiftButton.textContent = "Ending Shift...";
  try {
    await apiCall('endShift', { logIds: state.logIds });
    localStorage.removeItem('aaryaOpsLinkShiftState');
    switchScreen('ended');
    startRedirectTimer();
  } catch (error) {
    alert("Error ending shift: " + error.message);
    ui.endShiftButton.disabled = false;
    ui.endShiftButton.textContent = "End Shift & Logout";
  }
});

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

ui.startNewShiftButton.addEventListener('click
