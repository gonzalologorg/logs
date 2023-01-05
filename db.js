var Config = require('./config.js')
var duels;
var mysql = require('mysql');
var ps = require('ps-node');
const { exec } = require('child_process');
const path = require('path');
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

function performCleanup() {
	connection.query("CREATE TABLE IF NOT EXISTS `asap_players`.`logs_data` (" +
		"`id` INT NOT NULL AUTO_INCREMENT," +
		"`category` VARCHAR(16) NULL," +
		"`timestamp` BIGINT NULL," +
		"`player_a` VARCHAR(18) NULL," +
		"`player_b` VARCHAR(18) NULL," +
		"`data` TEXT NULL," +
		"PRIMARY KEY (`id`))");
}

connection.connect(function (err) {
	if (err) {
		if (err.code == "ECONNREFUSED"){
			
			const command = `${path.resolve('C:\\xampp\\mysql\\bin\\mysqld.exe --defaults-file=C:\\xampp\\mysql\\bin\\my.ini --standalone')}`
			console.log("Invoking new process " + command)
			exec(command, function (err, stdout, stderror) {
				console.log("PROCESS SPAWNED")
				if (err) {
					console.log(err)
					return;
				}
				doConnect()
			})
		}
		console.error('[SQL] error connecting: ' + err.code);
		throw(err)
		
	}

	console.log('[SQL] Connected as id ' + connection.threadId);
	performCleanup()
});

connection.on("error", function (err) {
	console.log("Seems like we lost connection, let's start it again")
	ps.lookup({
		command: 'mysqld',
	}, function (err, resultList) {
		if (err) {
			throw new Error(err);
		}
		var found = false;
		resultList.forEach(function (process) {
			if (process) {
				found = true
				doConnect()
				console.log('PID: %s, COMMAND: %s, ARGUMENTS: %s', process.pid, process.command, process.arguments);
			}
		});

		if (!found) {
			const command = `${path.resolve('C:\\xampp\\mysql\\bin\\mysqld.exe --defaults-file=C:\\xampp\\mysql\\bin\\my.ini --standalone')}`
			exec(command, function (err, stdout, stderror) {
				if (err) {
					console.log(err)
					return;
				}

				doConnect()
			})
		}
	});

});

module.exports = connection;