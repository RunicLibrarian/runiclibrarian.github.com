// Global variables to store application data
let dataJson = []; // Array to hold parsed CSV data as objects
let dataHeaders = []; // Array to store CSV column headers
let checkboxValues = {}; // Object to track which skill filters are active
let dataDescriptions = [];
let selectedLevel = "any";

/**
 * Converts camelCase strings to Title Case (e.g., "weaponFamiliarity" -> "Weapon Familiarity")
 * @param {string} camel - The camelCase string to convert
 * @returns {string} The converted Title Case string
 */
function camelToTitle(camel) {
    return camel.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
}
function updateURLFromFilters() {
    const params = new URLSearchParams();

    // Level
    if (selectedLevel !== "any") {
        params.set("level", selectedLevel);
    }

    // Checkbox filters
    for (let key in checkboxValues) {
        if (checkboxValues[key] === true) {
            params.set(key, "1");
        } else if (checkboxValues[key] === false) {
            params.set(key, "0");
        }
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", newUrl);
}
function loadFiltersFromURL() {
    const params = new URLSearchParams(window.location.search);

    // Level
    if (params.has("level")) {
        selectedLevel = params.get("level");
    }

    // Skills
    for (let key in checkboxValues) {
        if (params.has(key)) {
            const val = params.get(key);
            if (val === "1") checkboxValues[key] = true;
            else if (val === "0") checkboxValues[key] = false;
        }
    }
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
    const descriptions = lines[1].split(",");

    dataHeaders = headers;
    dataDescriptions = descriptions;

    // Parse each data row into objects
    for (let i = 2; i < lines.length; i++) {
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
const controlsContainer = document.querySelector('#skillCheckboxes');

// Create dropdown
const levelSelect = document.createElement('select');
levelSelect.id = "levelFilter";

// Add options
const levels = ["any", "2", "4", "8", "10", "12"];
levels.forEach(level => {
    const option = document.createElement('option');
    option.value = level;
    option.textContent = level === "any" ? "This level or lower" : `Level ${level}`;
    levelSelect.appendChild(option);
});

// Handle change
levelSelect.addEventListener('change', (e) => {
    selectedLevel = e.target.value;
    updateFilteredData();
});

// Add to DOM (you can reposition this if you want it above checkboxes)
controlsContainer.prepend(levelSelect);
/**
 * Filters the data based on active checkbox filters and updates the display
 * Three-state filtering:
 * - null: neutral (ignore the skill)
 * - true: positive filter (show items that have this skill)
 * - false: negative filter (hide items that have this skill)
 */
function updateFilteredData() {
    let newDataJson = dataJson.filter((obj) => {

        if (selectedLevel !== "any") {
            const itemLevel = Number(obj.level);
            const filterLevel = Number(selectedLevel);

            if (isNaN(itemLevel) || itemLevel > filterLevel) {
                return false;
            }
        }

        for (let key of Object.keys(checkboxValues)) {
            if (key === 'archetypeName' || key === 'url') continue;

            const filterState = checkboxValues[key];

            if (filterState === null) continue;

            if (filterState === true && obj[key] !== true) return false;
            if (filterState === false && obj[key] === true) return false;
        }

        return true;
    });

    updateDataHTML(newDataJson);
    updateURLFromFilters();
}
async function initData() {
    dataJson = await csvJSON();

    const skillCheckboxes = document.querySelector('#skillCheckboxes');

    if (!skillCheckboxes) {
        console.error("Missing #skillCheckboxes in HTML");
        return;
    }

    const skillHeaders = dataHeaders.slice(1).filter(h => h !== 'url');

    skillHeaders.forEach((skill) => {
        checkboxValues[skill] = null;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = skill;

        const label = document.createElement('label');
        label.htmlFor = skill;
        label.textContent = camelToTitle(skill);

        const headerIndex = dataHeaders.indexOf(skill);
        if (headerIndex !== -1) {
            label.title = dataDescriptions[headerIndex];
        }

        checkbox.addEventListener('click', (e) => {
            e.preventDefault();

            let current = checkboxValues[skill];

            if (current === null) checkboxValues[skill] = true;
            else if (current === true) checkboxValues[skill] = false;
            else checkboxValues[skill] = null;

            const state = checkboxValues[skill];

            if (state === null) label.removeAttribute('data-state');
            else label.setAttribute('data-state', state);

            updateFilteredData();
        });

        skillCheckboxes.appendChild(checkbox);
        skillCheckboxes.appendChild(label);
    });

    loadFiltersFromURL();

    // sync dropdown
    const levelEl = document.getElementById("levelFilter");
    if (levelEl) levelEl.value = selectedLevel;

    updateFilteredData();
}
initData();