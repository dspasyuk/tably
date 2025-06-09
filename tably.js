function tably(data, options) {
    this.data = data;
    this.options = options;
    this.className = options.className || '';
    this.hiddenColumns = options.hiddenColumns || [];
    this.hideFilters = options.hideFilters || false;
    this.customFilters = options.customFilters || {};
    this.checkBoxesCol = this.options.checkBoxes || true;
    this.indicatorColumn = this.options.indicatorColumn || false;
    this.hideSearch = options.hideSearch || false;
    this.customParser = options.customParser || null; 
    this.customFooterButtons = options.customFooterButtons || [];
    this.customHeaderButtons  = options.customHeaderButtons  || [];
    this.allKeys = options.allKeys || this.getUnifiedKeys();
    this.contextMenuOptions = options.contextMenuOptions || [];
    this.selectedRowdata = {};
    this.renderModalEdit = options.renderModalEdit || function(){};
    this.rowClassRules = options.rowClassRules || []; 
    this.eventListeners = {filteredDataChange: []};
    this.init();
}

tably.prototype.getUnifiedKeys = function() {
    const allKeys = new Set();
    for (let i = 0; i < this.data.length; i++) {
        const item = this.data[i];
        for (const key in item) {
            allKeys.add(key);
        }
    }
    return Array.from(allKeys);
};

tably.prototype.triggerEvent = function(eventName, data) {
    if (this.eventListeners[eventName]) {
        this.eventListeners[eventName].forEach(callback => {
            callback(data);
        });
    }
};

// Method to add an event listener
tably.prototype.on = function(eventName, callback) {
    if (this.eventListeners[eventName]) {
        this.eventListeners[eventName].push(callback);
    }
};


tably.prototype.init = function() {
    this.table = document.createElement('table');
    this.table.className = `table ${this.className}`; 
    this.currentPage = 1;
    this.perPage = this.options.perPage || 10;
    this.totalPages = this.data.length / this.perPage < 1 ? 1 : Math.ceil(this.data.length / this.perPage); 
    this.sortColumn = null;
    this.sortOrder = 'asc';
    this.filterColumns = this.options.filterColumns || [];
    this.filteredData = this.data.slice();
    this.createTableHeader();
    this.createTableBody();
    this.createTableFooter();
    this.updatePaginationInfo();
};

tably.prototype.reloadData = function() {
    this.filteredData = this.data.slice();
    this.currentPage = 1;
    this.createTableBody();
};

tably.prototype.reloadTable = function(newData, newAllKeys) {
    this.data = newData || this.data;
    this.allKeys = newAllKeys || this.getUnifiedKeys();
    this.filteredData = this.data.slice();
    this.currentPage = 1;
    this.totalPages = Math.ceil(this.filteredData.length / this.perPage);
    this.table.innerHTML = ''; 
    this.createTableHeader();
    this.createTableBody();
    this.updatePaginationInfo();
};

