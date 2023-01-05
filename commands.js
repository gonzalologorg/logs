var methods = require("./methods.js");
const Discord = require('discord.js');
const sql = require('./database.js');
const mem = require('./memory.js');
const itemData = require('./itemdata.js')
const inventory = require('./inventory.js');
const stats = require('./stats.js');
const Config = require("./config.js")
var shouldSave = false;
methods.registerCommand(["!register", "!join", "!start"], "Start the verify proccess to use the bot", (msg) => {
    const id = msg.author.id;
    const code = id.substr(id.length - 8)

    msg.author.send("\● Copy this code on chat\n**!discord " + code + "**\n● And then come back and write !verify here").catch(async err => {
        msg.reply("Your DMs are closed, go to privacy and allow to send DMs from the same server!");
    })
    mem.set("verify_" + id, code);
});

methods.registerCommand(["!verify", "!validate"], "Validate your token to start using the bot", (msg, params) => {
    const id = msg.author.id;
    //Revisar si ya tenemos un usuario
    mem.get("sid64_" + id, (err, rep) => {
        if (rep != null) {
            msg.reply("You're already registered!");
            return;
        }
        mem.get("verify_" + id, (err, rep) => {
            if (err) {
                throw err;
            }
            //Buscamos en los logs si alguien envio el codigo secreto
            sql.query("SELECT id, player_a FROM logs_data WHERE data='!discord " + rep + "'", function (err, data) {
                if (err)
                    throw err;

                if (data[0] && data[0].player_a) {
                    msg.reply("Welcome! I will start updating your user data now");
                    //Escribimos el usuario en redis y eliminamos la entrada de log en el servidor
                    mem.set("sid64_" + id, data[0].player_a)
                    sql.query("DELETE FROM logs_data WHERE id=" + data[0].id);
                    shouldSave = true;
                } else {
                    //Posiblemente la API no escribio la entrada aun?
                    msg.reply("I couldn't find your chat message, try again in ~10 seconds");
                }
            })
        })
    })
});

methods.registerCommand("!item", "Search for an item", (msg, params) => {
    if (!params[0]) {
        msg.reply("No search field supplied :/");
        return
    }
    const id = msg.author.id;
    const search = params.join(" ");
    const data = itemData.getItem(search)

    msg.reply(data.name);
    const exampleEmbed = new Discord.MessageEmbed()
        .setColor(data.color)
        .setImage(data.icon)

    msg.channel.send(exampleEmbed);
});

methods.registerCommand(["!inv", "!inventory"], "Fetch your inventory", (msg) => {
    const id = msg.author.id;
    mem.isLogged(id, (sid) => {
        mem.get("inv_" + id, (err, rep) => {
            if (err) {
                throw err;
            }
            if (rep == null) {
                sql.query("SELECT inventoryData FROM bu3_inventories WHERE steamid='" + sid + "';", function (err, res) {
                    if (err) {
                        throw err;
                    }
                    if (res[0]) {

                        mem.set("inv_" + id, res[0].inventoryData, (err, rep) => {
                            mem.expireat("inv_" + id, parseInt((Date.now() / 1000) + 60 * 5));
                            if (err) {
                                throw err;
                            }
                            if (rep == "OK") {
                                inventory.display(msg, sid, res[0].inventoryData, true);
                            } else {
                                msg.reply("I couldn't find your inventory")
                            }
                        });
                    } else
                        msg.reply("I couldn't find your inventory");
                })

            } else {
                inventory.display(msg, sid, rep, false);
            }
        })
    }, msg)
});

methods.registerCommand(["!money", "!cash"], "Get your wallet", (msg) => {
    const id = msg.author.id;
    mem.isLogged(id, (sid) => {
        inventory.getMoney(msg, sid);
    }, msg)
});

methods.registerCommand("!credits", "Get your credits", (msg) => {
    const id = msg.author.id;
    mem.isLogged(id, (sid) => {
        inventory.getCredits(msg, sid);
    }, msg)
});

