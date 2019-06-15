// Hello!
// This bot is being dev'd for the Discord server Hentai Moutarde at https://discord.gg/xX33Vkr
// It is an international Discord revolving around hentai (and more)
// If you plan on stealing this, please kindly go fuck yourself.

// Have any questions ? Go ask Koreos#7227 or PopahGlo#3995 over at HM!

const fs = require("fs");

// Launch the webhook listener
const secrets = require("./secrets.json");

const WHL = require("./webHookListener.js");

WHL.callback = function () {
    try {
        bot.channels.get("311496070074990593").send("I have just updated!");
    } catch (error) {
        console.warn("Unable to alert on discord, just updated.");
    }
};

WHL.init(7227, secrets.webHookSecret);

// Discord library and client
const Discord = require("discord.js");
const bot = new Discord.Client();

// Bot configuration
let config;
let hentaiMoutarde;

// Useful constants
const sec = 1000,
    min = 60 * sec,
    hour = 60 * min;

// Bot managers
const spamManager = require("./spammanager.js");
let SM = new spamManager.Manager(30000);

const slowModeManager = require("./slowmodemanager.js");
let slowMode = new slowModeManager.Manager();

// CONFIG

function saveConfig() {
    fs.writeFileSync("config.json", JSON.stringify(config, null, 4), "utf-8");
    console.log(`saved config`);
}

function loadConfig() {
    let text = fs.readFileSync("config.json");
    config = JSON.parse(text.toString());
    console.log(`loaded config`);
}

// STRING UTILITY

String.prototype.charTally = function charTally() { // Count the number of occurences of each character in the string.
    return this.split("").reduce((acc, char) => {
        acc[char] = (acc[char] || 0) + 1;
        return acc;
    }, {});
};

// ROLES

// Test if member has one of the roles passed
const hasRole = (member, ...roles) => member.roles.find(role => roles.includes(role));

// Get a role from a guild
const getRole = (name) => hentaiMoutarde.roles.find(val => val.name === name);

function cleanUpColorRoles() {
    hentaiMoutarde.roles.filter(role => role.name.includes("dncolor") && role.members.size === 0)
        .forEach(role => role.delete());
}

function warnMember(member) { // Warn a member and mute him if necessary
    console.log(`warning user ${member.user.username}`);

    if (!config.warns[member.toString()]) { // Is he already warned?
        config.warns[member.toString()] = 1; // If not, add him to the list of warned
    } else {
        config.warns[member.toString()] += 1;
        if (config.warns[member.toString()] >= config.maxWarns) {
            member.addRole(getRole("Muted"), "3rd warning")
                .catch(console.error);
            delete config.warns[member.toString()];
        }
    }
    saveConfig();
}

let bumpChannel;

function dlmBump() {
    if (bumpChannel) {
        bumpChannel.send("dlm!bump");
        setTimeout(dlmBump, (9 * hour) + (Math.random() * (5 * min)));
    }
}

// Runs on bot start
bot.once("ready", () => {
    console.log(`Bot started ! ${bot.users.size} users.`);
    bot.user.setActivity("twitter.com/hentaimoutarde");

    loadConfig();

    hentaiMoutarde = bot.guilds.get(config.server);
    bumpChannel = bot.channels.get("311496070074990593");
    dlmBump();
});

