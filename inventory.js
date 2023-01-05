const itemData = require('./itemdata.js');
const mem = require('./memory.js');
const sql = require('./database.js');
var inventoryStructure = {}
function display(msg, sid, invbody, build) {
    //Si necesitamos reconstruir la lista, lo hacemos, sino mostramos el valor guardado
    if (build) {
        inventoryStructure[sid] = {};
        const data = JSON.parse(invbody);
        for (const item_id in data) {
            if (Object.hasOwnProperty.call(data, item_id)) {
                const amount = data[item_id];
                const item = itemData.items[item_id];
                //Ponemos solamente los items relevantes
                if (item.rarity <= 3 && item.type != "case") {
                    continue;
                }
                inventoryStructure[sid][item.name] = amount
            }
        }

        var stringBuilder = "\n> **Your items:**\n";
        for (const item_name in inventoryStructure[sid]) {
            if (Object.hasOwnProperty.call(inventoryStructure[sid], item_name)) {
                const am = inventoryStructure[sid][item_name];
                stringBuilder = stringBuilder + "> " + item_name + " x" + am + "\n"
            }
        }

        //Guardamos la lista de items para este steamid
        mem.set("inv_display" + sid, stringBuilder, (err, rep) => {
            if (err){
                throw err;
            }
            if (rep == "OK"){
                msg.reply(stringBuilder)
            }
        });

    } else {
        mem.get("inv_display" + sid, (err, rep) => {
            if (err)
                throw err;

            //Si no tenemos el string del inventario, solamente la creamos de nuevo
            if (!rep) {
                display(msg, sid, invbody, true);
            } else {
                msg.channel.send(rep)
            }
        })
    }
}

function money(msg, sid){
    mem.get("inv_money" + sid, (err, rep) =>{
        if (err){
            throw err;
        }

        if (rep == null){
            sql.query("SELECT wallet FROM darkrp_player WHERE uid='" + sid + "';", (err, res) =>{
                if (res[0]){
                    mem.set("inv_money" + sid, res[0].wallet);
                    mem.expireat("inv_money" + sid, parseInt((Date.now() / 1000) + 60 * 10));
                    msg.reply("You have £" + parseInt(res[0].wallet).toLocaleString() + " :dollar:")
                    console.log("Writing money")
                }
            })
        }else{
            msg.reply("You have £" + parseInt(rep).toLocaleString() + " :dollar:");
            console.log("Money loaded")
        }
    })
}

function credits(msg, sid){
    mem.get("inv_credits" + sid, (err, rep) =>{
        if (err){
            throw err;
        }

        if (rep == null){
            sql.query("SELECT credits FROM users WHERE slug='" + sid + "';", (err, res) =>{
                if (res[0]){
                    mem.set("inv_credits" + sid, res[0].credits);
                    mem.expireat("inv_credits" + sid, parseInt((Date.now() / 1000) + 60 * 10));
                    msg.reply("You have " + parseInt(res[0].credits).toLocaleString() + " :coin:")
                }
            })
        }else{
            msg.reply("You have " + parseInt(rep).toLocaleString() + " :coin:");
        }
    })
}

module.exports = {
    display: display,
    getMoney : money,
    getCredits : credits
}