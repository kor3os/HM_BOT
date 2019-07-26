// Hello!
// This bot is being dev'd for the Discord server Hentai Moutarde at https://discord.gg/xX33Vkr
// It is an international Discord revolving around hentai (and more)
// If you plan on stealing this, please kindly go fuck yourself.

// Have any questions ? Go ask Koreos#7227 or PopahGlo#3995 over at HM!

const fs = require("fs");
const secrets = require("./secrets.json");

// Launch the webhook listener
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
        arr.push(JSON.parse(fs.readFileSync(name + ".json").toString()
            .replace(/ /g, "¤")
            .replace(/\s*/g, "")
            .replace(/¤/g, " ")));
    }
    return (arr.length === 1 ? arr[0] : arr);
}

function saveJson(content, name, beautify = false) {
    let contentJson = (beautify ?
        JSON.stringify(content, null, 4) :
        JSON.stringify(content));
    fs.writeFileSync(name + ".json", contentJson, "utf-8");
}

function saveConfig() {
    saveJson(config, "config", true);
}

// UTILITY

// Count the number of occurrences of each character in the string.
String.prototype.charTally = function charTally() {
    return this.split("").reduce((acc, char) => {
        acc[char] = (acc[char] || 0) + 1;
        return acc;
    }, {});
};

const units = {
    "ms": 1,
    "s(ec(onde?)?s?)": 1000,
    "m(in(ute)?s?)?": 60000,
    "h((our|eure)s?)?": 3600000,
    "(d(ays?)?|j(ours?)?)": 86400000
};

