  //Hello !
  //This bot is being dev'd for the Discord server Hentai Moutarde at https://discord.gg/yYsCw8z
  //It is a french Discord, revolving around hentai (and more, soon(tm))
  //If you plan on stealing this, please kindly go duck yourself.

  //Have any questions ? Go ask Koreos#8912 over at HM !

  const Discord = require("discord.js");

  //Bot client.
  const bot = new Discord.Client();

  //Contains bot prefix
  const config = require("./config.json");
  const token = require("./token.json");
  const spamManager = require("./spammanager.js");
  var SM = new spamManager.Manager(30000);


  const slowModeManager = require("./slowmodemanager.js");
  var slowmode = new slowModeManager.Manager();
  //Warned users
  const fs = require('fs');
  const util = require('util');
  var warnedUsers;
  var maxwarns = 3; //TODO: save the things

  var ignoredChannels = ["les-bg-pas-pd",
                        "dev",
                        "vip",
                        "modlogs",
                        "couchoux",
                        "spam_admin_issou",
                        "spam_hell_cancer"];
  console.log(ignoredChannels.getClass);

  function saveWarnedUsers() {
    fs.writeFileSync('warns.json', JSON.stringify(Array.from(warnedUsers.entries())), 'utf-8');
    console.log(`saved ${warnedUsers.size} warn entries`);
  }

  function restoreWarnedUsers() {
    var text = fs.readFileSync('warns.json');
    warnedUsers = new Map(JSON.parse(text));
    console.log(`restored ${warnedUsers.size} warn entries`);
  }


  function warnMember(member) { //warn a member and mute him if necessary
    console.log(`warning user ${member.nickname}`);
    if (!warnedUsers.has(member.toString())) { // is he already warned?
      warnedUsers.set(member.toString(), 1); // if not, add him to the list of warned
    } else {
      warnedUsers.set(member.toString(), warnedUsers.get(member.toString()) + 1);
      if (warnedUsers.get(member.toString()) >= maxwarns) {
        member.addRole(member.guild.roles.find('name', 'Muted'), "3rd warning").catch(console.error);
        warnedUsers.delete(member.toString());
      }
    }
    saveWarnedUsers();
  }


  function cleanUpColorRoles(guild) {
    guild.roles.forEach((value) => {
      if (value.name.includes("dncolor") && value.members.size === 0) {
        value.delete();
      }
    });
  }

  String.prototype.charTally = function charTally(){ // count the number of occurences of each character in the string.
    return this.split('').reduce((acc, char) => {
      acc[char] = (acc[char] || 0) +1;
      return acc;
    }, {});
  };


  function saveProtectedNames(){
    fs.writeFileSync('protectednames.json', JSON.stringify(Array.from(protectednames.entries())), 'utf-8');
  }

  function restoreProtectedNames(){
    var text = fs.readFileSync('protectednames.json');
    protectednames = new Map(JSON.parse(text));
  }

  function reload(){
    restoreProtectedNames();
    restoreWarnedUsers();
  }

  function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
  }


  //Runs on bot start
  bot.once("ready", () => {
    console.log(`Bot started ! ${bot.users.size} users.`);
    bot.user.setActivity('twitter.com/hentaimoutarde');
    restoreWarnedUsers();
    restoreProtectedNames();
  });



  //HELLO
  bot.on("message", (message) => {

    if (message.author.bot) return;


    if (message.content.startsWith(config.prefixu)) { //User commands
      var commandandargs = message.content.substring(2).split(" "); //Split the command and args
      var command = commandandargs[0];  //Alias to go faster
      if (command == "color") {
        if (message.member.roles.find('name', 'Donateur')) {  //Si on a le role donateur
          if (commandandargs.length == 2) { //I want exactly 1 argument
            var role = message.member.roles.find(val => val.name.includes("dncolor"));  //Find the user's color role if there is one
            if (role) {
              message.member.removeRole(role)
                .then((member) => {
                })
                .catch(console.error);
            }
            if (commandandargs[1] != "reset") { //Reset is not a color, allow people to just remove it
              role = message.guild.roles.find(val => val.name === "dncolor" + commandandargs[1]);
              if (role) {
                message.member.addRole(role);
              } else {}
              message.guild.createRole({
                  name: 'dncolor' + commandandargs[1],
                  color: commandandargs[1],
                  hoist: false,
                  position: message.member.roles.find('name', 'Donateur').position + 1, //1 au dessus du role donateur
                  mentionable: false
                })
                .then((role) => {
                  message.member.addRole(role).then(promise => cleanUpColorRoles(message.guild));
                });
            }else{
              cleanUpColorRoles(message.guild);
            }

          } else {  //Le mec a le droit mais il sait pas faire
            message.reply("Example: `color #FF4200`");
          }
        } else {  //Le mec a pas le droit
          message.reply("Vous devez etre donateur pour utiliser cette commande.");
        }
      } else if(command == "help"){
        message.reply("voici mes commandes utilisateur:\n\
-color <code couleur/reset> : Seulement pour les donateurs; change la couleur de votre nom au code couleur choisi.\n\
\texemple: color #FF4200");
      }
  }



    if (message.content.startsWith(config.prefixm)) { //Mod commands
      if(message.member.roles.find("name", "Généraux") || message.member.roles.find("name", "Salade de fruits")){
        var commandandargs = message.content.substring(3).split(" "); //Split the command and args
        var command = commandandargs[0];  //Alias to go faster
        if (command === "warn") { //FIXME
          message.mentions.members.forEach(function(member, id, members){
            warnMember(member);
          });
          message.reply(":ok_hand:");
        }else if (command == "spamtimeout") {
          try {
            SM.changeTimeout(commandandargs[1]);
            message.reply(":ok_hand:");
          } catch (e) {
            message.reply("Erreur: " + e);
          }
        }else if(command == "slowmode"){
          try{
              if(commandandargs[1] == 0){
                slowmode.removeSlowMode(message.channel);
                message.reply(":ok_hand:");
              }else if(commandandargs[1]=="help"){
                message.reply("usage: slowmode <time>[h/m/s/ms] (default: seconds)\nexample: slowmode 24h\nremove with slowmode 0");
              }else{
                if(commandandargs[1].endsWith("h")){
                  slowmode.addSlowMode(message.channel, commandandargs[1].slice(0,-1)*1000*60*60);
                }else if(commandandargs[1].endsWith("m")){
                  slowmode.addSlowMode(message.channel, commandandargs[1].slice(0,-1)*1000*60);
                }else if(commandandargs[1].endsWith("ms")){
                  slowmode.addSlowMode(message.channel, commandandargs[1].slice(0,-2));
                }else if(commandandargs[1].endsWith("s")){
                  slowmode.addSlowMode(message.channel, commandandargs[1].slice(0,-1)*1000);
                }else{
                  slowmode.addSlowMode(message.channel, commandandargs[1]*1000);
                }
              message.reply(":ok_hand:");
              }
          } catch(e){
            message.reply("Erreur: " +e);
          }
        }else if(command == "setprotectedname"){
          if(commandandargs[1].startsWith("<@")){
            protectednames.set(message.content.slice(21 + commandandargs[1].length), commandandargs[1].slice(2, -1));
            saveProtectedNames();
            message.reply(":ok_hand:");
          }else{
            message.reply("usage: setprotectedname <@user> <name>");
          }
        }else if(command == "setgame"){
          bot.user.setActivity(message.content.substring(11));
          message.reply("game set to " + message.content.substring(11));
        }else if (command == "maxwarnings") {
            maxwarns = commandandargs[1];
            message.reply(":ok_hand:");
        }
        else if(command == "help"){
          message.reply("voici mes commandes moderateur:\n\
-warn <@user> [reason] : ajoute un warning a user. reason est inutile et sert juste a faire peur.\n\
-spamtimeout <temps en ms> : Change la duree pendant laquelle deux messages identiques ne peuvent pas etre postes (default: 30s)\n\
-slowmode <temps>[h/m/s/ms] (default: s) : cree ou modifie un slowmode dans le channel actuel.\n\
-setprotectedname <@user> <name> : reserve un nom pour user. plusieurs noms par user possibles.\n\
-setgame <game> : change la phrase de profil du bot.\n\
-maxwarnings <number> : les utilisateurs seront mute apres number warns (default 3)");
        }

      }else if(message.content === "hm reload" && message.author.id == "107448106596986880"){
        reload();
        message.reply("success.");
      }else if (message.content.startsWith("hm simon ") && message.author.id == "107448106596986880") {
        message.channel.send(message.content.substring(9));
      }


    }


    //Deleting "@everyone" made by random people
    if (message.content.includes("@everyone")) {  //Si le message contient un everyone
      if (!(message.member.roles.find('name', 'Salade de fruits') || message.member.roles.find('name', 'Généraux'))) {
        warnMember(message.member);
        message.reply("tu pense faire quoi, au juste? (warn)");
        message.delete().catch(console.error);
      }
    }

    var tallyArray = [];
    var tally = message.content.charTally();
    for(var prop in tally){
      if(tally.hasOwnProperty(prop));
      tallyArray.push(tally[prop]);
    }
    var highestcount = Math.max(...tallyArray);

    if (!(ignoredChannels.includes(message.channel.name) || message.member.roles.find('name', 'Généraux'))) {
      if (slowmode.isPrevented(message)){
        message.author.send("Le channel dans lequel vous essayez de parler est en slowmode, merci de patienter avant de poster à nouveau.").catch();
        message.delete().catch(console.error);
      }else if (message.content.length >= 1000) { //Degager les messages de 1000+ chars
        warnMember(message.member);
        message.reply("Pavé césar, ceux qui ne vont pas lire te saluent! (warn)");
        message.delete().catch(console.error);
      }else if (message.attachments.size ===0 && SM.isSpam(message.content)) {
        warnMember(message.member);
        message.reply("on se calme.(warn)");
        message.delete().catch(console.error);
      }else if( message.content.lenght >= 10 &&(highestcount+1)/(message.content.length+2) > 0.75){
        warnMember(message.member);
        message.reply("stop spam, merci.(warn)");
        message.delete().catch(console.error);
      }
    }

  });


  bot.on("guildMemberUpdate", (oldMember, newMember) => {
    if(newMember.nickname){
      if(oldMember.nickname != newMember.nickname){
        if(protectednames.get(newMember.nickname.toLowerCase()) && protectednames.get(newMember.nickname.toLowerCase()) != newMember.id){
          warnMember(newMember);
          newMember.setNickname("LE FAUX "+ newMember.nickname, "Protected name.").catch(console.error);
        }
      }

    }
  });


  bot.login(token.token); //Yes.
