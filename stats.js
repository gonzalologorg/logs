const mem = require('./memory.js');
const sql = require('./database.js');
var steamuserinfo = require('steam-userinfo');

steamuserinfo.setup("BB673791FB522B34B0EDD0C8B363088A");

function showDuel(str) {
    const duel = typeof (str) == "string" ? JSON.parse(str) : str;
    return "_Your Wins/Loses_\n**" + duel.wins + "** :white_check_mark: | :no_entry_sign: **" + duel.lose + "**";
}

function duels(msg, sid) {
    mem.get("stat_duels." + sid, (err, rep) => {
        if (err) {
            throw err;
        }

        if (rep == null) {
            sql.query("SELECT wins, lose FROM duel_players WHERE player='" + sid + "';", function (err, res) {
                if (err) {
                    throw err;
                }

                if (res[0]) {
                    mem.set("stat_duels." + sid, JSON.stringify(res[0]));
                    mem.expire("stat_duels." + sid, 500)
                    msg.reply(showDuel(res[0]));
                    console.log("SENT MESSAGE")
                } else {
                    msg.reply("You have no data playing duels");
                }
            })
        } else {
            msg.reply(showDuel(rep));
        }
    });
}

function buildGangMsg(gang) {
    console.log(typeof (gang.Members));
    return "**Gang:** " + gang.Name + "\n> :dollar: -> " + gang.Money.toLocaleString() + "\n> :coin: -> " + gang.Credits.toLocaleString() + "\n> :people_holding_hands: -> " + JSON.parse(gang.Members).length;
}

function fetchGang(msg, sid, gang) {
    if (gang != null) {
        mem.get("gang_data." + gang, (err, rep) => {
            if (err) {
                throw err;
            }
            if (rep == null) {
                sql.query("SELECT Name, Members, Money, Credits FROM gangs_list WHERE Tag= ?;", [gang], function (err, res) {
                    if (err) {
                        throw err;
                    }
                    console.log(res[0])
                    if (res[0]) {
                        mem.set("gang_data." + gang, buildGangMsg(res[0]), () => {
                            fetchGang(msg, sid, gang);
                        });
                        mem.expire("gang_data." + gang, 60 * 20);
                    }
                    else
                        msg.reply("You are not in a valid gang.")
                });
            } else
                msg.reply(rep);
        });
        return
    }
    mem.get("gang_id." + gang, (err, rep) => {
        if (err) {
            throw err;
        }

        if (rep == null) {
            sql.query("SELECT gang FROM gangs_cache WHERE steamid='" + sid + "';", function (err, res) {
                if (err) {
                    throw err;
                }

                if (res[0]) {
                    mem.set("gang_id." + sid, res[0].gang, () => {
                        fetchGang(msg, sid, res[0].gang);
                    });
                    mem.expire("gang_id." + gang, 3600);
                } else {
                    msg.reply("You are not in a gang");
                }
            })
        } else {
            fetchGang(msg, sid, rep);
        }
    });
}

function buildArenaMsg(info) {
    return "**Arena stats:**\n> Level: **" + info.level + "** - " + info.exp.toLocaleString() + "xp :diamond_shape_with_a_dot_inside:\n> :skull:  " +
        + info.kills.toLocaleString() + "**  :angel:  **" + info.deaths.toLocaleString() + "**  :fire:  **" + info.damage.toLocaleString() +
        "\n> Weapons: **" + info.Weapons + "** :gun:"
}

function arena(msg, sid) {
    mem.get("arena_data." + sid, (err, rep) => {
        if (err)
            throw err;

        if (rep == null) {
            sql.query("SELECT * FROM arena_players WHERE steamid='" + sid + "';", function (err, res) {
                if (err)
                    throw err;
                if (res && res[0]) {

                    const data = JSON.parse(res[0].Data);
                    var playerInfo = {
                        level: res[0].Level || 1,
                        exp: res[0].Experience || 0,
                        kills: data.Kills || 0,
                        streak: data.Streak || 0,
                        deaths: data.Deaths || 0,
                        damage: data.Damage || 0,
                        Weapons: (Object.keys(data.Weapons) || []).length
                    }

                    const message = buildArenaMsg(playerInfo);
                    mem.set("arena_data." + sid, message);
                    mem.expire("arena_data." + sid, 1800);
                    msg.reply(message);
                } else {
                    msg.reply("You don't have data in arena");
                }
            })
        } else {
            msg.reply(rep);
        }
    })
}

function buildRicherMsg(res) {
    var msg = "**Richest boys in the server:**\n";
    var i = 1
    res.forEach(element => {
        msg = msg + "> **" + i + ") ** " + element.rpname + ": **£" + element.wallet.toLocaleString() + "**\n"
        i++;
    });

    return msg
}

