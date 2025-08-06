// !!! IMPORTANT: PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE !!!
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzyhseoWfGiiFrepa7con3PkrtftUEe6Cabj4P1YJoLXJF8qI-WndRMqH7ds6TZkjnx/exec';

// Get elements from the DOM
const form = document.getElementById('reportForm');
const submitButton = document.getElementById('submitButton');
const statusMessage = document.getElementById('statusMessage');
const dataTable = document.getElementById('dataTable');
const refreshButton = document.getElementById('refreshButton');

// Function to handle form submission
form.addEventListener('submit', e => {
    e.preventDefault(); // Prevent default browser submission
    
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    fetch(WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify(data),
    })
    .then(response => response.json())
    .then(result => {
        if (result.result === "Success") {
            statusMessage.textContent = 'Report submitted successfully!';
            statusMessage.style.color = 'green';
            form.reset();
            fetchData();
        } else {
            throw new Error(result.message || 'Unknown error occurred.');
        }
    })
    .catch(error => {
        statusMessage.textContent = `Error: ${error.message}`;
        statusMessage.style.color = 'red';
    })
    .finally(() => {
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Report';
    });
});

// Function to fetch and display data
function fetchData() {
    dataTable.innerHTML = '<p>Loading reports...</p>';
    
    fetch(WEB_APP_URL)
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            throw new Error(data.error);
        }
        
        if (data.length === 0) {
            dataTable.innerHTML = '<p>No reports found.</p>';
            return;
        }

        let tableHtml = '<table><thead><tr>';
        const headers = Object.keys(data[0]);
        headers.forEach(header => {
            tableHtml += `<th>${header}</th>`;
        });
        tableHtml += '</tr></thead><tbody>';

        data.forEach(row => {
            tableHtml += '<tr>';
            headers.forEach(header => {
                tableHtml += `<td>${row[header]}</td>`;
            });
            tableHtml += '</tr>';
        });

        tableHtml += '</tbody></table>';
        dataTable.innerHTML = tableHtml;
    })
    .catch(error => {
        dataTable.innerHTML = `<p style="color:red;">Failed to load data: ${error.message}</p>`;
    });
}

refreshButton.addEventListener('click', fetchData);
document.addEventListener('DOMContentLoaded', fetchData);