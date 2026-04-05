// Global variables to store application data
let dataJson = []; // Array to hold parsed CSV data as objects
let dataHeaders = []; // Array to store CSV column headers
let checkboxValues = {}; // Object to track which skill filters are active

/**
 * Converts camelCase strings to Title Case (e.g., "weaponFamiliarity" -> "Weapon Familiarity")
 * @param {string} camel - The camelCase string to convert
 * @returns {string} The converted Title Case string
 */
function camelToTitle(camel) {
    return camel.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
}

/**
 * Fetches and parses CSV data from data.csv file
 * Converts CSV format to JSON objects with proper data types
 * @returns {Promise<Array>} Array of objects representing the CSV data
 */
async function csvJSON() {
    let csvText = "";

    // Fetch the CSV file content
    await fetch("data.csv")
        .then(response => response.text())
        .then(data => {
            csvText = data;
        });

    let lines = [];
    const linesArray = csvText.split('\n');

    // Clean up CSV lines by trimming whitespace and normalizing commas
    linesArray.forEach((e) => {
        const row = e.replace(/[\s]+[,]+|[,]+[\s]+/g, ',').trim();
        lines.push(row);
    });

    const result = [];
    const headers = lines[0].split(",");
    dataHeaders = headers;

    // Parse each data row into objects
    for (let i = 1; i < lines.length; i++) {
        const obj = {};
        const currentline = lines[i].split(",");

        for (let j = 0; j < headers.length; j++) {
            let value = currentline[j];
            // Handle empty cells as false
            if (!value) {
                value = false;
            }
            // Convert string booleans to actual boolean values
            else if (value.toLowerCase() === "true") {
                value = true;
            } else if (value.toLowerCase() === "false") {
                value = false;
            }
            obj[headers[j]] = value;
        }
        result.push(obj);
    }
    return result;
}

/**
 * Updates the HTML display with filtered archetype data
 * Creates card elements for each archetype showing name and active skills
 * @param {Array} data - Array of archetype objects to display
 */
function updateDataHTML(data) {
    const mainElem = document.querySelector('#main');
    mainElem.innerText = ""; // Clear existing content

    // Create a card for each archetype
    data.forEach((item) => {
        const newDiv = document.createElement('div');
        newDiv.classList.add('card');

        // Add archetype name as a styled paragraph (with link if URL exists)
        const nameP = document.createElement('p');
        if (item.url && item.url.trim() !== '') {
            // Create a hyperlink if URL is available with a link icon
            nameP.innerHTML = `<strong><a href="${item.url}" target="_blank">${item.archetypeName}<span class="material-icons link-icon">link</span></a></strong>`;
        } else {
            // Display as plain text if no URL
            nameP.innerHTML = `<strong>${item.archetypeName}</strong>`;
        }
        newDiv.appendChild(nameP);

        // Add skill boxes for skills that are true/active
        for (let key in item) {
            if (key !== 'archetypeName' && key !== 'url' && item[key] === true) {
                const skillDiv = document.createElement('div');
                skillDiv.classList.add('skill-box');
                skillDiv.textContent = camelToTitle(key); // Convert camelCase to readable format
                newDiv.appendChild(skillDiv);
            }
        }
        mainElem.appendChild(newDiv);
    })
}

/**
 * Updates the checkbox values object when a filter checkbox changes
 * @param {string} field - The skill name that was changed
 * @param {boolean} value - The new checked state
 */
function updateCheckboxValues(field, value) {
    checkboxValues[field] = value;
    updateFilteredData(); // Re-filter and update display
}

/**
 * Filters the data based on active checkbox filters and updates the display
 * Three-state filtering:
 * - null: neutral (ignore the skill)
 * - true: positive filter (show items that have this skill)
 * - false: negative filter (hide items that have this skill)
 */
function updateFilteredData() {
    let newDataJson = dataJson.filter((obj) => {
        // Check if item passes all active filters
        for (let key of Object.keys(checkboxValues)) {
            if (key === 'archetypeName' || key === 'url') continue; // Skip archetype name and url columns

            const filterState = checkboxValues[key];

            // Neutral state - ignore this filter
            if (filterState === null) {
                continue;
            }

            // Positive filter - item must have this skill to be shown
            if (filterState === true) {
                if (obj[key] !== true) {
                    return false; // Item doesn't have this skill, exclude it
                }
            }
            // Negative filter - item must NOT have this skill to be shown
            else if (filterState === false) {
                if (obj[key] === true) {
                    return false; // Item has this skill, exclude it
                }
            }
        }
        return true; // Item passed all filters
    });
    updateDataHTML(newDataJson); // Update the HTML with filtered results
}

/**
 * Initializes the application by loading data and creating UI elements
 * Sets up skill filter checkboxes and displays initial data
 */
async function initData() {
    dataJson = await csvJSON(); // Load and parse CSV data

    const skillCheckboxes = document.querySelector('#skillCheckboxes');

    // Extract skill headers (skip the first two columns: archetypeName and url)
    const skillHeaders = dataHeaders.splice(1).filter(header => header !== 'url');

    // Create checkbox and label for each skill
    for (let i = 0; i <= skillHeaders.length - 1; i++) {
        // Create hidden checkbox input
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = skillHeaders[i];
        checkbox.checked = false; // Start unchecked (neutral state)

        // Click handler to cycle through three states: null -> true -> false -> null
        checkbox.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent default checkbox toggle

            // Cycle through states
            let currentState = checkboxValues[skillHeaders[i]];
            let nextState;

            if (currentState === null) {
                nextState = true; // null -> true (positive filter)
            } else if (currentState === true) {
                nextState = false; // true -> false (negative filter)
            } else {
                nextState = null; // false -> null (neutral)
            }

            checkboxValues[skillHeaders[i]] = nextState;

            // Update visual state
            if (nextState === null) {
                label.removeAttribute('data-state');
            } else {
                label.setAttribute('data-state', nextState);
            }

            updateFilteredData();
        })

        // Create visible label for the checkbox
        const label = document.createElement('label');
        label.htmlFor = skillHeaders[i];
        label.appendChild(document.createTextNode(camelToTitle(skillHeaders[i])));

        // Add to the DOM
        skillCheckboxes.appendChild(checkbox);
        skillCheckboxes.appendChild(label);

        // Initialize filter state to neutral
        checkboxValues[skillHeaders[i]] = null;
    }

    updateFilteredData(); // Display initial data
}

// Event listener for theme toggle button
document.getElementById('theme-toggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode'); // Toggle dark mode class
    const button = document.getElementById('theme-toggle');
    // Update button text based on current mode
    if (document.body.classList.contains('dark-mode')) {
        button.innerHTML = `<span class="material-symbols-outlined"> light_mode </span>`
    } else {
        button.innerHTML = `<span class="material-symbols-outlined"> dark_mode </span>`;
    }
});

// Event listener for clear all button
document.getElementById('clear-all').addEventListener('click', () => {
    // Reset all skill filter checkboxes to neutral state
    const checkboxes = document.querySelectorAll('#skillCheckboxes input[type="checkbox"]');
    checkboxes.forEach((checkbox) => {
        const label = checkbox.nextElementSibling;
        label.removeAttribute('data-state');
        checkboxValues[checkbox.id] = null; // Set to neutral
    });
    updateFilteredData(); // Refresh display with no filters
});

// Start the application
initData();