String.prototype.toMs = function(unit = "ms") {
    let t = parseInt(this.match(/([0-9]+)/)[1]);
    let u = this.match(/[0-9]+([a-z]*)/i)[1] || unit;

    for (let regex in units) {
        if (u.match(new RegExp("^" + regex + "$")))
            return t * units[regex];
    }
    return 0;
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

function cleanupColorRoles() {
    hentaiMoutarde.roles.filter(role => role.name.includes("dncolor") && role.members.size === 0)
        .forEach(role => role.delete());
}

function cleanupTempActions() {
    config.tempActions = config.tempActions.filter(action => action[2] > Date.now());
    saveConfig();
}

// Warn a member and mute him if necessary
function warnMember(member, reason = "") {
    console.log(`warning user ${member.user.username}`);

    // If he isn't warned, create an entry with one reason
    if (!config.warns[member.toString()]) {
        config.warns[member.toString()] = [reason];
    } else {
        // Else add a new warn reason
        config.warns[member.toString()].push(reason);
        // Mute user if above warn threshold
        let nWarns = config.warns[member.toString()].length;
        if (nWarns > 0
            && nWarns % config.maxWarns === 0
            && !memberRole(member, "Muted")) {
            member.addRole(getRole("Muted"), "3rd warning")
                .catch(console.error);
        }
    }
    saveConfig();
}

// Message count (Guide frénétique)
function updateMsgCount(member) {
    // Update date and shift counts if new day
    if (today() !== msgCount.date) {
        msgCount.date = today();

        for (let user in msgCount.users) {
            msgCount.users[user].counts.pop();
            msgCount.users[user].counts.unshift(0);

            let total = msgCount.users[user].counts.reduce((n, a) => a + n, 0);

            // No messages in a month, delete entry
            if (total === 0) {
                delete msgCount.users[user];
            } else if (total < config.minMsgCount && memberRole(member, "Guide frénétique")) {
                member.removeRole(getRole("Guide frénétique"));
            }
        }
    }

    // If user doesn't have an entry, make count array and set date
    if (msgCount.users[member.user.id] == null) {
        msgCount.users[member.user.id] = {
            counts: new Array(config.daysMsgCount).fill(0),
            lastMsg: Date.now()
        };
    } else {
        // Update last message date
        msgCount.users[member.user.id].lastMsg = Date.now();
    }

    // Add message to count and save
    msgCount.users[member.user.id].counts[0]++;

    saveJson(msgCount, "msgCount");

    // Remove/add role with total count
    let totalCount = msgCount.users[member.user.id].counts.reduce((n, a) => a + n, 0);

    // Give role to people above the treshold (and who joined at least 30 days ago) if they don't have it
    if (totalCount >= config.minMsgCount
        && !memberRole(member, "Guide frénétique")
        && Date.now() > member.joinedTimestamp + "30d".toMs())
        member.addRole(getRole("Guide frénétique"));
    // Remove role from people under the treshold if they have it
    else if (totalCount < config.minMsgCount
        && memberRole(member, "Guide frénétique"))
        member.removeRole(getRole("Guide frénétique"));
}

// Get list of [user, score] sorted by score (descending)
function topUsers() {
    return Object.entries(msgCount.users)
        .map(e => [e[0], e[1].counts.reduce((a, b) => a + b, 0)])
        .sort((e1, e2) => e2[1] - e1[1]);
}

class MoutardeEmbed extends Discord.RichEmbed {
    constructor() {
        super().setColor(16777067);
    }

    addHelpFields(name, commands) {
        let fields = [""],
            i = 0;

        for (let com of commands) {
            if ((fields[i] + "\n" + com.helpString).length > 1024) {
                fields.push("");
                i++;
            }
            fields[i] = fields[i] + "\n" + com.helpString;
        }

        for (let field of fields) {
            this.addField(name, field);
            name = "…";
        }

        return this;
    }
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

    get helpString() {
        return "• `" + this.prefix + this.name + " " + this.desc;
    }

    run(message) {
        // Get various useful stuff
        const {member, channel, content, author} = message;
        // Get args separated by spaces
        let args = content.substring(this.prefix.length).split(" ").slice(1);

        // Get member argument (depending on the message, mostly first argument parsed)
        let memberArg;

        // If there are mentions, get first mention
        if (message.mentions.users.size > 0)
            memberArg = message.mentions.members.first();
        else if (args[0] != null) {
            // Else if the first argument is numbers, treat it as an id
            if (args[0].match(/^[0-9]+$/))
                memberArg = hentaiMoutarde.members.get(args[0]);
            // Else, find a user with an username matching perfectly the first arg...
            else if (args[0])
                memberArg = hentaiMoutarde.members.find(mem => mem.user.username.toLowerCase() === args[0].toLowerCase()
                    || mem.user.tag === args[0] || (mem.nickname && mem.nickname.toLowerCase() === args[0].toLowerCase()));

            // ... or one that contains the first arg.
            if (memberArg == null)
                memberArg = hentaiMoutarde.members.find(mem => mem.user.username.toLowerCase().includes(args[0].toLowerCase()) ||
                    (mem.nickname && mem.nickname.toLowerCase().includes(args[0].toLowerCase())));
        }

        // If user has one of this.roles OR is in this.users OR both are empty ...
        if (memberRole(member, ...this.roles) || this.users.includes(author.id)
            || this.users.length === 0 && this.roles.length === 0) {
            // Run the command function. If return is truthy, react to the command for user feedback
            if (this.fun(member, channel, args, memberArg, content, author, message) === true)
                message.react("587024299639046146"); // :MoutardeKemono:
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

const modRoles = ["Généraux", "Salade de fruits"];

class ModAction extends Command {
    constructor(name, desc, fun, timed = false) {
        super("m", name, "<@user|user_id> " + (timed ? "<time> " : "") + " [raison]` : " + desc,
            async (member, channel, args, memberArg) => {
                if (memberArg != null) {
                    let time, i = 1;
                    if (timed) {
                        time = args[1].toMs();
                        i++;
                    }
                    let reason = args.slice(i).join(" ");

                    await fun(memberArg, reason, time);
                    channel.send(`**${memberArg.user.tag}** a été ${name} `
                        + (reason ? `pour la raison "${reason}."` : "sans raison explicite."));
                }
            }, modRoles);
    }
}

let commands;

function loadCommands() {
    commands = [
        new Command("u", "pap",
            "` : Remercie pap.",
            (member, channel) => {
                config.pap++;
                saveConfig();

                channel.send({
                    embed: new MoutardeEmbed()
                        .setTitle(`${member.nickname || member.user.username} remercie pap !`)
                        .setDescription(`Pap a été remercié ${config.pap} fois.`)
                });
            }),

        new Command("u", "color",
            `<code_couleur/reset>\` : Change la couleur de votre nom au code couleur choisi. (exemple: \`${config.prefixU}color #FF4200\`)`,
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
                        cleanupColorRoles();
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
                                    .then(() => cleanupColorRoles())
                                    .catch(console.error))
                                .catch(console.error);
                        }
                    }
                    return true;
                } else {
                    // Wrong usage of the command
                    channel.send("Exemple : `color #FF4200`");
                }
            }, ["Donateur"], [], true),

        new Command("u", "top",
            `[page]\` : Affiche le top de score (nombre de message) sur les ${config.daysMsgCount} derniers jours.`,
            (member, channel, args) => {
                // Get page number
                let page = args[0] != null && args[0].match(/^[0-9]+$/) ?
                    parseInt(args[0]) : 1;

                let pageN = (page - 1) * 10;
                let top = topUsers().slice(pageN, pageN + 10);

                if (top.length > 0) {
                    // Reduce array to build string with top
                    let topStr = top.reduce((s, e, i) => {
                        let user = bot.users.get(e[0].match(/[0-9]+/)[0]);
                        // Format string as "#Rank Username           Score" with padding + cutting
                        return s + "\n" +
                            ("#" + (i + pageN + 1)).padEnd(5) + " " +
                            (user != null ? user.username.replace("'","").padEnd(18).slice(0, 18) : "[membre inconnu]  ") + " " +
                            e[1];
                    }, "");

                    channel.send("```js" + topStr + "```");
                } else {
                    // Page too far, no users
                    channel.send(`Personne dans le top à la page ${page}`);
                }
            }),

        new Command("u", "score",
            "[@user]` : Affiche les infos relatives au score d'un utilisateur (vous par défaut).",
            (member, channel, args, memberArg) => {
                // By default the user sending the message
                if (memberArg == null) memberArg = member;
                let usrData = msgCount.users[memberArg.user.id];

                if (usrData != null) {
                    // Get various stats from user data
                    let rank = topUsers().map(e => e[0]).indexOf(memberArg.user.id) + 1,
                        tot = usrData.counts.reduce((a, b) => a + b, 0),
                        avg = Math.round(tot / usrData.counts.length * 100) / 100,
                        last = usrData.counts[0];

                    channel.send({
                        embed: new MoutardeEmbed()
                            .setTitle(`Score de ${memberArg.user.tag} (${config.daysMsgCount} jours)`)
                            .setDescription(`Rang d'utilisateur : **#${rank}**\nNombre total de messages : **${tot}**\nMoyenne de messages par jour : **${avg}**\nMessages du jour : **${last}**`)
                    });
                } else {
                    channel.send(`Pas de données pour l'utilisateur ${memberArg.user.tag}`);
                }
            }),

        new Command("u", "help",
            "` : Affiche ce message d'aide.",
            (member, channel) => {
                channel.send({
                    embed: new MoutardeEmbed()
                        .addHelpFields("Commandes utilisateur",
                            commands.filter(com => com.prefix === config.prefixU && com.roles.length === 0))
                        .addHelpFields("Commandes donateur",
                            commands.filter(com => com.roles.length === 1 && com.roles[0] === "Donateur"))
                });
            }),

        new Command("m", "setgame",
            "<game>` : Change la phrase de statut du bot.",
            (member, channel, args) => {
                bot.user.setActivity(args[0]);
                config.game = args[0];
                saveConfig();
                return true;
            }, ["Généraux", "Salade de fruits"]),

        new Command("m", "warns",
            "<@user>` : Affiche les warns d'un utilisateur.",
            async (member, channel, args, memberArg) => {
                if (memberArg != null) {
                    if (config.warns[memberArg] != null) {
                        channel.send({
                            embed: new MoutardeEmbed()
                                .setTitle(`Warns de l'utilisateur ${memberArg.user.tag}`)
                                .setDescription(config.warns[memberArg].map(reason => "• " + (reason || "Aucune raison")).join("\n"))
                                .setFooter(memberArg.user.id, memberArg.user.avatarURL)
                        });
                    } else {
                        channel.send(`Aucun warns pour l'utilisateur ${memberArg.user.tag}`);
                    }
                } else {
                    channel.send(`Exemple : ${config.prefixM}warns Dont#9718`);
                }
            }, modRoles),

        new ModAction("warn", "Ajoute un warning a user, avec la raison [raison].",
            warnMember),

        new ModAction("mute", "Mute un user pendant [temps].",
            async (memberArg, reason, time) => {
                config.tempActions.push(["mute", memberArg.user.id, Date.now() + time]);
                saveConfig();
                await memberArg.addRole(getRole("GOULAG"));
                // Remove role after [time] ms
                setInterval(() => {
                    memberArg.removeRole(getRole("GOULAG"));
                    cleanupTempActions();
                }, time);
            }, true),

        new ModAction("unmute", "Démute un utilisateur.",
            async (memberArg) => {
                // Remove unmute action
                config.tempActions = config.tempActions.filter(action => action[0] === "mute" && action[1] === memberArg.user.id);
                saveConfig();

                memberArg.removeRole(getRole("GOULAG"));
            }),

        new ModAction("kick", "Kick un utilisateur.",
            async (memberArg, reason) => await memberArg.kick(reason)),

        new ModAction("softban", "Ban, puis déban tout de suite un utilisateur. Supprime un jour de messages.",
            async (memberArg, reason) =>
                await memberArg.ban({days: 1, reason})
                    .then(member => hentaiMoutarde.unban(member))),

        new ModAction("tempban", "Ban un utilisateur pendant un certain temps. Supprime un jour de messages.",
            async (memberArg, reason, time) => {
                config.tempActions.push(["ban", memberArg.user.id, Date.now() + time]);
                saveConfig();
                await memberArg.ban({days: 1, reason});
                setInterval(() => {
                    hentaiMoutarde.unban(memberArg);
                    cleanupTempActions();
                }, time);
            }, true),

        new ModAction("ban", "Ban un utilisateur, et supprime 1 jour de messages.",
            async (memberArg, reason) => {
                await memberArg.ban({days: 1, reason});
                config.tempActions = config.tempActions.filter(action => action[1] === memberArg.user.id);
                saveConfig();
            }),

        new Command("m", "unban",
            "Déban un utilisateur.",
            async (member, channel, args) => {
                let user = bot.users.get(args[0]),
                    reason = args.slice(1).join(" ");

                config.tempActions = config.tempActions.filter(action => action[0] === "ban" && action[1] === memberArg.user.id);
                saveConfig();

                await hentaiMoutarde.unban(args[0]);
                channel.send(`**${user ? user.tag : args[0]}** a été unban `
                    + (reason ? `pour la raison "${reason}."` : "sans raison explicite."));
            }),

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
            }, modRoles),

        new Command("m", "spamtimeout",
            "<temps>[h/m/s/ms]` : Change la duree pendant laquelle deux messages identiques ne peuvent pas etre postés (default: 30s)",
            (member, channel, args) => {
                try {
                    SM.changeTimeout(args[0].toMs());
                    return true;
                } catch (e) {
                    channel.send("Erreur d'affectation du timeout");
                }
            }, modRoles),

        new Command("m", "setprotectedname",
            "<@user> <nom>` : Réserve un nom pour user. Plusieurs noms par user possibles.",
            (member, channel, args) => {
                if (args[0].startsWith("<@")) {
                    config.protectedNames[content.slice(21 + args[0].length)] = args[0].slice(2, -1);
                    saveConfig();
                    return true;
                } else {
                    channel.send(`Exemple : ${config.prefixM}setprotectedname <@user> <name>`);
                }
            }, modRoles),

        new Command("m", "welcome",
            "<message>` : Change le message de bienvenue. Possibilité d'utiliser " +
            "[mention] pour insérer une mention du nouvel utilisateur et [pseudo] pour insérer son pseudo.",
            (member, channel, args) => {
                config.welcome = args.join(" ");
                saveConfig();
                return true;
            }, modRoles),

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
                saveConfig();
                return true;
            }, [], config.devs),

        new Command("m", "config",
            "` : Envoie le fichier de config.",
            async (member) => {
                // Send beautified JSON with syntax highlighting
                await member.send("```json\n" + JSON.stringify(config, null, 4) + "```");
                return true;
            }, [], config.devs),

        new Command("m", "restart",
            "` : Update le bot.",
            () => {
                WHL.update();
                return true;
            }, [], config.devs),

        new Command("m", "help",
            "` : Affiche ce message d'aide.",
            (member, channel) => {
                channel.send({
                    embed: new MoutardeEmbed()
                        .addHelpFields("Commandes modérateur",
                            commands.filter(com => com.prefix === config.prefixM && com.roles.length === 2))
                        .addHelpFields("Commandes développeur",
                            commands.filter(com => com.prefix === config.prefixM && com.users.length === config.devs.length))
                });
            }, modRoles, config.devs)
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

    // Load configuration files
    [config, msgCount] = loadJson("config", "msgCount");
    bot.user.setActivity(config.game);

    // Get server and load all bot commands
    hentaiMoutarde = bot.guilds.get(config.server);
    loadCommands();

    // Get bump channel and bump
    bumpChannel = bot.channels.get("311496070074990593");
    dlmBump();

    // Load timeouts for temporary mod actions
    config.tempActions.forEach(action => {
        let fun;

        if (action[0] === "ban")
            fun = () => hentaiMoutarde.unban(action[1]);
        else if (action[0] === "mute")
            fun = () => {
                let mem = hentaiMoutarde.members.get(action[1]);
                if (mem) mem.removeRole(getRole("GOULAG"));
            };

        // If time has passed, run straight away
        if (action[2] <= Date.now()) {
            fun();
            cleanupTempActions();
        } else {
            // Else set a timeout
            setTimeout(() => {
                fun();
                cleanupTempActions();
            }, action[2] - Date.now());
        }
    });
});