tably.prototype.createTableHeader = function() {
    const thead = document.createElement('thead');
    thead.className = 'thead-light';
    const trHead = document.createElement('tr');
    const trFilter = document.createElement('tr');

    if (this.checkBoxesCol) {
        const thCheckboxHeader = document.createElement('th');
        thCheckboxHeader.className = 'tably-checkbox-header';
        const selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';
        selectAllCheckbox.addEventListener('change', (event) => {
            const checkboxes = this.table.querySelectorAll('tbody input[type="checkbox"]');
            for (let i = 0; i < checkboxes.length; i++) {
                checkboxes[i].checked = event.target.checked;
            }
            this.updateFooterInfo();
        });
        thCheckboxHeader.appendChild(selectAllCheckbox);
        trHead.insertBefore(thCheckboxHeader, trHead.firstChild);
        const thFilterCheckbox = document.createElement('th');
        trFilter.insertBefore(thFilterCheckbox, trFilter.firstChild);
    }

    if (this.indicatorColumn) {
        const thIndicatorboxHeader = document.createElement('th');
        thIndicatorboxHeader.className = 'tably-checkbox-header';
    
        const box = document.createElement('span');
        box.className = 'tably-indicator-header';
        thIndicatorboxHeader.appendChild(box);
        trHead.insertBefore(thIndicatorboxHeader, trHead.children[1]);
    
        const thFilterIndicator = document.createElement('th');
        trFilter.insertBefore(thFilterIndicator, trFilter.children[1]); 
    }

    const colgroupHead = document.createElement('colgroup');
    const colgroupFilter = document.createElement('colgroup');

    const processColumn = (key) => {
        if (this.hiddenColumns.indexOf(key) === -1) {
            const col = document.createElement('col');
            colgroupHead.appendChild(col);

            const colFilter = document.createElement('col');
            colgroupFilter.appendChild(colFilter);

            const th = document.createElement('th');
            th.className = 'tably-filter-header';
            th.innerText = key;
            th.addEventListener('click', () => {
                this.sortData(key);
            });
            trHead.appendChild(th);

            const thFilter = document.createElement('th');
            if (this.customFilters && this.customFilters[key]) {
                // Use custom dropdown for multi-select filters
                thFilter.appendChild(this.createMultiSelectFilter(key, this.customFilters[key]));
            } else {
                // Default text input filter
                const filterInput = document.createElement('input');
                filterInput.type = 'text';
                filterInput.className = 'form-control form-control-sm';
                filterInput.placeholder = 'Filter...';
                filterInput.dataset.column = key;
                filterInput.addEventListener('input', (event) => {
                    this.filterData(event.target.dataset.column, event.target.value);
                });
                thFilter.appendChild(filterInput);
            }

            trFilter.appendChild(thFilter);
        }
    };


    for (let i = 0; i < this.allKeys.length; i++) {
        const key = this.allKeys[i];
        processColumn(key);
        
    }

    thead.appendChild(colgroupHead);
    thead.appendChild(trHead);
    if (!this.hideFilters) {
        thead.appendChild(colgroupFilter);
        thead.appendChild(trFilter);
    }
    this.table.appendChild(thead);
};

tably.prototype.createMultiSelectFilter = function(key, predefinedOptions) {
    const dropdownWrapper = document.createElement('div');
    dropdownWrapper.className = 'tably-dropdown';

    const dropdownButton = document.createElement('button');
    dropdownButton.type = 'button';
    dropdownButton.className = 'tably-dropdown-button';
    dropdownButton.textContent = 'Filter...';
    dropdownButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent click propagation
        dropdownMenu.classList.toggle('active');
    });

    const dropdownMenu = document.createElement('div');
    dropdownMenu.className = 'tably-dropdown-menu';

    predefinedOptions.forEach(option => {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = option;
        checkbox.addEventListener('change', () => {
            const selectedOptions = Array.from(dropdownMenu.querySelectorAll('input:checked')).map(input => input.value);
            this.filterData(key, selectedOptions);
        });

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(option));
        dropdownMenu.appendChild(label);
    });

    // Close dropdown on outside click
    document.addEventListener('click', (event) => {
        if (!dropdownWrapper.contains(event.target)) {
            dropdownMenu.classList.remove('active');
        }
    });

    dropdownWrapper.appendChild(dropdownButton);
    dropdownWrapper.appendChild(dropdownMenu);

    return dropdownWrapper;
};


tably.prototype.filterData = function(column, searchText, globalSearch = false) {
    console.log('Filtering data...', column, searchText, globalSearch);
    
    // Initialize or update the filter state for the specified column
    if (!this.filterState) {
        this.filterState = {};
    }

    // Handle global search when column is null
    if (column === null || globalSearch) {
        // Remove existing column-specific filters
        this.filterState = {};
        
        // If search text is empty, reset to original data
        if (!searchText || searchText.trim() === '') {
            this.filteredData = this.data.slice();
        } else {
            // Perform global search across all columns
            const searchTermLower = searchText.toLowerCase();
            
            this.filteredData = this.data.filter((row) => {
                // Check if search term exists in any column
                return this.allKeys.some(key => {
                    const cellValue = row[key]?.toString().toLowerCase() || '';
                    return cellValue.includes(searchTermLower);
                });
            });
        }
    } else {
        // Existing column-specific filtering logic
        if (Array.isArray(searchText)) {
            // Multi-select filter: If no items are selected, remove the filter
            if (searchText.length === 0) {
                delete this.filterState[column];
            } else {
                this.filterState[column] = searchText; // Store selected options as an array
            }
        } else if (searchText.trim() === '') {
            // Text input filter: Remove filter if input is empty
            delete this.filterState[column];
        } else {
            // Text input filter: Store as a lowercase string
            this.filterState[column] = searchText.toLowerCase();
        }

        // Apply all active filters
        this.filteredData = this.data.filter((row) => {
            return Object.keys(this.filterState).every((key) => {
                const cellValue = row[key]?.toString().toLowerCase() || '';
                if (Array.isArray(this.filterState[key])) {
                    // Multi-select filter: Check if cellValue matches any selected option
                    return this.filterState[key].some(selectedValue => 
                        selectedValue.toLowerCase() === cellValue
                    );
                } else {
                    // Text input filter: Substring matching
                    return cellValue.includes(this.filterState[key]);
                }
            });
        });
    }

    // Trigger change event
    this.triggerEvent('filteredDataChange', this.filteredData);
    
    // Reset pagination
    this.currentPage = 1;
    this.totalPages = Math.ceil(this.filteredData.length / this.perPage);
    
    // Re-render the table
    this.createTableBody();
    this.updateFooterInfo();
    this.updatePaginationInfo();
};


