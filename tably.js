/*jshint esversion: 8 */
/*Copyright (c) 2023 Denis Spasyuk, MIT License*/
/*Version: 0.01*/

function tably(data, options) {
    this.data = data;
    this.options = options;
    this.className = options.className || '';
    this.hiddenColumns = options.hiddenColumns || [];
    this.hideFilters = options.hideFilters || false;
    this.checkBoxesCol = this.options.checkBoxes || true;
    this.hideSearch = options.hideSearch || false;
    this.customParser = options.customParser || null; 
    this.customFooterButtons = options.customFooterButtons || [];
    this.customHeaderButtons  = options.customHeaderButtons  || [];
    this.allKeys = options.allKeys || this.getUnifiedKeys();
    this.selectedRowdata = {};
    this.renderModalEdit = options.renderModalEdit || function(){};
    this.init();
}

tably.prototype.getUnifiedKeys = function() {
    const allKeys = new Set();
    this.data.forEach((item) => {
        for (const key in item) {
            allKeys.add(key);
        }
    });
    return Array.from(allKeys);
};

tably.prototype.init = function() {
    this.table = document.createElement('table');
    this.table.className = `table ${this.className}`; // Add Bootstrap classes
    this.currentPage = 1;
    this.perPage = this.options.perPage || 10;
    this.totalPages = this.data.length/this.perPage < 1 ? 1 : Math.ceil(this.data.length/this.perPage); 
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
    // Reset filtered data to the original data
    this.filteredData = this.data.slice();
    // Reset the current page to 1
    this.currentPage = 1;

    // Update the table body
    this.createTableBody();
};

tably.prototype.createTableHeader = function() {
    const thead = document.createElement('thead');
    thead.className = 'thead-light';
    const trHead = document.createElement('tr');
    const trFilter = document.createElement('tr');
    if (this.checkBoxesCol){
        const thCheckboxHeader = document.createElement('th');
        thCheckboxHeader.className = 'tably-checkbox-header';
        const selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';
        selectAllCheckbox.addEventListener('change', (event) => {
            const checkboxes = this.table.querySelectorAll('tbody input[type="checkbox"]');
            checkboxes.forEach((checkbox) => {
                checkbox.checked = event.target.checked;
            });
        });
        thCheckboxHeader.appendChild(selectAllCheckbox);
        trHead.insertBefore(thCheckboxHeader, trHead.firstChild);
        const thFilterCheckbox = document.createElement('th');
        trFilter.insertBefore(thFilterCheckbox, trFilter.firstChild);
}

    // Create a colgroup element with col elements for each column
    const colgroupHead = document.createElement('colgroup');
    
    const colgroupFilter = document.createElement('colgroup');
    for (const key of this.allKeys) {
        if (!this.hiddenColumns.includes(key)) {
            const col = document.createElement('col');
            colgroupHead.appendChild(col);

            const colFilter = document.createElement('col');
            colgroupFilter.appendChild(colFilter);

            const th = document.createElement('th');
            th.innerText = key;
            th.addEventListener('click', () => {
                this.sortData(key);
            });
            trHead.appendChild(th);

            // Create filter input for each column
            const thFilter = document.createElement('th');
            const filterInput = document.createElement('input');
            filterInput.type = 'text';
            filterInput.className = 'form-control form-control-sm';
            filterInput.placeholder = 'Filter...';
            filterInput.dataset.column = key;
            filterInput.addEventListener('input', (event) => {
                this.filterData(event.target.dataset.column, event.target.value);
            });

            if (!this.hideFilters) {
                thFilter.appendChild(filterInput);
            }
            trFilter.appendChild(thFilter);
        }
    }

    thead.appendChild(colgroupHead); // Append colgroupHead to thead
    thead.appendChild(trHead);
    if (!this.hideFilters) {
        thead.appendChild(colgroupFilter); // Append colgroupFilter to thead
        thead.appendChild(trFilter);
    }
    this.table.appendChild(thead);
};