// Message handling
bot.on("message", message => {
    const {author, member, channel, content} = message;

    // Ignore bot and private messages
    if (author.bot || channel.type !== "text") return;

    if (!config.ignoredCount.includes(channel.name)
        && (msgCount.users[member.user.id] == null
            || Date.now() >= msgCount.users[member.user.id].lastMsg + config.msgDelay)) {
        updateMsgCount(member);
    }

    // Run message as command, if it exactly matches a command name (case insensitive)
    for (let com of commands) {
        if (content.toLowerCase() === com.prefix + com.name
            || content.toLowerCase().startsWith(com.prefix + com.name + " ")) {
            com.run(message);
            break;
        }
    }

    let warnMsg = "", reason = "";

    if (!memberRole(member, "Généraux", "Salade de fruits")) {
        if (content.includes("@everyone")) {
            // Delete @everyone sent by random people (in every channel)
            warnMsg = "Le @​everyone est réservé aux admins ! N'essayez pas de l'utiliser.\n" +
                "*@​everyone is reserved for admins! Don't try to use it.*";
            reason = "Message contenant @​everyone";
        } else if (content.match(/discord\.gg\/[^ ]+/)) {
            // Delete discord invitation links and mute user
            reason = "Invitation discord";
            member.addRole(getRole("GOULAG"));
        }

        // Count chars and get most used one
        let tally = content.charTally();
        let highestCount = Math.max(...Object.values(tally));

        if (!config.ignoredWarn.includes(channel.name)) {
            if (slowMode.isPrevented(message)) {
                author.send("Le channel dans lequel vous essayez de parler est en slowmode, merci de patienter avant de poster à nouveau.")
                    .catch(console.error);
                message.delete()
                    .catch(console.error);
            }
            // Messages with more than 1000 chars
            else if (content.length >= 1000) {
                warnMsg = "Merci de limiter vos pavés ! Utilisez #spam-hell-cancer pour vos copypastas. (warn)\n" +
                    "*Please avoid walls of text! Use #spam-hell-cancer for copypastas. (warn)*";
                reason = "Message > 1000 caractères";
            }
            // Messages which have been sent multiple times
            else if (message.attachments.size === 0 && SM.isSpam(content)) {
                warnMsg = "Prévention anti-spam - ne vous répétez pas. (warn)\n" +
                    "*Spam prevention - don't repeat yourself. (warn)*";
                reason = "Message spam";
            }
            // Messages with a repeating char for 3/4 of it
            else if (content.length >= 20 && (highestCount + 1) / (message.content.length + 2) > 0.75) {
                warnMsg = "Prévention anti-flood - ne vous répétez pas. (warn)\n" +
                    "*Flood prevention - don't repeat yourself. (warn)*";
                reason = "Message avec répétition";
            }
        }
    }

    // If any of these has been found, warn the user and delete the message
    if (reason !== "") {
        warnMember(member, reason);
        if (warnMsg !== "")
            channel.send(member.toString() + "\n" + warnMsg);
        message.delete()
            .catch(console.error);
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
    } else {
        bot.channels.get("295533374016192514").send(
            config.welcome
                .replace(/\[mention]/gi, member.toString())
                .replace(/\[pseudo]/gi, member.user.username)
                .replace(/#([a-z\-_]+)/g, (_, name) => hentaiMoutarde.channels.find(chan => chan.name === name).toString())
        );
        member.addRole(getRole("secte nsfw"));
    }
});

bot.login(secrets.token);