function richer(msg, sid) {
    mem.get("money_rank", (err, rep) => {
        if (err) {
            throw err;
        }
        if (rep == null) {
            sql.query("SELECT rpname, wallet FROM darkrp_player ORDER BY wallet DESC LIMIT 10;", function (err, res) {
                const message = buildRicherMsg(res);
                mem.set("money_rank", message);
                mem.expire("money_rank", 500);
                msg.channel.send(message);
            });
        } else {
            msg.channel.send(rep);
        }

        mem.get("money_rank." + sid, (err, rep) => {
            if (err)
                throw err;

            if (rep == null) {
                const query = "SELECT uid, wallet , (select count(1) + 1 from darkrp_player s2 where s2.wallet > s1.wallet or (s2.wallet = s1.wallet)) as rnk FROM darkrp_player s1 WHERE uid = '" + sid + "' ORDER BY wallet DESC"
                sql.query(query, function (err, res) {
                    if (err) {
                        throw err;
                    }
                    mem.set("money_rank." + sid, (res[0].rnk - 1).toLocaleString())
                    mem.expire("money_rank." + sid, 600);
                    msg.reply("Your rank: **" + (res[0].rnk - 1).toLocaleString() + "**");
                })
            } else {
                msg.reply("Your rank: **" + rep + "**")
            }
        })
    })
}

function topArena(msg, sid) {
    mem.get("arena_rank", (err, rep) => {
        if (err) {
            throw err;
        }
        if (rep == null) {
            sql.query("SELECT steamid, Level, Experience FROM arena_players ORDER BY Level DESC, Experience DESC LIMIT 10;", function (err, res) {
                var steamids = [];
                res.forEach(data => {
                    steamids.push(data.steamid);
                })
                steamuserinfo.getUserInfo(steamids, (err, resp) => {
                    if (err) {
                        throw err;
                    }
                    var i = 1;
                    var message = "**Top Arena Players:**\n"
                    resp.response.players.forEach(ply => {
                        const data = res[i - 1];
                        message = message + "> **" + i + ")** " + ply.personaname + ": Level " + data.Level + " - " + data.Experience + "xp\n"
                        i++;
                    });
                    mem.set("arena_rank", message);
                    mem.expire("arena_rank", 3600);
                    msg.channel.send(message);
                });
            });
        } else {
            msg.channel.send(rep);
        }

        mem.get("arena_rank." + sid, (err, rep) => {
            if (err)
                throw err;

            if (rep == null) {
                const query = "SELECT steamid, Level, Experience , (select count(1) + 1 from arena_players s2 where s2.Level > s1.Level or (s2.Level = s1.Level AND s2.Experience > s1.Experience)) as rnk FROM arena_players s1 WHERE steamid = '" + sid + "' ORDER BY Level DESC, Experience DESC;"
                sql.query(query, function (err, res) {
                    if (err) {
                        throw err;
                    }
                    mem.set("arena_rank." + sid, (res[0].rnk - 1).toLocaleString())
                    mem.expire("arena_rank." + sid, 3600);
                    msg.reply("Your rank: **" + (res[0].rnk - 1).toLocaleString() + "**");
                })
            } else {
                msg.reply("Your rank: **" + rep + "**")
            }
        })
    })
}

function buildTriviaMsg(res) {
    var msg = "**Top trivia players:**\n";
    var i = 1
    res.forEach(element => {
        msg = msg + "> **" + i + ") ** " + element.rpname + ": **" + element.score.toLocaleString() + "**\n"
        i++;
    });

    return msg
}

function topTrivia(msg, sid) {
    mem.get("top_trivia", (err, rep) => {
        if (err) {
            throw err;
        }
        if (rep == null) {
            sql.query("SELECT steamid, score, rpname FROM bot_trivias INNER JOIN darkrp_player ON bot_trivias.steamid = darkrp_player.uid ORDER BY score DESC LIMIT 10;", function (err, res) {
                const message = buildTriviaMsg(res);
                mem.set("top_trivia", message);
                msg.channel.send(message);
            });
        } else {
            msg.channel.send(rep);
        }

        if (sid) {
            mem.get("trivia_rank." + sid, (err, rep) => {
                if (err)
                    throw err;

                if (rep == null) {
                    const query = "SELECT score , (select count(1) + 1 from bot_trivias s2 where s2.score > s1.score or (s2.score = s1.score)) as rnk FROM bot_trivias s1 WHERE steamid = '" + sid + "' ORDER BY score DESC"
                    sql.query(query, function (err, res) {
                        if (err) {
                            throw err;
                        }
                        if (res[0] && res[0].rnk) {
                            mem.set("trivia_rank." + sid, (res[0].rnk - 1).toLocaleString())
                            msg.reply("Your rank: **" + (res[0].rnk - 1).toLocaleString() + "**");
                        }
                    })
                } else {
                    msg.reply("Your rank: **" + rep + "**")
                }
            })
        }
    })
}

module.exports = {
    getDuels: duels,
    getGang: fetchGang,
    getArena: arena,
    getRicher: richer,
    getTopArena: topArena,
    getTopTrivia: topTrivia
}
