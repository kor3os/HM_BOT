const secrets = require("./secrets.json");
const config = require("./managerConfig.json");

const exec = require("child_process").exec;
const Journalctl = require("journalctl");
const journal = new Journalctl({unit: "hmbot"});

const Discord = require("discord.js");
const bot = new Discord.Client();

let logChannel;


// Launch the webhook listener
const WHL = require("./webHookListener.js");

WHL.callback = function() {
    try {
        bot.channels.get("311496070074990593").send("I have just updated!"); //TODO: use logchannel when it's working correctly
    } catch (error) {
        console.warn("Unable to alert on discord, just updated.");
    }
};

WHL.init(7227, secrets.webHookSecret);


String.prototype.redText = function() {
    return "ml\n-" + this.replace("\n", "'\n");
};

bot.on("ready", () => {
    logChannel = bot.channels.get(config.logChannel);
    bot.user.setActivity("vec sa grande sœur")
});

bot.on("message", message => {
    const {author, channel, content} = message;

    // Message starting with prefix sent by dev
    if (content.startsWith(config.prefix) && config.devs.includes(author.id)) {
        let args = content.substring(config.prefix.length).split(" ");
        let command = args.shift();

        if (command.match(/((re)?start|stop)/)) {
            // Basic systemctl commands (start/stop/restart)
            exec(`sudo systemctl ${command} hmbot`, (error, stdout, stderr) => {
                channel.send(error ? "```" + stderr.redText() + "```" : "Commande executée correctement.");
            });
        } else if (command.match(/statu[ts]/)) {
            // Status query
            exec(`systemctl is-active --quiet hmbot`, error => { // FIXME (toujours considéré comme actif)
                channel.send(`:${error ? "x" : "white_check_mark"}: Moutarde-chan est actuellement **${error ? "stoppée" : "active"}**.`);
            });
        } else if (command === "update") {
            // Update the bot, just pulling from git and starting the bot if necessary
            exec("git pull && sudo systemctl start hmbot", (error, stdout, stderr) => {
                channel.send("```" + (error ? stderr.redText() : stdout) + "```");
            });
        } else if (command.match(/logs?/)) {
            let n = 10;

            if (args[0] && args[0].match(/^[0-9]+$/)) {
                let val = parseInt(args[0]);
                n = (val > 50 ? 50 : val);
            }

            exec(`sudo journalctl -u hmbot | tail -n${n}`, (error, stdout, stderr) => {
                channel.send("```" + (error ? stderr.redText() : stdout) + "```");
            });
        } else if (command.match(/(ver(sion)?)|commit/)){
            exec('git log -1 --format="Commit:%h %s"', (error, stdout, stderr) =>{
                channel.send("```" + (error ? stderr.redText() : stdout) + "```");
            });
        }
    }
});

journal.on("event", event => {
    logChannel.send(`\`${event}\``);
});

bot.login(secrets.managerToken);
