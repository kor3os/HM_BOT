// Hello !
// This bot is being dev'd for the Discord server Hentai Moutarde at https:// Discord.gg/yYsCw8z
// It is a french Discord, revolving around hentai (and more, soon(tm))
// If you plan on stealing this, please kindly go duck yourself.

// Have any questions ? Go ask Koreos#8912 over at HM !

const fs = require("fs");
const Discord = require("discord.js");

// Bot client.
const bot = new Discord.Client();

// Bot configuration
const config = require("./config.json");
const token = require("./token.json");

const devs = ["226452158936121354", "107448106596986880"];
const ignoredChannels = [
    "les-bg-pas-pd",
    "dev",
    "vip",
    "modlogs",
    "couchoux",
    "spam_admin_issou",
    "spam_hell_cancer"
];

// Bot managers
const spamManager = require("./spammanager.js");
let SM = new spamManager.Manager(30000);

const slowModeManager = require("./slowmodemanager.js");
let slowMode = new slowModeManager.Manager();

// Warned users
let warnedUsers;
let maxwarns = 3; // TODO: save the things

function saveWarnedUsers() {
    fs.writeFileSync("warns.json", JSON.stringify(Array.from(warnedUsers.entries())), "utf-8");
    console.log(`saved ${warnedUsers.size} warn entries`);
}

function restoreWarnedUsers() {
    let text = fs.readFileSync("warns.json");
    warnedUsers = new Map(JSON.parse(text.toString()));
    console.log(`restored ${warnedUsers.size} warn entries`);
}

function warnMember(member) { // Warn a member and mute him if necessary
    console.log(`warning user ${member.user.username}`);
    
    if (!warnedUsers.has(member.toString())) { // Is he already warned?
        warnedUsers.set(member.toString(), 1); // If not, add him to the list of warned
    } else {
        warnedUsers.set(member.toString(), warnedUsers.get(member.toString()) + 1);
        if (warnedUsers.get(member.toString()) >= maxwarns) {
            member.addRole(member.guild.roles.find(role => role.name === "Muted"), "3rd warning")
                .catch(console.error);
            warnedUsers.delete(member.toString());
        }
    }
    saveWarnedUsers();
}

function cleanUpColorRoles(guild) {
    guild.roles.filter(role => role.name.includes("dncolor") && role.members.size === 0)
        .forEach(role => role.delete());
}

String.prototype.charTally = function charTally() { // Count the number of occurences of each character in the string.
    return this.split("").reduce((acc, char) => {
        acc[char] = (acc[char] || 0) + 1;
        return acc;
    }, {});
};

// Protected names
let protectednames;

function saveProtectedNames() {
    fs.writeFileSync("protectednames.json", JSON.stringify(Array.from(protectednames.entries())), "utf-8");
}

function restoreProtectedNames() {
    let text = fs.readFileSync("protectednames.json");
    protectednames = new Map(JSON.parse(text.toString()));
}

function reload() {
    restoreProtectedNames();
    restoreWarnedUsers();
}

let bumpChannel;

function dlmbump() {
    if (bumpChannel) {
        bumpChannel.send("dlm!bump");
        setTimeout(dlmbump, 21600000 + (Math.random() * (900000 - 180000) + 180000));
    }
}

// Runs on bot start
bot.once("ready", () => {
    console.log(`Bot started ! ${bot.users.size} users.`);
    bot.user.setActivity("twitter.com/hentaimoutarde");
    
    restoreWarnedUsers();
    restoreProtectedNames();
    
    bumpChannel = bot.channels.get("311496070074990593");
    dlmbump();
});