tably.prototype.createTableBody = function() {
    const tbody = document.createElement('tbody');
    const start = (this.currentPage - 1) * this.perPage;
    const end = this.currentPage * this.perPage;

    for (let i = start; i < end && i < this.filteredData.length; i++) {
        const tr = document.createElement('tr');
        tr.dataset.id = this.filteredData[i].id;

        if (this.checkBoxesCol) {
            const tdCheckbox = document.createElement('td');
            tdCheckbox.className = 'tably-checkbox-cell';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.index = i;
            tdCheckbox.appendChild(checkbox);
            tr.appendChild(tdCheckbox);
        }
        if(this.indicatorColumn){
            const tdCheckbox = document.createElement('td');
            tdCheckbox.className = 'tably-checkbox-cell';
            const box = document.createElement('span');
            box.className = 'tably-indicator-cell';
            box.dataset.index = i;
            tdCheckbox.appendChild(box);
            tr.appendChild(tdCheckbox);
        }

        const processCell = (key) => {
            if (this.hiddenColumns.indexOf(key) === -1) {
                const td = document.createElement('td');
                let cellValue = this.filteredData[i][key] || '';
                if (this.customParser) {
                    cellValue = this.customParser(key, cellValue);
                }
                td.innerText = cellValue;
                td.dataset.key = key;
                tr.appendChild(td);
            }
        };


        for (let j = 0; j < this.allKeys.length; j++) {
            const key = this.allKeys[j];
            processCell(key);
        }

        for (let j = 0; j < this.rowClassRules.length; j++) {
            const rule = this.rowClassRules[j];
            if (rule.condition(this.filteredData[i])) {
                tr.classList.add(rule.className);
            }
        }

        tbody.appendChild(tr);
    }

    if (this.table.tBodies[0]) {
        this.table.replaceChild(tbody, this.table.tBodies[0]);
    } else {
        this.table.appendChild(tbody);
    }
    this.addRowListeners();
};
tably.prototype.createTableFooter = function() {
    this.footer = document.createElement('div');
    this.footer.className = 'tably-table-footer';
    
    this.footerPage = document.createElement('div');
    this.footerPage.className = 'tably-table-footer-page';

    this.footerButtons = document.createElement('div');
    this.footerButtons.className = 'tably-table-footer-buttons';

    this.footerInfo = document.createElement('div');
    this.footerInfo.className = 'tably-table-footer-info';
    this.footerInfo.innerHTML = ` Total: ${this.data.length};  Total Selected: ${this.getSelectedRows().length || 0};  Filtered: ${this.filteredData.length}`;

    // Add a span for the current page number
    this.currentPageSpan = document.createElement('span');
    this.currentPageSpan.className = 'tably-current-page';
    this.currentPageSpan.textContent = this.currentPage || 1;

    // Add a span for the total number of pages
    this.totalPagesSpan = document.createElement('span');
    this.totalPagesSpan.className = 'tably-total-pages';
    this.totalPagesSpan.textContent = this.totalPages || 1;
    
    const prevButton = document.createElement('button');
    prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>'; // Add Font Awesome icon
    prevButton.className = 'tably-footer-buttons'; // Make the button small
    prevButton.title = 'Previous'; 
    const nextButton = document.createElement('button');
    nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>'; // Add Font Awesome icon
    nextButton.className = 'tably-footer-buttons'; // Make the button small
    nextButton.title = 'Next'; 

    prevButton.addEventListener('click', () => {
        this.previousPage();
        this.updatePaginationInfo(); // Update the page number and total pages
    });

    nextButton.addEventListener('click', () => {
        this.nextPage();
        this.updatePaginationInfo(); // Update the page number and total pages
    });

    // Create a dropdown for selecting the number of rows per page
    const rowsPerPageSelect = document.createElement('select');
    rowsPerPageSelect.className = 'tably-rows-per-page';
    const options = [25, 50, 100, 200, 500, 1000, 3000, 10000];
    
    options.forEach(num => {
        const option = document.createElement('option');
        option.value = num;
        option.textContent = num;
        if (num === this.perPage) {
            option.selected = true;
        }
        rowsPerPageSelect.appendChild(option);
    });

    rowsPerPageSelect.addEventListener('change', (event) => {
        console.log('Selected value:', this.filteredData.length);
        this.perPage = parseInt(event.target.value, 10);
        this.totalPages = Math.ceil(this.filteredData.length / this.perPage);
        this.currentPage = 1;
        this.createTableBody();
        this.updatePaginationInfo();
    });

    // Render custom buttons
    this.customFooterButtons.forEach((button) => {
        const customButton = document.createElement('button');
        customButton.innerHTML = button.icon ? `<i class="${button.icon}"></i> ` : ''; // Add custom icon
        customButton.innerHTML += button.text;
        customButton.title = button.title ? button.title : ''; // Add title
        customButton.className = `btn ${button.className || 'btn-secondary btn-sm '} mr-2`;
        customButton.addEventListener('click', button.action);
        this.footerButtons.appendChild(customButton);
    });

    this.footerPage.appendChild(prevButton);
    this.footerPage.appendChild(nextButton);
    this.footerPage.appendChild(rowsPerPageSelect);

    // Insert the page number and total pages between the prevButton and nextButton
    this.footerPage.insertBefore(this.currentPageSpan, nextButton);
    this.footerPage.insertBefore(document.createTextNode(' / '), nextButton);
    this.footerPage.insertBefore(this.totalPagesSpan, nextButton);

    this.footer.appendChild(this.footerButtons);
    this.footer.appendChild(this.footerPage);
    this.footer.appendChild(this.footerInfo);
};