tably.prototype.createTableBody = function() {
    const tbody = document.createElement('tbody');

    const start = (this.currentPage - 1) * this.perPage;
    const end = this.currentPage * this.perPage;
    for (let i = start; i < end && i < this.filteredData.length; i++) {
        const tr = document.createElement('tr');
        tr.dataset.id = this.filteredData[i].id;
        if (this.checkBoxesCol){
            const tdCheckbox = document.createElement('td');
            tdCheckbox.className = 'tably-checkbox-cell';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.index = i;
            tdCheckbox.appendChild(checkbox);
            tr.appendChild(tdCheckbox);
        }
        this.allKeys.forEach((key) => {
            if (!this.hiddenColumns.includes(key)) {
                const td = document.createElement('td');
                let cellValue = this.filteredData[i][key] || '';
                // Use the custom parser function if provided
                if (this.customParser) {
                    cellValue = this.customParser(key, cellValue);
                }
                td.innerText = cellValue;
                td.dataset.key = key;
                tr.appendChild(td);
                
            }
        });

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
    prevButton.className = 'btn btn-secondary btn-sm mr-2'; // Make the button small
    prevButton.title = 'Previous'; 
    const nextButton = document.createElement('button');
    nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>'; // Add Font Awesome icon
    nextButton.className = 'btn btn-secondary btn-sm'; // Make the button small
    nextButton.title = 'Next'; 

    prevButton.addEventListener('click', () => {
        this.previousPage();
        this.updatePaginationInfo(); // Update the page number and total pages
    });

    nextButton.addEventListener('click', () => {
        this.nextPage();
        this.updatePaginationInfo(); // Update the page number and total pages
    });

    // Render custom buttons
    this.customFooterButtons.forEach((button) => {
        const customButton = document.createElement('button');
        customButton.innerHTML = button.icon ? `<i class="${button.icon}"></i> ` : ''; // Add custom icon
        customButton.innerHTML += button.text;
        customButton.title += button.title ? button.title : ''; // Add title
        customButton.className = `btn ${button.className || 'btn-secondary btn-sm '} mr-2`;
        customButton.addEventListener('click', button.action);
        this.footerButtons.appendChild(customButton);
    });

    this.footerPage.appendChild(prevButton);
    this.footerPage.appendChild(nextButton);

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

tably.prototype.sortData = function(column) {
    console.log(column);
    this.sortColumn = column;
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';

    this.filteredData.sort((a, b) => {
        if (a[column] < b[column]) {
            return this.sortOrder === 'asc' ? -1 : 1;
        }
        if (a[column] > b[column]) {
            return this.sortOrder === 'asc' ? 1 : -1;
        }
        return 0;
    });

    this.createTableBody();
};

tably.prototype.filterData = function(column, searchText, globalSearch = false) {
    this.filteredData = this.data.filter((row) => {
        if (globalSearch) {
            for (let key in row) {
                if(row[key]!=null){
                    if (row[key].toString().toLowerCase().includes(searchText.toLowerCase())) {
                        return true;
                    }
                }
            }
        } else {
            if(row[column]!=null){
                if (row[column].toString().toLowerCase().startsWith(searchText.toLowerCase())) {
                    return true;
                }
            }
        }
        return false;
    });

    this.currentPage = 1;
    this.createTableBody();
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
    this.table.tBodies[0].querySelectorAll('tr').forEach((row) => {
        row.addEventListener('dblclick', () => {
            const rowId = row.dataset.id;
            const rowData = this.getDataById(rowId);
            this.selectedRowdata = rowData;
            this.renderModalEdit(rowData);
            // Do something with rowData

        });
    });
};

tably.prototype.getDataById = function(id) {
    return this.filteredData.find(item => item.id === id);
};

tably.prototype.setDataById = function(id, newData) {
    var row = this.table.querySelector('tr[data-id="' + id + '"]');
    
    if (row) {
      var cells = row.querySelectorAll('td[data-key]');
      var dataKeys = Object.keys(newData);
      
      for (var i = 0; i < dataKeys.length; i++) {
        var key = dataKeys[i];
        var cell = row.querySelector('td[data-key="' + key + '"]');
        
        if (cell) {
          var value = newData[key];
          cell.innerText = value || '';
        }
      }
    } else {
      console.error('No row found with id: ' + id);
    }
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