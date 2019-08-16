// Hello!
// This bot is being dev'd for the Discord server Hentai Moutarde at https://discord.gg/xX33Vkr
// It is an international Discord revolving around hentai (and more)
// If you plan on stealing this, please kindly go fuck yourself.

// Have any questions ? Go ask Koreos#7227 or PopahGlo#3995 over at HM!

const fs = require("fs");
const secrets = require("./secrets.json");

const graph = require("./graph");

const {hammingDistance} = require("blockhash");
const {imageHash} = require("image-hash");

// Discord library and client
const Discord = require("discord.js");
const bot = new Discord.Client();

// Bot configuration
let config, msgCount, duplicates;

// Static channels
let hentaiMoutarde, bumpChannel, modLogs;

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
            && !memberRole(member, "GOULAG")) {
            member.addRole(getRole("GOULAG"), "3rd warning")
                .catch(console.error);

            sendLog({action: "mute", member, reason: "3ème warn"});
        }
    }
    saveConfig();
}

// Send a log message to #modlogs
function sendLog(obj) {
    let {channel, member, reason, mod, action} = obj;

    let title = obj.customTitle ? obj.title :
        (member ? `**${member.user.tag}** a été **${action}**` : action);
    let desc = obj.customDesc ? obj.desc :
        (mod || "") + (channel ? " dans " + channel : "") + (reason ? "\n*" + reason + "*" : "");

    let embed = new MoutardeEmbed()
        .setTitle(title.trim())
        .setDescription(desc.trim())
        .setTimestamp();

    if (member)
        embed.setThumbnail(member.user.displayAvatarURL)
            .setFooter(member.user.id);

    modLogs.send({embed});
}

// Get score a user needs to get Guide frénétique
function scoreGoal(member) {
    let goal = config.minMsgCount;

    for (let roleId of member.roles.keyArray()) {
        if (config.bonusRoles.includes(roleId))
            goal -= 50;
    }

    return goal;
}

function shiftMessageCounts() {
    for (let user in msgCount) {
        if (msgCount.hasOwnProperty(user)) {
            msgCount[user].counts.pop();
            msgCount[user].counts.unshift(0);

            let total = msgCount[user].counts.reduce((n, a) => a + n, 0);

            // No messages in a month, delete entry
            if (total === 0)
                delete msgCount[user];
        }
    }
}

// Message count (Guide frénétique)
function updateMsgCount(member) {
    let goal = scoreGoal(member);

    // If user doesn't have an entry, make count array and set date
    if (msgCount[member.user.id] == null) {
        msgCount[member.user.id] = {
            counts: new Array(config.daysMsgCount).fill(0),
            lastMsg: Date.now()
        };
    } else {
        // Update last message date
        msgCount[member.user.id].lastMsg = Date.now();
    }

    // Add message to count and save
    msgCount[member.user.id].counts[0]++;

    saveJson(msgCount, "msgCount");

    // Remove/add role with total count
    let totalCount = msgCount[member.user.id].counts.reduce((n, a) => a + n, 0);

    if (totalCount >= goal
        && !memberRole(member, "Guide frénétique")
        && Date.now() > member.joinedTimestamp + "30d".toMs()) {
        // Give role to people above the treshold (and who joined at least 30 days ago) if they don't have it
        member.addRole(getRole("Guide frénétique")).catch(err => {});
        /* TODO: Fix welcome message
        Temp disable of the welcome message because obviously bugged
        // Welcome message in #les-bg-pas-pd
        const lesbg = bot.channels.get("590507964280995859");
        lesbg.send(`Bienvenue dans ${lesbg}, ${member}.`);
        */
    } else if (totalCount < goal
        && memberRole(member, "Guide frénétique")) {
        // Remove role from people under the treshold if they have it
        member.removeRole(getRole("Guide frénétique"));
    }
}