tably.prototype.updatePaginationInfo = function() {
    this.currentPageSpan.textContent = this.currentPage || 1;
    this.totalPagesSpan.textContent = this.totalPages || 1;
};

tably.prototype.updateFooterInfo = function() {
    this.footerInfo.innerHTML = `Total: ${this.data.length}; Total Selected: ${this.getSelectedRows().length || 0};  Filtered: ${this.filteredData.length}`;
};

tably.prototype.sortData = function(column) {
   
    this.sortColumn = column;
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';

    this.filteredData.sort((a, b) => {
        
        var valueA = a[column];
        var valueB = b[column];
        if (this.customParser) {
            valueA = this.customParser(column, valueA);
            valueB = this.customParser(column, valueB);
        }

        // Check if both values are numbers
        const isNumeric = (value) => !isNaN(parseFloat(value)) && isFinite(value);
        
        if (isNumeric(valueA) && isNumeric(valueB)) {
            // Convert values to numbers for numeric comparison
            valueA = parseFloat(valueA);
            valueB = parseFloat(valueB);
        }
        
        if (valueA < valueB) {
            return this.sortOrder === 'asc' ? -1 : 1;
        }
        if (valueA > valueB) {
            return this.sortOrder === 'asc' ? 1 : -1;
        }
        return 0;
    });

    this.createTableBody();
};

// Function to retrieve data from the row


// Example: Show the custom context menu
tably.prototype.showCustomContextMenu = function(x, y, rowData) {
    this.removeContextMenu();  // Remove any existing context menu
    const menu = document.createElement('div');
    menu.className = 'tably-context-menu';
    menu.style.position = 'absolute';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.style.zIndex = '1000';
    this.contextMenuOptions.forEach(option => {
        const menuItem = document.createElement('div');
        menuItem.className = 'tably-context-menu-item';
        menuItem.innerText = option.text;
        menuItem.addEventListener('click', () => {
            option.action(rowData);  // Execute the custom action with row data
            this.removeContextMenu();  // Remove the menu after action
        });
        menu.appendChild(menuItem);
    });

    document.body.appendChild(menu);
    document.addEventListener('click', () => {
        this.removeContextMenu();
    }, { once: true });
};


