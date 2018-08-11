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


  function saveWarnedUsers() {
    fs.writeFileSync('warns.json', JSON.stringify(Array.from(warnedUsers.entries())), 'utf-8');
    console.log(`saved ${warnedUsers.size} warn entries`);
  }

  function restoreWarnedUsers() {
    var text = fs.readFileSync('warns.json');
    warnedUsers = new Map(JSON.parse(text));
    console.log(warnedUsers);
    console.log(`restored ${warnedUsers.size} warn entries`);
  }


  function warnMember(member) { //warn a member and mute him if necessary
    console.log(`warning user ${member.username}`);
    if (!warnedUsers.has(member.toString())) { // is he already warned?
      warnedUsers.set(member.toString(), 1); // if not, add him to the list of warned
    } else {
      warnedUsers.set(member.toString(), warnedUsers.get(member.toString()) + 1);
      if (warnedUsers.get(member.toString()) >= 3) {
        member.addRole(member.guild.roles.find('name', 'Muted'), "3rd warning").catch(console.error); // id of @Muted on HM.
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


  //Runs on bot start
  bot.once("ready", () => {
    console.log(`Bot started ! ${bot.users.size} users.`);
    bot.user.setActivity('Etre en beta fermée');
    restoreWarnedUsers();
  });



  //HELLO
  bot.on("message", (message) => {

    if (message.author.bot) return;
    if (message.content.length >= 1000) { //Degager les messages de 1000+ chars
      warnMember(message.member);
      message.delete().catch(console.error);
    }

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
                  setTimeout(cleanUpColorRoles, 500, message.guild);  //Dans 1 demi seconde (attendre l'update), retirer tous les roles de couleur vides
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
                  message.member.addRole(role);
                });
            }
          }
        } else {  //Le mec a le droit mais il sait pas faire
          message.reply("Example: `color #FF4200`");
        }
      } else {  //Le mec a pas le droit
        message.reply("Vous devez etre donateur pour utiliser cette commande.");
      }
      //Fin de la commande couleur
    }



    if (message.content.startsWith(config.prefixm)) { //Mod commands
      // TODO: check for user's role
      var commandandargs = message.content.substring(3).split(" "); //Split the command and args
      var command = commandandargs[0];  //Alias to go faster
      if (command === "warn") { //FIXME
        warnMember(message.member);
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
          }
          message.reply(":ok_hand:");
        } catch(e){
          message.reply("Erreur: " +e);
        }
        
      }


    }


    //Deleting "@everyone" made by random people
    // Broken
    if (message.content.includes("@everyone")) {  //Si le message contient un everyone
      if (message.member.roles.find('name', 'Salade de fruits') || message.member.roles.find('name', 'Généraux')) {
        console.log("everyone ignoré => Salade ou Général");
        return;
      } else {
        var st = message.content;
        message.delete().then(msg => console.log(`Deleted message from ${msg.author.username} with content = ${msg.content};; content check = ` + st)); //Echo the message in console
      }
    }

    var tally = message.content.charTally();

    if (!message.member.roles.find('name', 'Généraux')) {
      if (slowmode.isPrevented(message)){
        message.delete().catch(console.error);
      }else if (SM.isSpam(message.content)) {
        warnMember(message.member);
        message.reply("on se calme.");
        message.delete().catch(console.error);
      }
    }

  });


  bot.login(token.token); //Yes.
