const mysql = require('mysql');

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password:'',
    database:'book-finder'
});

module.exports = db;