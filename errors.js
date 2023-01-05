var db = require("./db.js")
var app = require("./methods.js")

db.query("CREATE TABLE IF NOT EXISTS `asap_players`.`error_data` (" +
        "`id` INT NOT NULL AUTO_INCREMENT," +
        "`error` TEXT NULL," +
        "`hash` VARCHAR(64) NULL," +
        "`file` VARCHAR(64) NULL," +
        "`addon` VARCHAR(64) NULL," +
        "`realm` VARCHAR(18) NULL," +
        "`count` INT NULL," +
        "PRIMARY KEY (`id`))", );

var memory = {};
app.express.post("/error", function (req, res) {
    var body = req.body;

    if (body.error.startsWith("Failed to create font")) return;
    if (body.error.startsWith("vgui.Create failed to create")) return;
    if (body.error.startsWith("lua/")) return;
    var addonName = body.error.substring(7);
    addonName = addonName.substring(0, addonName.indexOf("/"));
    var filename = body.error.match(/[\w-]+\.lua/);
    console.log(filename)
    if (memory[body.hash]){
        memory[body.hash].count++;
        db.query("UPDATE error_data SET count = count + 1 WHERE hash=" + body.hash);
    }else{
        db.query("SELECT * FROM error_data WHERE hash=" + body.hash, function(err, res){
            if (err){
                return;
            }
            if (res[0]){
                body = res[0];
                memory[body.hash] = {
                    count : body.count + 1,
                    error : body.error,
                    hash : body.hash,
                    addon : addonName,
                    file : filename,
                }
                db.query("UPDATE error_data SET count = count + 1 WHERE hash=" + body.hash);
            }else{
                memory[body.hash] = {
                    count : 1,
                    error : body.error,
                    hash : body.hash,
                    file : filename,
                    addon : addonName,
                }
                var clean = body.error;
                clean = clean.replace(/'/gi, "");
                db.query("INSERT INTO `asap_players`.`error_data`" + 
                    "(`error`," + 
                    "`hash`," + 
                    "`file`," + 
                    "`addon`," + 
                    "`count`)" + 
                    "VALUES('" + clean + "'," +
                    body.hash  + ",'" +
                    filename + "','" +
                    addonName + "',1);");
            }
        })
    }
    res.status(200);
})

db.query("SELECT * FROM error_data LIMIT 50", function(err, res){
    for (let id = 0; id < res.length; id++) {
        const body = res[id];
        memory[body.hash] ={
            count : body.count,
            error : body.error,
            realm : body.realm,
            addon : body.addon,
            hash : body.hash,
            file : body.file,
            realm : body.realm
        }
    }
})
/*
app.express.get('/logger', function (req, res) {
    res.render('errorviewer', {data : memory})
  })
*/
app.express.post('/delerror', function(req, res){
    var id = req.body.id;
    if (memory[id]){
        delete memory[id];
    }
    id = id.replace(/'/gi, "");
    id = id.replace(/"/gi, "");
    db.query("DELETE FROM error_data WHERE hash=" + id + ";", function(){
        res.send("1").status(200);
    })
})

app.express.get("/error_list", function(req, res){
    res.json(memory);
})