methods.registerCommand(["!duels", "!duel"], "Get your duel data", (msg) => {
    const id = msg.author.id;
    mem.isLogged(id, (sid) => {
        stats.getDuels(msg, sid);
    }, msg)
});

methods.registerCommand(["!gang", "!gangs"], "Fetch your gang data", (msg) => {
    const id = msg.author.id;
    mem.isLogged(id, (sid) => {
        stats.getGang(msg, sid);
    }, msg)
});

methods.registerCommand("!arena", "Fetch your arena data", (msg) => {
    const id = msg.author.id;
    mem.isLogged(id, (sid) => {
        stats.getArena(msg, sid);
    }, msg)
});

methods.registerCommand(["!richer", "!topmoney"], "The most richer players", (msg) => {
    const id = msg.author.id;
    mem.isLogged(id, (sid) => {
        stats.getRicher(msg, sid);
    }, msg)
});

methods.registerCommand("!toparena", "Get the best on the arena", (msg) => {
    const id = msg.author.id;
    mem.isLogged(id, (sid) => {
        stats.getTopArena(msg, sid);
    }, msg)
});

methods.registerCommand("!toparena", "Get the best on the arena", (msg) => {
    const id = msg.author.id;
    mem.isLogged(id, (sid) => {
        stats.getTopArena(msg, sid);
    }, msg)
});

methods.registerCommand("!toptrivia", "Get the best players on trivia", (msg) => {
    const id = msg.author.id;
    //Revisar si ya tenemos un usuario
    mem.get("sid64_" + id, (err, rep) => {
        stats.getTopTrivia(msg, rep);
    })
});

methods.registerCommand(["!beat", "!hit"], "Bonk the bot", (msg) => {
    const yells = ["OUWIE", "OOF", "**BONK**", ":angerysad:", "**JEERK!**"];
    msg.channel.send(yells[Math.floor(Math.random() * yells.length)]);
});

var number_icons = ["🟢", "🔴", "🟡", "🔵"];
var users_answers = {};

function addRewardSave(message, tag, id) {
    //Regeneramos el top de trivias
    mem.del("top_trivia");
    mem.get("sid64_" + id, (err, sid) => {
        if (sid != null) {

            //Y limpiamos el rank personal
            mem.del("trivia_rank." + sid);
            const trivia_query = "INSERT INTO bot_trivias (steamid, score, rewards, exp) VALUES('" + sid + "', 1, 1, 1) ON DUPLICATE KEY UPDATE score=score+1, exp=exp+1"
            sql.query(trivia_query, (err, res) => {
                if (err) {
                    throw err;
                }
                sql.query("SELECT score, exp FROM bot_trivias WHERE steamid='" + sid + "';", (err, res) => {
                    if (err) {
                        throw err;
                    }

                    if (res && res[0]) {
                        var levelUp = res[0].exp > 5;
                        if (res[0].exp > 5){
                            sql.query("UPDATE bot_trivias SET exp=0, rewards=rewards+1 WHERE steamid='" + sid + "';")
                            res[0].exp = 0;
                        }
                        const channel = methods.client.channels.cache.get(Config.channel);
                        channel.send("Congratulations <@" + id + ">! You won the trivia :thumbsup:\nScore: **" + res[0].score + "** - XP: **" + res[0].exp + "/6** <:star:833793454852800522>")
                        if (levelUp){
                            channel.send("Also you've leveled up <:banana:833796145876172810>\nGo in-game and type !discord to get your wookie's trivia case!")
                        }
                    }
                });
            })
        } else {

        }
    })
}

