  //Hello !
  //This bot is being dev'd for the Discord server Hentai Moutarde at https://discord.gg/yYsCw8z
  //It is a french Discord, revolving around hentai (and more, soon(tm))
  //If you plan on stealing this, please kindly go duck yourself.

  //Have any questions ? Go ask Koreos#8912 over at HM !

  const Discord = require("discord.js");

  //Bot client.
  const bot = new Discord.Client();

  //contains bot prefix
  const config = require("./config.json");
  const token = require("./token.json");

  //warned users
  const fs = require('fs');
  const util = require('util');
  var warnedUsers;


  function saveWarnedUsers() {
    fs.writeFileSync('warns.json', JSON.stringify(Array.from(warnedUsers.entries())), 'utf-8');
    console.log(`saved ${warnedUsers.size} warn entries`);
  }

  function restoreWarnedUsers(){
    var text = fs.readFileSync('warns.json');
    warnedUsers = new Map(JSON.parse(text));
    console.log(warnedUsers);
    console.log(`restored ${warnedUsers.size} warn entries`);
  }



function warnMember(member){ //warn a member and mute him if necessary
  console.log(`warning user ${member.username}`);
  if (!warnedUsers.has(member.toString())) { // is he already warned?
    warnedUsers.set(member.toString(), 1); // if not, add him to the list of warned
  }else{
    warnedUsers.set(member.toString(), warnedUsers.get(member.toString()) +1);
    if (warnedUsers.get(member.toString())>=3) {
      member.addRole('463379709049176094', "3rd warning").catch(console.error);// id of @Muted on HM.
      warnedUsers.delete(member.toString());
    }
  }
  saveWarnedUsers();
}

function cleanUpColorRoles(guild){
  guild.roles.forEach((value) => {
    if (value.name.includes("dncolor") && value.members.size == 0) {
      value.delete()
    }
  });
}



  //Runs on bot start
  bot.once("ready", () => {
      console.log(`Bot started ! ${bot.users.size} users.`);
      bot.user.setActivity('Saucisse');
      restoreWarnedUsers();
  });




  //HELLO
  bot.on("message", (message) => {

    if (message.author.bot) return;
    if (message.content.length >= 1000) { // degager les messages de 1000+ chars
      warnMember(message.member);
      message.delete().catch(console.error);
    }

    if (message.content.startsWith(config.prefixu)) { //user commands
      var commandandargs = message.content.substring(2).split(" "); //split the command and args
      var command = commandandargs[0]; //alias to go faster
      if (command == "color") {
        if (message.member.roles.find('name', 'Donateur')) { // si on a le role donateur
          if (commandandargs.length == 2) { // i want exactly 1 argument
            var role = message.member.roles.find(val=> val.name.includes("dncolor")); //find the user's color role if there is one
            if (role) {
              message.member.removeRole(role)
              .then((member) => {
                setTimeout(cleanUpColorRoles, 500, message.guild);// dans 1 demi seconde (attendre l'update), retirer tous les roles de couleur vides
              })
              .catch(console.error);
            }
            if (commandandargs[1] != "reset") { // reset is not a color, allow people to just remove it
              role = message.guild.roles.find(val => val.name === "dncolor"+commandandargs[1]);
              if (role) {
                message.member.addRole(role);
              }else{}
                message.guild.createRole({name: 'dncolor'+commandandargs[1],
                                          color: commandandargs[1],
                                          hoist: false,
                                          position: message.member.roles.find('name', 'Donateur').position +1, // 1 au dessus du role donateur
                                          mentionable: false})
                .then((role) => {
                  message.member.addRole(role);
                });
              }
            }
          }else{ // le mec a le droit mais il sait pas faire
            message.reply("Example: `color #FF4200`");
          }
        }else { // le mec a pas le droit
          message.reply("Vous devez etre donateur pour utiliser cette commande.");
        }
        //fin de la commande couleur
    }



    if (message.content.startsWith(config.prefixm)) { // mod commands
      // TODO: check for user's role
      var commandandargs = message.content.substring(3).split(" "); //split the command and args
      var command = commandandargs[0]; //alias to go faster
      if (command === "warn") { //FIXME
        warnMember(message.member);
      }


    }



//     Deleting "@everyone" made by random people
// Broken
    if (message.content.indexOf("@everyone") == 0) {
      if (message.member.roles.has("463382995466715136") || message.member.roles.has("463383000768446485")) {
        return;
      } else {
        var st = message.content;
        message.delete().then(msg => console.log(`Deleted message from ${msg.author.username} with content = ${msg.content};; content check = ` + st));
      }
    }
  });


  bot.login(token.token); //Yes.