// Message handling
bot.on("message", (message) => {
    // Ignore bot commands and private messages
    if (message.author.bot || message.channel.type !== "text") return;
    
    // User commands
    if (message.content.startsWith(config.prefixu)) {
        let commandandargs = message.content.substring(config.prefixu.length).split(" "); // Split the command and args
        let command = commandandargs[0];  // Alias to go faster
        
        if (command === "color") {
            if (message.member.roles.find(role => role.name === "Donateur")) {  // Si on a le role donateur
                if (commandandargs.length === 2) { // I want exactly 1 argument
                    let role = message.member.roles.find(val => val.name.includes("dncolor"));  // Find the user's color role if there is one
                    
                    if (role) {
                        message.member.removeRole(role)
                            .catch(console.error);
                    }
                    
                    if (commandandargs[1] === "reset") { // Reset is not a color, allow people to just remove it
                        cleanUpColorRoles(message.guild);
                    } else {
                        role = message.guild.roles.find(val => val.name === "dncolor" + commandandargs[1]);
                        
                        if (role) {
                            message.member.addRole(role);
                        } else {
                            message.guild.createRole({
                                    name: "dncolor" + commandandargs[1],
                                    color: commandandargs[1],
                                    hoist: false,
                                    position: message.member.roles.find(role => role.name === "Donateur").position + 1, // 1 au dessus du role donateur
                                    mentionable: false
                                })
                                .then(role => message.member.addRole(role)
                                    .then(() => cleanUpColorRoles(message.guild))
                                    .catch(console.error))
                                .catch(console.error);
                        }
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
    if (message.content.startsWith(config.prefixm)) {
        if (message.member.roles.find(role => role.name === "Généraux" || role.name === "Salade de fruits")) {
            let commandandargs = message.content.substring(config.prefixm.length).split(" "); // Split the command and args
            let command = commandandargs[0];  // Alias to go faster
            
            if (command === "warn") { // FIXME
                message.mentions.members.forEach(warnMember);
                message.reply(":ok_hand:");
                
            } else if (command === "spamtimeout") {
                try {
                    SM.changeTimeout(commandandargs[1]);
                    message.reply(":ok_hand:");
                } catch (e) {
                    message.reply("Erreur: " + e);
                }
                
            } else if (command === "slowmode") {
                try {
                    if (commandandargs[1] === "0") {
                        slowMode.removeSlowMode(message.channel);
                        message.reply(":ok_hand:");
                        
                    } else if (commandandargs[1] === "help") {
                        message.reply("usage: slowmode <time>[h/m/s/ms] (default: seconds)\nexample: slowmode 24h\nremove with slowmode 0");
                        
                    } else {
                        if (commandandargs[1].endsWith("h"))
                            slowMode.addSlowMode(message.channel, commandandargs[1].slice(0, -1) * 1000 * 60 * 60);
                        else if (commandandargs[1].endsWith("m"))
                            slowMode.addSlowMode(message.channel, commandandargs[1].slice(0, -1) * 1000 * 60);
                        else if (commandandargs[1].endsWith("s"))
                            slowMode.addSlowMode(message.channel, commandandargs[1].slice(0, -1) * 1000);
                        else if (commandandargs[1].endsWith("ms"))
                            slowMode.addSlowMode(message.channel, commandandargs[1].slice(0, -2));
                        else
                            slowMode.addSlowMode(message.channel, commandandargs[1] * 1000);
                        
                        message.reply(":ok_hand:");
                    }
                } catch (e) {
                    message.reply("Erreur: " + e);
                }
                
            } else if (command === "setprotectedname") {
                if (commandandargs[1].startsWith("<@")) {
                    protectednames.set(message.content.slice(21 + commandandargs[1].length), commandandargs[1].slice(2, -1));
                    saveProtectedNames();
                    message.reply(":ok_hand:");
                } else {
                    message.reply("usage: setprotectedname <@user> <name>");
                }
                
            } else if (command === "setgame") {
                bot.user.setActivity(message.content.substring(11));
                message.reply("game set to " + message.content.substring(11));
                
            } else if (command === "maxwarnings") {
                maxwarns = commandandargs[1];
                message.reply(":ok_hand:");
                
            } else if (command === "help") {
                message.reply(`voici mes commandes moderateur:

-warn <@user> [reason] : ajoute un warning a user. reason est inutile et sert juste a faire peur.
-spamtimeout <temps en ms> : Change la duree pendant laquelle deux messages identiques ne peuvent pas etre postes (default: 30s)
-slowmode <temps>[h/m/s/ms] (default: s) : cree ou modifie un slowmode dans le channel actuel.
-setprotectedname <@user> <name> : reserve un nom pour user. plusieurs noms par user possibles.
-setgame <game> : change la phrase de profil du bot.
-maxwarnings <number> : les utilisateurs seront mute apres number warns (default 3)`);
            }
            
        } else if (message.content === "hm reload" && devs.includes(message.author.id)) {
            reload();
            message.reply("Success.");
            
        } else if (message.content.startsWith("hm simon ") && devs.includes(message.author.id)) {
            message.channel.send(message.content.substring(9));
        }
    }
    
    // Deleting "@everyone" made by random people
    if (message.content.includes("@everyone")
        && !message.member.roles.find(role => role.name === "Salade de fruits" || role.name === "Généraux")) {
        warnMember(message.member);
        message.reply("Tu pense faire quoi, au juste? (warn)");
        message.delete()
            .catch(console.error);
    }
    
    let tally = message.content.charTally();
    let highestcount = Math.max(...Object.values(tally));
    
    if (!(ignoredChannels.includes(message.channel.name) || message.member.roles.find(role => role.name === "Généraux"))) {
        let warn = "";
        
        if (slowMode.isPrevented(message)) {
            message.author.send("Le channel dans lequel vous essayez de parler est en slowmode, merci de patienter avant de poster à nouveau.")
                .catch(console.error);
            message.delete()
                .catch(console.error);
            
        } else if (message.content.length >= 1000) // Degager les messages de 1000+ chars
            warn = "Pavé césar, ceux qui ne vont pas lire te saluent!";
        
        else if (message.attachments.size === 0 && SM.isSpam(message.content))
            warn = "On se calme.";
        
        else if (message.content.length >= 20 && (highestcount + 1) / (message.content.length + 2) > 0.75)
            warn = "Stop spam, merci.";
        
        if (warn !== "") {
            warnMember(message.member);
            message.reply(warn + " (warn)");
            message.delete()
                .catch(console.error);
        }
    }
});

bot.on("guildMemberUpdate", (oldMember, newMember) => {
    if (newMember.nickname
        && oldMember.nickname !== newMember.nickname
        && protectednames.get(newMember.nickname.toLowerCase())
        && protectednames.get(newMember.nickname.toLowerCase()) !== newMember.id) {
        warnMember(newMember);
        newMember.setNickname("LE FAUX " + newMember.nickname, "Protected name.")
            .catch(console.error);
    }
});

/*
function giveDefaultRole(member) {
    member.addRole(member.guild.roles.find(role => role.name === "secte nsfw"), "10 mins")
        .catch(() => console.log("tried giving an already given role, git gud"));
}

bot.on("guildMemberAdd", (member) => {
    setTimeout(giveDefaultRole, 600000, member);
});
*/

bot.login(token.token); // Yes.
