const secrets = require("./secrets.json");
const config = require("./managerConfig.json");

const exec = require("child_process").exec;
const Journalctl = require("journalctl");
const journal = new Journalctl({unit: "hmbot"});

const Discord = require("discord.js");
const bot = new Discord.Client();

let logChannel;

bot.on("ready", () => {
    logChannel = bot.channels.get(config.logChannel);
});

bot.on("message", message => {
    const {author, channel, content} = message;

    // Message starting with prefix sent by dev
    if (content.startsWith(config.prefix) && config.devs.includes(author.id)) {
        let args = content.substring(config.prefix.length).split(" ");
        let command = args.shift();

        if (command.match(/((re)?start|stop)/)) {
            // Basic systemctl commands (start/stop/restart)
            exec(`systemctl ${command} hmbot`, (error, stdout, stderr) => {
                channel.send(error ? "```" + stderr + "```" : "Commande executée correctement.");
            });
        } else if (command.match(/statut|s/)) {
            // Status query
            exec(`systemctl is-active --quiet hmbot`, error => {
                channel.send(`:${error ? "x" : "white_check_mark"}: Moutarde-chan est actuellement **${error ? "stoppée" : "active"}**.`);
            });
        } else if (command === "update") {
            exec("git pull && systemctl restart hmbot", (error, stdout, stderr) => {
                channel.send(error ? "```" + stderr + "```" : "Moutarde chan a été mise à jour.");
            });
        }  else if (command.match("logs?")) {
            let n = 10;

            if (args[0] && args[0].match(/^[0-9]+$/)) {
                let val = parseInt(args[0]);
                n = (val > 50 ? 50 : val);
            }

            exec(`journalctl -fu hmbot | tail -n${n}`, (error, stdout, stderr) => {
                channel.send("```" + (error ? stderr : stdout) + "```");
            });
        }
    }
});

journal.on("event", event => {
    logChannel.send(`\`${event}\``);
});

bot.login(secrets.managerToken);