tably.prototype.removeContextMenu = function() {
    const existingMenu = document.querySelector('.tably-context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
};



tably.prototype.initContextMenu = function() {
    const table = this.table;
    // Add a single event listener to the table
    table.addEventListener('contextmenu', (event) => {
        event.preventDefault(); // Prevent the default browser context menu
        
        const targetRow = this.getRowFromMousePosition(event);
        if (targetRow) {
            const rowData = this.getDataById(targetRow.getAttribute("data-id"));
            this.showCustomContextMenu(event.pageX, event.pageY, rowData);
        } else {
            console.log('No row found under mouse position.');
        }
    });
};

tably.prototype.getRowFromMousePosition = function(event) {
    const table = this.table;
    
    // Use elementFromPoint to find the element under the mouse
    const clickedElement = document.elementFromPoint(event.clientX, event.clientY);
    
    // Check if the clicked element is inside a table row
    const closestRow = clickedElement.closest('tr');  // Adjust selector if needed
    if (closestRow && table.contains(closestRow)) {
        return closestRow;
    }
    
    return null; // No row found
};


tably.prototype.previousPage = function() {
    if (this.currentPage > 1) {
        this.currentPage--;
        this.createTableBody();
    }
};

tably.prototype.nextPage = function() {
    console.log(this.currentPage);
    const totalPages = Math.ceil(this.filteredData.length / this.perPage);
    if (this.currentPage < totalPages) {
        this.currentPage++;
        this.createTableBody();
    }
};


tably.prototype.addRowListeners = function() {
    var self = this;
    this.table.tBodies[0].querySelectorAll('tr').forEach((row) => {
        row.addEventListener('dblclick', () => {
            const rowId = row.dataset.id;
            const rowData = this.getDataById(rowId);
            self.selectedRowdata = rowData;
            self.renderModalEdit(rowData);
            // Do something with rowData

        });
    });
    // console.log(self.selectedRowdata);
    
};

tably.prototype.getDataById = function(id) {
    return this.filteredData.find(item => item.id === id);
};


tably.prototype.updateData = function(newData) {
    let idFound = false;
    this.filteredData = this.filteredData.map(obj => {
        if (obj.id === newData.id) {
            idFound = true;
            console.log(newData);
            return newData;
        }
        return obj;
    });
    
    if (!idFound) {
        this.filteredData.push(newData);
    }
}

tably.prototype.setDataById = function(id, newData) {
    this.updateData(newData);   
    var row = this.table.querySelector('tr[data-id="' + id + '"]');
    if (row) {
    //   var cells = row.querySelectorAll('td[data-key]');
      var dataKeys = Object.keys(newData);
      for (var i = 0; i < dataKeys.length; i++) {
        var key = dataKeys[i];
        var cell = row.querySelector('td[data-key="' + key + '"]');
        if (cell) {
          var value = newData[key];
          cell.innerText = value || '';
          if (this.customParser) {
            cell.innerText = this.customParser(key, value);
          }
        }
      }
    } else {
      console.error('No row found with id: ' + id);
    }
  };
  
  tably.prototype.addNewData = function(newData) {
    // Add new data to the beginning of the data array
    this.data.unshift(newData);

    // Add new data to the beginning of the filteredData array
    this.filteredData.unshift(newData);

    // Re-initialize the table if necessary
    this.totalPages = Math.ceil(this.filteredData.length / this.perPage);
    
    // Create a new row for the new data
    const tr = document.createElement('tr');
    tr.dataset.id = newData.id;
    console.log(newData);

    if (this.checkBoxesCol) {
        const tdCheckbox = document.createElement('td');
        tdCheckbox.className = 'tably-checkbox-cell';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        tdCheckbox.appendChild(checkbox);
        tr.appendChild(tdCheckbox);
    }
    if(this.indicatorColumn){
        const thCheckbox = document.createElement('td');
        thCheckbox.className = 'tably-checkbox-cell';
        const box = document.createElement('span');
        box.className = 'tably-indicator-cell';
        thCheckbox.appendChild(box);
        tr.appendChild(tdCheckbox);
    }
    console.log(this.allKeys);
    this.allKeys.forEach((key) => {
        if (!this.hiddenColumns.includes(key)) {
            const td = document.createElement('td');
            let cellValue = newData[key] || '';
            if (this.customParser) {
                cellValue = this.customParser(key, cellValue);
            }
            td.innerText = cellValue;
            td.dataset.key = key;
            tr.appendChild(td);
        }
    });

    // Apply row class rules
    this.rowClassRules.forEach(rule => {
        if (rule.condition(newData)) {
            tr.classList.add(rule.className);
        }
    });

    // Insert the new row at the beginning of the table body
    const tableBody = this.table.tBodies[0];
    if (tableBody.firstChild) {
        tableBody.insertBefore(tr, tableBody.firstChild);
    } else {
        tableBody.appendChild(tr);
    }

    this.addRowListeners();
};


tably.prototype.deleteDataById = function(id) {
    // Remove the data from the main data array
    const newData = [];
    for (let i = 0; i < this.data.length; i++) {
        if (this.data[i].id !== id) {
            newData.push(this.data[i]);
        }
    }
    this.data = newData;

    // Check if filteredData is active and remove the item from it
    if (this.filteredData.length > 0) {
        const newFilteredData = [];
        for (let j = 0; j < this.filteredData.length; j++) {
            if (this.filteredData[j].id !== id) {
                newFilteredData.push(this.filteredData[j]);
            }
        }
        this.filteredData = newFilteredData;
    }

    // Try to remove the row from the table body
    const row = this.table.querySelector('tr[data-id="' + id + '"]');
    if (row) {
        row.parentNode.removeChild(row);
    } else {
        console.warn('No row found with id: ' + id);
    }

    // Recalculate pagination and update the table display
    this.totalPages = Math.ceil(this.filteredData.length / this.perPage);
    this.updatePaginationInfo();
    this.createTableBody();
};

tably.prototype.getSelectedRows = function() {
    const selectedRows = [];
    const checkboxes = this.table.querySelectorAll('tbody input[type="checkbox"]:checked');

    checkboxes.forEach((checkbox) => {
        const row = checkbox.closest('tr');
        const id = row.dataset.id;
        const rowData = this.getDataById(id);
        if (rowData) {
            selectedRows.push(rowData);
        }
    });
    
    return selectedRows;
};


tably.prototype.CreateHeaderToolbar = function(container) {
    if (!this.hideSearch && this.options.enableSearch) {
        // Create a container for the header toolbar
        const headerToolbar = document.createElement('div');
        headerToolbar.className = 'tably-header-toolbar';

        // Create a global search input
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search...';
        searchInput.className = 'tably-table-search';
        searchInput.addEventListener('input', (event) => {
            this.filterData(null, event.target.value, true);
        });

        // Add custom buttons
        this.customHeaderButtons.forEach((button) => {
            const customButton = document.createElement('button');
            customButton.innerHTML = button.icon ? `<i class="${button.icon}"></i> ` : ''; // Add custom icon
            customButton.innerHTML += button.text;
            customButton.title = button.title ? button.title : ''; // Add title
            customButton.className = `btn ${button.className || 'btn-secondary btn-sm '} mr-2`;
            customButton.addEventListener('click', button.action);
            headerToolbar.appendChild(customButton);
        });
        // Append the header toolbar to the main container
        // Add the search input to the header toolbar
        headerToolbar.appendChild(searchInput);
        container.appendChild(headerToolbar);
    }

};
tably.prototype.render = function(selector) {
    const container = document.querySelector(selector);
    this.tableContainer = document.createElement('div');
    this.tableContainer.className = 'tably'; // Add Bootstrap classes
    // Append the header outside the table-wrapper
    this.CreateHeaderToolbar(this.tableContainer);
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'tably-table-wrapper';
    tableWrapper.appendChild(this.table);
    this.tableContainer.appendChild(tableWrapper);
    this.tableContainer.appendChild(this.footer);
    // Append the footer outside the table-wrapper
    container.appendChild(this.tableContainer);

    // setInterval(() => {this.reloadData()}, 1000)
};

tably.prototype.test =  function() {
    const data = [];
    const rowCount = 100;
    const columnCount = 10;

    function randomString() {
        const length = 5;
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }

    for (let i = 0; i < rowCount; i++) {
        const row = {};
        row['id'] =randomString();
        for (let j = 1; j < columnCount; j++) {
            row['Column' + (j + 1)] = i.toString()+randomString();
        }
        data.push(row);
    }
    return data;
}