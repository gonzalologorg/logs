const Config = require('./config.js');

var mysql = require('mysql');
var connection;

function doConnect() {
    connection = mysql.createConnection({
        host: Config.db.ip,
        user: Config.db.user,
        password: Config.db.password,
        database: Config.db.default
    });
}

doConnect()

connection.connect(function (err) {
    if (err) {
        console.error('error connecting: ' + err.stack);
        return;
    }

    connection.query(`CREATE TABLE IF NOT EXISTS bot_trivias (
        steamid VARCHAR(22) NOT NULL,
        score INT NULL DEFAULT 0,
        rewards INT NULL DEFAULT 0,
        exp INT NULL DEFAULT 0,
        PRIMARY KEY (steamid));
    `)
    console.log('connected as id ' + connection.threadId);
});

const exitHook = require('exit-hook');

exitHook(() => {
	console.log('Exiting');
    connection.end();
});
module.exports = connection;