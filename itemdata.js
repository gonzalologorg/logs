const sql = require("./database.js");
var stringSimilarity = require("string-similarity");
var itemData = {}
var itemNames = [];
var itemSlot = [];
const color = [
    "#A9A9A9",
    "#00BFFF",
    "#800080",
    "#FF00FF",
    "#FF0000",
    "#FFD700",
];
console.log("Cooking up items;")
sql.query("SELECT * FROM bu3_items;", function(err, res){
    if (err){
        throw err;
    }
    res.forEach(element => {
        var data = JSON.parse(element.itemData);
        var builder = {
            name : data.name,
            icon : data.iconID.endsWith(".mdl") || (data.iconID == "weapon" || data.iconID == "credits") ? null : "https://i.imgur.com/" + data.iconID + ".png",
            color : color[data.itemColorCode - 1],
            type : data.type,
            rarity : data.itemColorCode
        };
        itemSlot.push(element.itemID);
        itemNames.push(data.name.toLowerCase());
        itemData[element.itemID] = builder;
    });

    console.log("Items ready to serve")
})

Array.prototype.random = function () {
    return this[Math.floor((Math.random()*this.length))];
  }

function pick_random(){
    const keys = Object.keys(itemData);
    return itemData[keys[ keys.length * Math.random() << 0]];
}

function randomItem(){
    
    var ritem = pick_random()
    while(!ritem || ritem.icon == null){
        ritem = pick_random()
    }

    var answers = {[Math.floor(Math.random() * 4)] : ritem.name};
    for (let index = 0; index < 4; index++) {
        if (answers[index]) continue;
        var eval_item = pick_random()
        while(!eval_item || eval_item.type != ritem.type || eval_item.name == ritem.name){
            eval_item = pick_random()
        }   
        answers[index] = eval_item.name;
    }
    return {r : ritem, a : answers};
}

function getItem(name){
    const result = stringSimilarity.findBestMatch(name.toLowerCase(), itemNames);
    return itemData[itemSlot[result.bestMatchIndex]];
}

module.exports = {
    items : itemData,
    getItem : getItem,
    getRandomItem : randomItem
}