// Message handling
bot.on("message", message => {
    // Ignore bot commands and private messages
    const {author, member, channel, content} = message;

    if (author.bot || channel.type !== "text") return;

    const ok = () => message.react("👌");

    // User commands
    if (content.startsWith(config.prefixU)) {
        let commandAndArgs = content.substring(config.prefixU.length).split(" "); // Split the command and args
        let command = commandAndArgs[0];  // Alias to go faster

        if (command === "color") {
            if (hasRole(member, "Donateur")) {  // Si on a le role donateur
                if (commandAndArgs.length === 2) { // I want exactly 1 argument
                    let role = member.roles.find(val => val.name.includes("dncolor"));  // Find the user's color role if there is one

                    if (role) {
                        member.removeRole(role)
                            .catch(console.error);
                    }

                    if (commandAndArgs[1] === "reset") { // Reset is not a color, allow people to just remove it
                        cleanUpColorRoles();
                    } else {
                        role = getRole("dncolor" + commandAndArgs[1]);

                        if (role) {
                            member.addRole(role);
                        } else {
                            hentaiMoutarde.createRole({
                                name: "dncolor" + commandAndArgs[1],
                                color: commandAndArgs[1],
                                hoist: false,
                                position: hasRole(member, "Donateur").position + 1, // 1 au dessus du role donateur
                                mentionable: false
                            })
                                .then(role => member.addRole(role)
                                    .then(() => cleanUpColorRoles())
                                    .catch(console.error))
                                .catch(console.error);
                        }
                        ok();
                    }
                } else {  // Le mec a le droit mais il sait pas faire
                    message.reply("Exemple: `color #FF4200`");
                }
            } else {  // Le mec a pas le droit
                message.reply("Vous devez etre donateur pour utiliser cette commande.");
            }
        } else if (command === "help") {
            message.reply(`voici mes commandes utilisateur:
-color <code_couleur/reset> : Seulement pour les donateurs; change la couleur de votre nom au code couleur choisi.
\texemple: color #FF4200`);
        }
    }

    // Mod commands
    if (content.startsWith(config.prefixM)) {
        if (hasRole(member, "Généraux", "Salade de fruits")) {
            let commandAndArgs = content.substring(config.prefixM.length).split(" "); // Split the command and args
            let command = commandAndArgs[0];  // Alias to go faster

            if (command === "warn") { // FIXME
                message.mentions.members.forEach(warnMember);
                ok();

            } else if (command === "spamtimeout") {
                try {
                    SM.changeTimeout(commandAndArgs[1]);
                    ok();
                } catch (e) {
                    message.reply("Erreur: " + e);
                }

            } else if (command === "slowmode") {
                try {
                    if (commandAndArgs[1] === "0") {
                        slowMode.removeSlowMode(channel);
                        ok();

                    } else if (commandAndArgs[1] === "help") {
                        message.reply("usage: slowmode <time>[h/m/s/ms] (default: seconds)\nexample: slowmode 24h\nremove with slowmode 0");

                    } else {
                        if (commandAndArgs[1].endsWith("h"))
                            slowMode.addSlowMode(channel, commandAndArgs[1].slice(0, -1) * hour);
                        else if (commandAndArgs[1].endsWith("m"))
                            slowMode.addSlowMode(channel, commandAndArgs[1].slice(0, -1) * min);
                        else if (commandAndArgs[1].endsWith("s"))
                            slowMode.addSlowMode(channel, commandAndArgs[1].slice(0, -1) * sec);
                        else if (commandAndArgs[1].endsWith("ms"))
                            slowMode.addSlowMode(channel, commandAndArgs[1].slice(0, -2));
                        else
                            slowMode.addSlowMode(channel, commandAndArgs[1] * sec);

                        ok();
                    }
                } catch (e) {
                    message.reply("Erreur: " + e);
                }

            } else if (command === "setprotectedname") {
                if (commandAndArgs[1].startsWith("<@")) {
                    config.protectedNames.set(content.slice(21 + commandAndArgs[1].length), commandAndArgs[1].slice(2, -1));
                    saveConfig();
                    ok();
                } else {
                    message.reply("usage: setprotectedname <@user> <name>");
                }

            } else if (command === "setgame") {
                bot.user.setActivity(content.substring(11));
                message.reply("game set to " + content.substring(11));

            } else if (command === "maxwarns") {
                config.maxWarns = commandAndArgs[1];
                saveConfig();
                ok();

            } else if (command === "help") {
                message.reply(`voici mes commandes moderateur:

-warn <@user> [reason] : ajoute un warning a user. reason est inutile et sert juste a faire peur.
-spamtimeout <temps en ms> : Change la duree pendant laquelle deux messages identiques ne peuvent pas etre postes (default: 30s)
-slowmode <temps>[h/m/s/ms] (default: s) : cree ou modifie un slowmode dans le channel actuel.
-setprotectedname <@user> <name> : reserve un nom pour user. plusieurs noms par user possibles.
-setgame <game> : change la phrase de profil du bot.
-maxwarnings <number> : les utilisateurs seront mute apres number warns (default 3)`);
            }

        } else if (config.devs.includes(author.id)) {
            if (content === "hm reload") {
                loadConfig();
                message.reply("Reloaded config successfully.");

            } else if (content.startsWith("hm autogoulag ")) {
                config.autoGoulag = content.substring(14);
                saveConfig();
                ok();

            } else if (content === "hm config") {
                author.send("```" + JSON.stringify(config, null, 4) + "```");
                ok();

            } else if (content.startsWith("hm simon ")) {
                channel.send(content.substring(9));

            } else if (content === "hm update") {
                message.reply("Updating...");
                ok();
                WHL.update();
            }
        }
    }

    // Deleting "@everyone" made by random people
    if (content.includes("@everyone")
        && !hasRole(message.member, "Généraux", "Salade de fruits")) {
        warnMember(message.member);
        message.reply("Tu pense faire quoi, au juste? (warn)");
        message.delete()
            .catch(console.error);
    }

    let tally = content.charTally();
    let highestCount = Math.max(...Object.values(tally));

    if (!config.ignoredChannels.includes(channel.name) && !hasRole(member, "Généraux")) {
        let warn = "";

        if (slowMode.isPrevented(message)) {
            author.send("Le channel dans lequel vous essayez de parler est en slowmode, merci de patienter avant de poster à nouveau.")
                .catch(console.error);
            message.delete()
                .catch(console.error);

        } else if (content.length >= 1000) // Degager les messages de 1000+ chars
            warn = "Pavé césar, ceux qui ne vont pas lire te saluent!";

        else if (message.attachments.size === 0 && SM.isSpam(content))
            warn = "On se calme.";

        else if (content.length >= 20 && (highestCount + 1) / (message.content.length + 2) > 0.75)
            warn = "Stop spam, merci.";

        if (warn !== "") {
            warnMember(member);
            message.reply(warn + " (warn)");
            message.delete()
                .catch(console.error);
        }
    }
});
/* FIXME: config.protectednames apparently doesn't exist. commenting this out to stop crashing.
bot.on("guildMemberUpdate", (oldMember, newMember) => {
    if (newMember.nickname && oldMember.nickname !== newMember.nickname
        && config.protectedNames.get(newMember.nickname.toLowerCase())
        && config.protectedNames.get(newMember.nickname.toLowerCase()) !== newMember.id) {
        warnMember(newMember);
        newMember.setNickname("LE FAUX " + newMember.nickname, "Protected name.")
            .catch(console.error);
    }
});*/

bot.on("guildMemberAdd", member => {
    if (member.user.username.match(new RegExp(config.autoGoulag))) {
        member.addRole(getRole("GOULAG"));
        member.send(`Vous avez été mute sur le serveur Hentai Moutarde car nous avons des chances de penser que vous êtes un bot.
Si vous pensez qu'il s'agit d'une erreur, merci de contacter un membre avec le role **Généraux** ou **Salade de fruit**.

*You were muted on the Hentai Moutarde server, as there is a chance you are a bot.
If you think this is an error, please contact a member with the **Généraux** or **Salade de fruit** role.*`);
    }
});


bot.login(secrets.token); //Yes.