var fireMembers = {}
var trviaTimeOut;
function startTrivia() {
    //Reiniciamos la lista de usuarios que pueden votar
    users_answers = {};
    const answer = itemData.getRandomItem();
    var answerFields = [];
    var winnerKey = -1;
    var i = 0;
    //answer consta de 2 campos, el item seleccionado (r) y las respues (a)
    var temp_icons = number_icons.sort((a, b) => 0.5 - Math.random());
    for (const ans in answer.a) {
        if (Object.hasOwnProperty.call(answer.a, ans)) {
            const element = answer.a[ans];
            //Es la misma respues que el item seleccionado? Entonces guardamos la "winning key"
            if (element == answer.r.name) {
                winnerKey = i
            }
            answerFields.push({
                name: temp_icons[i] + " " + element,
                value: "-",
                inline: true
            })
            i++;
        }
    }

    const exampleEmbed = new Discord.MessageEmbed()
        .setColor(answer.r.color)
        .setImage(answer.r.icon)
        .setTitle('Guess the item')
        .addFields(answerFields)

    const channel = methods.client.channels.cache.get(Config.channel)
    channel.send(exampleEmbed).then((message) => {
        var i = 0;
        for (let ans = 0; ans < 4; ans++) {
            message.react(temp_icons[ans]).then(() => {
                i++;
                //Esperemos que carguen los 4 votos para crear el colector
                if (i == 4) {
                    var collector = message.createReactionCollector((reaction, user) => {
                        return temp_icons.includes(reaction.emoji.name)
                    }, { time: 600000 });

                    collector.on('collect', (reaction, user) => {
                        //Si el usuario ya habia reaccionado, entonces ignoramos sus proximos inputs
                        if (!users_answers[user.tag]) {
                            users_answers[user.tag] = true;
                            mem.get("sid64_" + user.id, (err, sid) => {
                                if (sid == null) {
                                    channel.send("<@" + user.id + "> you're not registered, run !register and follow the instructions")
                                    return
                                }
                                
                                if (fireMembers[user.tag] && fireMembers[user.tag] > 1){
                                    methods.client.users.cache.get(user.id).send("You have to wait " + fireMembers[user.tag] + " trivia/s to answer another one")
                                    return;
                                }
                                var id = 0;
                                number_icons.forEach(el => {
                                    if (reaction.emoji.name == el && id == winnerKey) {
                                        //Guardamos la rencompenza y cerramos el colector de reacciones
                                        addRewardSave(message, user.tag, user.id);
                                        fireMembers[user.tag] = 4;
                                        collector.stop();
                                    }
                                    id++;
                                });
                            })
                        } else {
                            return;
                        }
                    });

                    collector.on('end', collected => {
                        const nextTrivia = (300 + Math.random() * 900)
                        console.log("Next trivia in: " + nextTrivia)
                        clearTimeout(trviaTimeOut);
                        trviaTimeOut = setTimeout(() => {
                            startTrivia();
                        }, nextTrivia * 1000)

                        for (const tag in fireMembers) {
                            if (Object.hasOwnProperty.call(fireMembers, tag)) {
                                //No more fire members for this guy
                                fireMembers[tag]--;
                                if (fireMembers[tag] <= 0) {
                                    delete fireMembers[tag]
                                }
                            }
                        }
                        message.delete();
                    });
                }
            }).catch((e) => {
                console.log(e)
            });

        }
    }).catch(function () {
        //Something
    });
}

methods.registerCommand("!trivia", "Starts a Trivia", (msg) => {
    if (msg && msg.author.id != "130065975956471808") return;
    startTrivia()
});

methods.createHelp();

function backup_loop() {
    if (!shouldSave) {
        setTimeout(backup_loop, 1000 * 60 * 10);
        return;
    }
    methods.BGSAVE(() => {
        setTimeout(backup_loop, 1000 * 60 * 10);
    });
}

Object.defineProperty(Array.prototype, 'flat', {
    value: function (depth = 1) {
        return this.reduce(function (flat, toFlatten) {
            return flat.concat((Array.isArray(toFlatten) && (depth > 1)) ? toFlatten.flat(depth - 1) : toFlatten);
        }, []);
    }
});
backup_loop()