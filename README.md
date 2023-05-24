# tably
Tably: Library for generating html tables  

Introduction

Tably is a powerful JavaScript library that allows you to generate, customize, and manipulate HTML tables dynamically. With a few lines of code, you can create a fully featured table with paging, sorting, and filtering capabilities. Tably also provides easy customization and formatting options, including the ability to include custom buttons in the table header and footer.
Getting Started

To start using Tably, first include the Tably CSS and JavaScript files in your HTML file:

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.0/css/all.min.css">
    <link rel="stylesheet" href="tably.css">
    <script src="tably.js" defer></script>
    <title>My Table Library</title>
</head>
<body>
    <div id="tably"></div>
</body>
</html>

The CSS file tably.css provides the default styles for the table. You may modify this file or add your own styles as needed. The JavaScript file tably.js is the core library that provides the functionality of Tably.
Usage

To create a table, create a new instance of Tably with your data and options, then call the render() method. The render() method takes a string argument specifying the CSS selector of the element where you want to display the table.

Here's an example:
<script>
    window.addEventListener('DOMContentLoaded', () => {
        // Your data array
        const data = tably.prototype.test();

        // Your options
        const options = {
            perPage: 25,
            enableSearch: true,
            customParser: function(key, value){return value},
            filterColumns: ['name'],
            className: '',
            hiddenColumns: [ '_id'],
            hideFilters: false,
            hideSearch: false,
            customFooterButtons: [
                // Custom footer buttons...
            ],
            customHeaderButtons: [
                // Custom header buttons...
            ],
        };

        // Create a new Tably instance
        const table = new tably(data, options);

        // Render the table in the div with id 'tably'
        table.render('#tably');
    });
</script>
Options

Tably allows you to customize your table through various options. Here are the most commonly used options:

    perPage: The number of rows to display per page. Default is 10.
    enableSearch: Enable or disable the global search feature. Default is false.
    filterColumns: An array of column keys to enable filtering. Default is [] (no filtering).
    className: A CSS class to apply to the table. Default is '' (no class).
    hiddenColumns: An array of column keys to hide from the table. Default is [] (no hidden columns).
    customParser: A function to parse cell data. This function should take two arguments: the key (column) and the value (cell data), and should return the parsed value.
    customFooterButtons: An array of custom button objects to display in the table footer. Each button object should have the following properties: text (the button text), action
