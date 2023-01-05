const redis = require("redis");
const client = redis.createClient();

client.on("error", function (error) {
    console.error(error);
});

client.on("ready", function (error) {
    console.log("reDis client on");
});

client.isLogged = function (id, cb, msg, sendDM) {
    client.get("sid64_" + id, (err, rep) => {
        if (err)
            throw err;
        if (rep == null) {
            if (sendDM)
                msg.author.send("You're not registered, run !register and follow the steps").catch(async err => { })
            else
                msg.reply("You're not registered, run !register and follow the steps");
            return;
        }

        cb(rep);
    });
}

module.exports = client;