// Get list of [user, score] sorted by score (descending)
function topUsers() {
    return Object.entries(msgCount)
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

                    sendLog({action: name, member: {user: memberArg.user}, reason: reason || "Aucune raison", mod: member, channel});
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
                            (user != null ? user.username.replace("'", "’").padEnd(18).slice(0, 18) : "[membre inconnu]  ") + " " +
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
                let usrData = msgCount[memberArg.user.id];

                if (usrData != null) {
                    // Get various stats from user data
                    let rank = topUsers().map(e => e[0]).indexOf(memberArg.user.id) + 1,
                        tot = usrData.counts.reduce((a, b) => a + b, 0),
                        avg = Math.round(tot / usrData.counts.length * 100) / 100;

                    channel.send({
                        embed: new MoutardeEmbed()
                            .setTitle(`Score de ${memberArg.user.tag} (${config.daysMsgCount} jours)`)
                            .setDescription(`Rang d'utilisateur : **#${rank}**\nNombre total de messages : **${tot}**\nMoyenne de messages par jour : **${avg}**\nScore pour Guide frénétique : **${scoreGoal(memberArg)}**`)
                    });
                } else {
                    channel.send(`Pas de données pour l'utilisateur ${memberArg.user.tag}`);
                }
            }),

        new Command("u", "graph",
            "[@user]` : Affiche le graphique de score sur 30 jours.",
            (member, channel, args, memberArg) => {
                if (memberArg == null) memberArg = member;
                let usrData = msgCount[memberArg.user.id];

                if (usrData != null) {
                    channel.send(`:chart_with_upwards_trend: Graphique du score de **${memberArg.user.tag}**`,
                        new Discord.Attachment(graph([...usrData.counts].reverse(), 400, 150, 10), "graph.png"));
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
                setTimeout(() => {
                    memberArg.removeRole(getRole("GOULAG"));
                    cleanupTempActions();

                    sendLog({action: "unmute", member: memberArg, reason: "Fin du délai de warn"});
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
                setTimeout(() => {
                    hentaiMoutarde.unban(memberArg);
                    cleanupTempActions();

                    sendLog({action: "unban", member: memberArg, reason: "Fin du délai de ban"});
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

        new Command("m", "reversescore",
            " <@user>` : Inverse le score d'un utilisateur",
            (member, channel, args, memberArg) => {
                msgCount[memberArg.user.id].counts.reverse();
                return true;
            }, [], config.devs),

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
    [config, msgCount, duplicates] = loadJson("config", "msgCount", "duplicates");
    bot.user.setActivity(config.game);

    // Get server and load all bot commands
    hentaiMoutarde = bot.guilds.get(config.server);
    loadCommands();

    // Get channels
    bumpChannel = hentaiMoutarde.channels.get("311496070074990593");
    modLogs = hentaiMoutarde.channels.get("403840920119672842");
    dlmBump();

    // Load timeouts for temporary mod actions
    config.tempActions.forEach(action => {
        let fun;

        let usr = bot.fetchUser(action[1]);

        if (action[0] === "ban")
            fun = () => {
                hentaiMoutarde.unban(action[1]);

                sendLog({action: "unban", member: {user: usr}, reason: "Fin du délai de ban"});
            };

        else if (action[0] === "mute")
            fun = () => {
                let mem = hentaiMoutarde.members.get(action[1]);
                if (mem) mem.removeRole(getRole("GOULAG"));

                sendLog({action: "unmute", member: {user: usr}, reason: "Fin du délai de mute"});
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

async function potentialDuplicate(url) {
    return new Promise(res => {
        imageHash(url, 16, true, (err, hash) => {
            if (err) res();

            let combinedHashes = Object.assign({}, ...duplicates.hashes);

            for (let id in combinedHashes) {
                try {
                    if (hammingDistance(combinedHashes[id], hash) < 20)
                        res({id, hash});
                } catch (e) {}
            }
            res({hash});
        });
    });
}

function shiftHashes() {
    duplicates.hashes.pop();
    duplicates.hashes.unshift({});
}

// Message handling
bot.on("message", async message => {
    const {author, member, channel, content} = message;

    // Ignore bot and private messages
    if (author.bot || channel.type !== "text") return;

    // Update date
    if (today() !== config.date) {
        config.date = today();
        saveConfig();

        // Shift arrays
        shiftMessageCounts();
        shiftHashes();
    }

    if (!config.ignoredCount.includes(channel.name)
        && (msgCount[member.user.id] == null
            || Date.now() >= msgCount[member.user.id].lastMsg + config.msgDelay)) {
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

            let invite = content.match(/discord\.gg\/([^ ]+)/)[0],
                guild = await bot.fetchInvite(invite).then(inv => inv.guild);

            let info = `\n**${guild.name}** (${invite})`;

            if (guild) {
                if (guild.name.match(/nude/i)) {
                    let reas = "Serveur nudes";
                    member.ban({days: 1, reason: reas});

                    sendLog({action: "ban", member, customDesc: true, desc: `*${reas}*${info}`});
                } else {
                    reason = "Invitation discord";
                    member.addRole(getRole("GOULAG"));

                    sendLog({action: "mute", member, customDesc: true, desc: `*${reas}*${info}`});
                }
            }
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
                warnMsg = "Merci de limiter vos pavés ! Utilisez #spam-hell-cancer pour vos copypastas.\n" +
                    "*Please avoid walls of text! Use #spam-hell-cancer for copypastas.*";
                reason = "Message > 1000 caractères";
            }
            // Messages which have been sent multiple times
            else if (message.attachments.size === 0 && SM.isSpam(content)) {
                warnMsg = "Prévention anti-spam - ne vous répétez pas.\n" +
                    "*Spam prevention - don't repeat yourself.*";
                reason = "Message spam";
            }
            // Messages with a repeating char for 3/4 of it
            else if (content.length >= 20 && (highestCount + 1) / (message.content.length + 2) > 0.75) {
                warnMsg = "Prévention anti-flood - ne vous répétez pas.\n" +
                    "*Flood prevention - don't repeat yourself.*";
                reason = "Message avec répétition";
            }
        }
    }

    // If any of these has been found, warn the user and delete the message
    if (reason !== "") {
        sendLog({action: "warn", member, channel, reason});

        warnMember(member, reason);
        if (warnMsg !== "")
            channel.send(member.toString() + "\n" + warnMsg.replace(/(\n|\*$)/g, " (warn)$1"));
        message.delete()
            .catch(console.error);
    }

    if (config.duplicateCategories.includes(channel.parent.id)) {
        let i = 0;
        for (let attachment of message.attachments.array()) {
            // File types available
            if (attachment.filename.match(/\.(png|jpe?g)$/)) {
                let id, hash;

                let obj = await potentialDuplicate(attachment.url); //var because we need larger scope

                if (obj != null) {
                    id = obj.id;
                    hash = obj.hash;
                }

                // If an id could be computed
                if (hash) {
                    // If a matching pic has been found
                    if (id) {
                        let [chan, msg, num] = id.split(".");
                        let originalMsg = await bot.channels.get(chan).fetchMessage(msg);

                        let date = new Date(originalMsg.createdTimestamp);
                        let day = ("" + date.getDate()).padStart(2, "0") + "/" + ("" + (date.getMonth() + 1)).padStart(2, "0") + "/" + date.getFullYear(),
                            time = ("" + date.getHours()).padStart(2, "0") + ":" + ("" + date.getMinutes()).padStart(2, "0");

                        let originalFile = originalMsg.attachments.array()[(num ? num : 0)].url;

                        message.channel.send({
                            embed: new MoutardeEmbed()
                                .setDescription(`:warning: Ce post est un potentiel repost de cette image envoyée par **${originalMsg.author.tag}** le *${day} à ${time}*.`)
                                .setImage(originalFile)
                        }).then(msg2 => {
                            duplicates.messages[msg2.channel.id + "." + msg2.id] = [chan + "." + msg, channel.id + "." + message.id];
                            saveJson(duplicates, "duplicates");
                        });
                    }

                    duplicates.hashes[0][channel.id + "." + message.id + (i !== 0 ? "." + i : "")] = hash;
                    saveJson(duplicates, "duplicates");
                }
            }
            i++;
        }
    }
});

bot.on("messageDelete", message => {
    let category = message.channel.parent;
    let updated = false;

    // channel.message id of deleted message
    let delId = message.channel.id + "." + message.id;

    // Remove message from json if deleted
    if (duplicates.messages[delId]) {
        delete duplicates.messages[delId];
        updated = true;
    }

    if (category && config.duplicateCategories.includes(category.id) && message.attachments.size > 0) {
        // Remove hash from hashes
        for (let day of duplicates.hashes) {
            for (let id in day) {
                if (id.startsWith(delId)) {
                    delete day[id];
                    updated = true;
                }
            }
        }

        // Delete & remove message if one of the duplicates has been deleted
        for (let id in duplicates.messages) {
            if (duplicates.messages[id].includes(delId)) {
                delete duplicates.messages[id];

                let [chan, msg] = id.split(".");
                bot.channels.get(chan).fetchMessage(msg).then(msg => msg.delete());

                updated = true;
            }
        }
    }

    if (updated)
        saveJson(duplicates, "duplicates");
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

        sendLog({action: "mute", member, reason: "Autogoulag"});
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

// Ban/unban/kick logs
bot.on("guildBanAdd", (_, user) => sendLog({action: "ban", member: {user}}));
bot.on("guildBanRemove", (_, user) => sendLog({action: "unban", member: {user}}));
bot.on("guildMemberRemove", (_, user) => sendLog({action: "kick", member: {user}}));

// Message logs
bot.on("messageDelete", message => {
    if (message.author.bot) return;
    sendLog({
        customTitle: true, title: `Message de **${message.author.tag}** supprimé dans **#${message.channel.name}**`,
        customDesc: true, desc: message.content, member: {user: message.author}
    });
});
bot.on("messageUpdate", (oldMsg, newMsg) => {
    if (oldMsg.author.bot) return;
    sendLog({
        customTitle: true, title: `Message de **${oldMsg.author.tag}** édité dans **#${oldMsg.channel.name}**`,
        customDesc: true, desc: oldMsg.content + "\n---\n" + newMsg.content, member: {user: oldMsg.author}
    });
});

bot.login(secrets.token);
