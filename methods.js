
var Config = require('./config.js')
var Mem = require('./mem.js')
var wk = require("./worker.js")
var db = require("./db.js")
var express = require("express");
var app = express();
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({
	extended: true
}));

console.log("--Initializing log's server--")
app.listen(2053, () => {
	console.log("[EXPRESS] Listening on :" + Config.expressPort);
});

let currentKey;

app.get("/fetch", function (req, res) {
	Mem.fetch(req.query, res);
})

app.get("/filter", function (req, res) {
	Mem.filter(req.query, res);
})

app.get("/player", function (req, res) {
	wk.findPlayer(req.query, res);
})

app.post("/add", function (req, res) {
	wk.insert(req.body, res);
})

app.post("/register", function (req, res) {
	if (req.body.key != "gonzo_made_it") return;

	let handshake = req.body.shake;
	if (handshake) {
		currentKey = handshake;
		res.send("Handshake accepted");
	}
})

app.get("/mem", function (req, res) {
	res.json(Mem)
})

let statsCache = {};
app.get("/stats", function (req, resp) {
	if (statsCache) {
		resp.json({size : statsCache.size + "kb", logs : statsCache.cnt});
		return;
	}
	db.query(`SELECT
		TABLE_NAME AS logs_data,
		ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024) AS 'kbs'
  		FROM
			information_schema.TABLES
  		WHERE
	  		TABLE_NAME = "logs_data";
	`, function(err, res){
		const size = res[0].kbs;
		db.query("SELECT COUNT(*) as cnt FROM logs_data", function(err, res){
			statsCache = {size: size, cnt : res[0].cnt};
			resp.json({size : statsCache.size + "kb", logs : statsCache.cnt});
			setTimeout(() => {
				statsCache = null;
			}, 1000 * 60 * 5);
		})
	})
})

module.exports = {
	express: app
};