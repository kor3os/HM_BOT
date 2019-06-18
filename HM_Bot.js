// Hello!
// This bot is being dev'd for the Discord server Hentai Moutarde at https://discord.gg/xX33Vkr
// It is an international Discord revolving around hentai (and more)
// If you plan on stealing this, please kindly go fuck yourself.

// Have any questions ? Go ask Koreos#7227 or PopahGlo#3995 over at HM!

const fs = require("fs");

// Launch the webhook listener
const secrets = require("./secrets.json");

const WHL = require("./webHookListener.js");

WHL.callback = function() {
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
let config, msgCount;
let hentaiMoutarde;

// Bot managers
const spamManager = require("./spammanager.js");
let SM = new spamManager.Manager(30000);

const slowModeManager = require("./slowmodemanager.js");
let slowMode = new slowModeManager.Manager();

// CONFIG

function loadJson(...names) {
    let arr = [];
    for (let name of names) {
        arr.push(JSON.parse(fs.readFileSync(name + ".json").toString()));
    }
    return (arr.length === 1 ? arr[0] : arr);
}

function saveJson(content, name, beautify = false) {
    let contentJson = (beautify ?
        JSON.stringify(content, null, 4) :
        JSON.stringify(content));
    fs.writeFileSync(name + ".json", contentJson, "utf-8");
}

// UTILITY

// Count the number of occurrences of each character in the string.
String.prototype.charTally = function charTally() {
    return this.split("").reduce((acc, char) => {
        acc[char] = (acc[char] || 0) + 1;
        return acc;
    }, {});
};

String.prototype.toMs = function(unit = "ms") {
    let t = parseInt(this.match(/([0-9]+)/)[1]);
    let u = this.match(/[0-9]+([a-z]*)/i)[1] || unit;

    return {ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000}[u] * t;
};

// Returns today's date
function today() {
    let d = new Date();
    return d.getDate() + "-" + (d.getMonth() + 1) + "-" + d.getFullYear();
}

// Test if member has one of the roles passed
const memberRole = (member, ...roles) => member.roles.find(role => roles.includes(role.name));

// Get a role from a guild
const getRole = name => hentaiMoutarde.roles.find(val => val.name === name);

function cleanUpColorRoles() {
    hentaiMoutarde.roles.filter(role => role.name.includes("dncolor") && role.members.size === 0)
        .forEach(role => role.delete());
}

// Warn a member and mute him if necessary
function warnMember(member) {
    console.log(`warning user ${member.user.username}`);

    // If he isn't warned, add him to the list
    if (!config.warns[member.toString()]) {
        config.warns[member.toString()] = 1;
    } else {
        config.warns[member.toString()] += 1;
        if (config.warns[member.toString()] >= config.maxWarns) {
            member.addRole(getRole("Muted"), "3rd warning")
                .catch(console.error);
            delete config.warns[member.toString()];
        }
    }
    saveJson(config, "config", true);
}

// Message count (Guide frénétique)
function updateMsgCount(member) {
    // Update date and shift counts if new day
    if (today() !== msgCount.date) {
        msgCount.date = today();

        for (let user in msgCount.users) {
            msgCount.users[user].counts.pop();
            msgCount.users[user].counts.unshift(0);

            // No messages in a month, delete entry
            if (msgCount.users[user].counts.reduce((n, a) => a + n, 0) === 0) {
                delete msgCount.users[user].counts;
            }
        }
    }

    // If user doesn't have an entry, make count array and set date
    if (msgCount.users[member.toString()] == null) {
        msgCount.users[member.toString()] = {
            counts: new Array(config.daysMsgCount).fill(0),
            lastMsg: Date.now()
        };
    } else {
        // Update last message date
        msgCount.users[member.toString()].lastMsg = Date.now();
    }

    // Add message to count and save
    msgCount.users[member.toString()].counts[0]++;

    saveJson(msgCount, "msgCount");

    // Remove/add role with total count
    let totalCount = msgCount.users[member.toString()].counts.reduce((n, a) => a + n, 0);

    // Give role to people above the treshold if they don't have it
    if (totalCount >= config.minMsgCount && !memberRole(member, "Guide frénétique"))
        member.addRole(getRole("Guide frénétique"));
    // Remove role from people under the treshold if they have it
    else if (totalCount < config.minMsgCount && memberRole(member, "Guide frénétique"))
        member.removeRole(getRole("Guide frénétique"));
}

// Get list of [user, score] sorted by score (descending)
function topUsers() {
    return Object.entries(msgCount.users)
        .map(e => [e[0], e[1].counts.reduce((a, b) => a + b, 0)])
        .sort((e1, e2) => e2[1] - e1[1]);
}

class Command {
    constructor(prefix, name, desc, fun, roles = [], users = [], warnUse = false) {
        this.prefix = (prefix === "u" ? config.prefixU : config.prefixM);
        this.name = name;
        this.desc = desc;
        this.fun = fun;
        this.roles = roles;
        this.users = users;
        this.warnUse = warnUse;
    }

    // Make help string from array of commands
    static makeHelp(arr) {
        return arr.reduce((a, com) => a + "\n• `" + com.prefix + com.name + " " + com.desc, "");
    }

    run(message) {
        // Get various useful stuff
        const {member, channel, mentions, content, author} = message;
        let args = content.substring(this.prefix.length).split(" ").slice(1);

        // If user has one of this.roles OR is in this.users OR both are empty ...
        if (memberRole(member, ...this.roles) || this.users.includes(author.id)
            || this.users.length === 0 && this.roles.length === 0) {
            // Run the command function. If return is truthy, react to the command for user feedback
            if (this.fun(member, channel, args, mentions, content, author, message))
                message.react("👌");
        } else if (this.warnUse) {
            let msg = "";
            if (this.roles.length === 0)
                msg = "Vous n'êtes pas autorisé à utiliser cette commande.";
            else if (this.roles.length === 1)
                msg = `Vous devez avoir le role ${this.roles[0]} pour utiliser cette commande.`;
            else
                msg = `Vous devez un des roles ${this.roles.join(" / ")} pour utiliser cette commande.`;

            channel.send(msg);
        }
    }
}

let commands;

function loadCommands() {
    commands = [
        new Command("u", "color",
            "<code_couleur/reset>` : Change la couleur de votre nom au code couleur choisi. (exemple: `" + config.prefixU + "color #FF4200`)",
            (member, channel, args) => {
                if (args.length === 1) {
                    // Find the user's color role if there is one
                    let role = member.roles.find(val => val.name.includes("dncolor"));

                    if (role) {
                        member.removeRole(role)
                            .catch(console.error);
                    }

                    // If reset is passed, simply clean up roles to remove it entirely
                    if (args[0] === "reset") {
                        cleanUpColorRoles();
                    } else {
                        role = getRole("dncolor" + args[0]);

                        // If role exists, give it to the user
                        if (role) {
                            member.addRole(role);
                        } else {
                            // Else create role add then give it to the user
                            hentaiMoutarde.createRole({
                                    name: "dncolor" + args[0],
                                    color: args[0],
                                    hoist: false,
                                    position: memberRole(member, "Donateur").position + 1, // 1 above "Donateur" role
                                    mentionable: false
                                })
                                .then(role => member.addRole(role)
                                    .then(() => cleanUpColorRoles())
                                    .catch(console.error))
                                .catch(console.error);
                        }
                    }
                    return true;
                } else {
                    // Wrong usage of the command
                    channel.send(member.toString() + ", exemple: `color #FF4200`");
                }
            }, ["Donateur"], [], true),

        new Command("u", "top",
            "[page]` : Affiche le top de score (nombre de message) sur les " + config.daysMsgCount + " derniers jours.",
            (member, channel, args) => {
                // Get page number
                let page = args[1] != null && args[1].match(/^[0-9]+$/) ?
                    parseInt(args[1]) : 1;

                let pageN = (page - 1) * 10;
                let top = topUsers().slice(pageN, pageN + 10);

                if (top.length > 0) {
                    // Reduce array to build string with top
                    let topStr = top.reduce((s, e, i) => {
                        let user = bot.users.get(e[0].match(/[0-9]+/)[0]);
                        // Format string as "#Rank Username           Score" with padding + cutting
                        return s + "\n" +
                            ("#" + (i + pageN + 1)).padEnd(5) + " " +
                            (user != null ? user.username.padEnd(18).slice(0, 18) : "[membre inconnu]  ") + " " +
                            e[1];
                    }, "");

                    channel.send("```js" + topStr + "```");
                } else {
                    // Page too far, no users
                    channel.send(`Personne dans le top à la page ${page}`);
                }
            }),

        new Command("u", "score",
            "[mention]` : Affiche les infos relatives au score d'un utilisateur (vous par défaut).",
            (member, channel, args, mentions) => {
                // First mention, or by default the user sending the message
                let user = (mentions.members.size > 0 ? mentions.members.array()[0] : member);
                let usrData = msgCount.users[user];

                if (usrData != null) {
                    // Get various stats from user data
                    let rank = topUsers().map(e => e[0]).indexOf(user.toString()) + 1,
                        tot = usrData.counts.reduce((a, b) => a + b, 0),
                        avg = Math.round(tot / usrData.counts.length * 100) / 100,
                        max = usrData.counts.reduce((a, b) => (a > b ? a : b), 0);

                    channel.send({
                        embed: new Discord.RichEmbed()
                            .setColor(16777067)
                            .setTitle(`Score de ${user.user.tag} (${config.daysMsgCount} jours)`)
                            .setDescription(`Rang d'utilisateur : **#${rank}**\nNombre total de messages : **${tot}**\nMoyenne de messages par jour : **${avg}**\nMaximum de messages en un jour : **${max}**`)
                    });
                } else {
                    channel.send(`Pas de données pour l'utilisateur ${user.user.tag}`);
                }
            }),

        new Command("u", "help",
            "` : Affiche ce message d'aide.",
            (member, channel) => {
                channel.send({
                    embed: new Discord.RichEmbed()
                        .setColor(16777067)
                        .addField("Commandes utilisateur",
                            Command.makeHelp(commands.filter(com => com.prefix === config.prefixU && com.roles.length === 0)))
                        .addField("Commandes donateur",
                            Command.makeHelp(commands.filter(com => com.roles.length === 1 && com.roles[0] === "Donateur")))
                });
            }),

        new Command("m", "setgame",
            "<game>` : Change la phrase de statut du bot.",
            (member, channel, args) => {
                bot.user.setActivity(args[0]);
                return true;
            }, ["Généraux", "Salade de fruits"]),

        new Command("m", "warn",
            "<@user> [reason]` : Ajoute un warning a user. Reason est inutile et sert juste a faire peur.",
            (member, channel, args, mentions) => mentions.members.forEach(warnMember),
            ["Généraux", "Salade de fruits"]),

        new Command("m", "slowmode",
            "<temps>[h/m/s/ms]` (default: s) : Crée ou modifie un slowmode dans le channel actuel.",
            (member, channel, args) => {
                try {
                    // If first arg is 0, remove slowmode
                    if (args[0] === "0")
                        slowMode.removeSlowMode(channel);
                    // Else, if it is a well structured time, add slow mode with this time
                    else if (args[0].match(/^[0-9]+(m?s|m|h)?$/))
                        slowMode.addSlowMode(args[0].toMs("s"));
                    // Else throw exception to show error
                    else
                        throw "";
                    return true;
                } catch (e) {
                    channel.send("Erreur d'affectation du slowmode.");
                }
            }, ["Généraux", "Salade de fruits"]),

        new Command("m", "spamtimeout",
            "<temps>[h/m/s/ms]` : Change la duree pendant laquelle deux messages identiques ne peuvent pas etre postés (default: 30s)",
            (member, channel, args) => {
                try {
                    SM.changeTimeout(args[0].toMs());
                    return true;
                } catch (e) {
                    channel.send("Erreur d'affectation du timeout");
                }
            }, ["Généraux", "Salade de fruits"]),

        new Command("m", "setprotectedname",
            "<@user> <name>` : Réserve un nom pour user. Plusieurs noms par user possibles.",
            (member, channel, args) => {
                if (args[0].startsWith("<@")) {
                    config.protectedNames.set(content.slice(21 + args[0].length), args[0].slice(2, -1));
                    saveJson(config, "config", true);
                    return true;
                } else {
                    channel.send("Exemple : " + config.prefixM + "setprotectedname <@user> <name>");
                }
            }, ["Généraux", "Salade de fruits"]),

        new Command("m", "reload",
            "` : Recharge le fichier de config.",
            () => {
                config = loadJson("config");
                return true;
            }, [], config.devs),

        new Command("m", "autogoulag",
            "` : Change la regex de goulag automatique au join.",
            (member, channel, args) => {
                config.autoGoulag = args[0];
                saveJson(config, "config", true);
                return true;
            }, [], config.devs),

        new Command("m", "config",
            "` : Envoie le fichier de config.",
            (member) => {
                // Send beautified JSON with syntax highlighting
                member.send("```json\n" + JSON.stringify(config, null, 4) + "```");
                return true;
            }, [], config.devs),

        new Command("m", "reload",
            "` : Update le bot.",
            () => {
                WHL.update();
                return true;
            }, [], config.devs),

        new Command("m", "help",
            "` : Affiche ce message d'aide.",
            (member, channel) => {
                channel.send({
                    embed: new Discord.RichEmbed()
                        .setColor(16777067)
                        .addField("Commandes modérateur",
                            Command.makeHelp(commands.filter(com => com.prefix === config.prefixM && com.roles.length === 2)))
                        .addField("Commandes développeur",
                            Command.makeHelp(commands.filter(com => com.prefix === config.prefixM && com.users.length === config.devs.length)))
                });
            }, ["Généraux", "Salade de fruits"], config.devs)
    ];
}

let bumpChannel;

function dlmBump() {
    // If bump channel exists (useful for testing purposes)
    if (bumpChannel) {
        // Bump, and call recursively with a slightly random timeout (9h + (0-5 min))
        bumpChannel.send("dlm!bump");
        setTimeout(dlmBump, "9h".toMs() + (Math.random() * "5m".toMs()));
    }
}

// Runs on bot start
bot.once("ready", () => {
    console.log(`Bot started ! ${bot.users.size} users.`);
    bot.user.setActivity("twitter.com/hentaimoutarde");

    // Load configuration files
    [config, msgCount] = loadJson("config", "msgCount");

    // Get server and load all bot commands
    hentaiMoutarde = bot.guilds.get(config.server);
    loadCommands();

    // Get bump channel and bump
    bumpChannel = bot.channels.get("311496070074990593");
    dlmBump();
});

// Message handling
bot.on("message", message => {
    const {author, member, channel, content} = message;

    // Ignore bot commands and private messages
    if (author.bot || channel.type !== "text") return;

    if (!config.ignoredCount.includes(channel.name)
        && (msgCount.users[member.toString()] == null
            || Date.now() >= msgCount.users[member.toString()].lastMsg + config.msgDelay)) {
        updateMsgCount(member);
    }

    // Run message as command, if it exactly matches a command name (case insensitive)
    for (let com of commands) {
        if (content.toLowerCase().startsWith(com.prefix + com.name)) {
            com.run(message);
            break;
        }
    }

    // Delete @everyone sent by random people
    if (content.includes("@everyone")
        && !memberRole(member, "Généraux", "Salade de fruits")) {
        warnMember(member);
        channel.send(member.toString() + "\n" +
            "Le @​everyone est réservé aux admins ! N'essayez pas de l'utiliser.\n" +
            "*@​everyone is reserved for admins! Don't try to use it.*");
        message.delete()
            .catch(console.error);
    }

    // Count chars and get most used one
    let tally = content.charTally();
    let highestCount = Math.max(...Object.values(tally));

    if (!config.ignoredWarn.includes(channel.name) && !memberRole(member, "Généraux")) {
        let warn = "";

        if (slowMode.isPrevented(message)) {
            author.send("Le channel dans lequel vous essayez de parler est en slowmode, merci de patienter avant de poster à nouveau.")
                .catch(console.error);
            message.delete()
                .catch(console.error);

        }
        // Messages with more than 1000 chars
        else if (content.length >= 1000)
            warn = "Merci de limiter vos pavés ! Utilisez #spam-hell-cancer pour vos copypastas. (warn)\n" +
                "*Please avoid walls of text! Use #spam-hell-cancer for copypastas. (warn)*";

        // Messages which have been sent multiple times
        else if (message.attachments.size === 0 && SM.isSpam(content))
            warn = "Prévention anti-spam - ne vous répétez pas. (warn)\n" +
                "*Spam prevention - don't repeat yourself. (warn)*";

        // Messages with a repeating char for 3/4 of it
        else if (content.length >= 20 && (highestCount + 1) / (message.content.length + 2) > 0.75)
            warn = "Prévention anti-flood - ne vous répétez pas. (warn)\n" +
                "*Flood prevention - don't repeat yourself. (warn)*";

        // If any of these has been found, warn the user and delete the message
        if (warn !== "") {
            warnMember(member);
            channel.send(member.toString() + "\n" + warn);
            message.delete()
                .catch(console.error);
        }
    }
});

bot.on("guildMemberUpdate", (oldMember, newMember) => {
    // If member changed nickname and it is a protected one, warn & rename him
    if (newMember.nickname && oldMember.nickname !== newMember.nickname
        && config.protectedNames[newMember.nickname.toLowerCase()]
        && config.protectedNames[newMember.nickname.toLowerCase()] !== newMember.id) {
        warnMember(newMember);
        newMember.setNickname("LE FAUX " + newMember.nickname, "Protected name.")
            .catch(console.error);
    }
});

bot.on("guildMemberAdd", member => {
    // If username matches the "auto goulag" regex, add the GOULAG role and send him a pm in case of error
    if (member.user.username.match(new RegExp(config.autoGoulag))) {
        member.addRole(getRole("GOULAG"));
        member.send("Vous avez été mute sur le serveur Hentai Moutarde car nous avons des chances de penser que vous êtes un bot.\n" +
            "Si vous pensez qu'il s'agit d'une erreur, merci de contacter un membre avec le role **Généraux** ou **Salade de fruit**.\n" +
            "\n*You were muted on the Hentai Moutarde server, as there is a chance you are a bot.\n" +
            "If you think this is an error, please contact a member with the **Généraux** or **Salade de fruit** role.*");
    }
});

bot.login(secrets.token);
