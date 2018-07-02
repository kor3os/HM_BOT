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
  var warnedUsers = new Map();

  function saveWarnedUsers() {
    fs.writeFile('warns.json', JSON.stringify(Array.from(warnedUsers.entries())), 'utf-8');
    console.log(`saved ${warnedUsers.size} warn entries`);
  }

  function restoreWarnedUsers() {
    warnedUsers = new Map(JSON.parse(fs.readFile('warns.json', 'utf-8')));
    console.log(`restored ${warnedUsers.size} warn entries`);
  }



function warnMember(member){ //warn a member and mute him if necessary
  console.log(`warning user ${member.username}`);
  if (!warnedUsers.has(member.toString())) {
    warnedUsers.set(member.toString(), 1);
  }else{
    warnedUsers.set(member.toString(), warnedUsers.get(member.toString()) +1);
    if (warnedUsers.get(member.toString())>=3) {
      member.addRole('463379709049176094', "3rd warning").catch(console.error);// id of @Muted on HM.
      warnedUsers.delete(member.toString());
    }
    saveWarnedUsers();
  }

  //Runs on bot start
  bot.on("ready", () => {
    bot.once("ready", () => {
      console.log(`Bot started ! ${bot.users.size} users.`);
      bot.user.setActivity('Saucisse');
      restoreWarnedUsers();
    })
  });

  bot.on("guildCreate", guild => {
    console.log(`Joined guild ${guild.name} // id : ${guild.id}`);
  });


  /* bot.on("message", (message) => {
    if(message.author.bot) return;

    if(message.channel.id = "388795219560103948") {
       if(message.member.roles.exists("name", "Généraux"))
        {
          console.log(`Message kept due to admin role`)
         return;
       } else {
        message.delete(1);
       }
    } */

  //HELLO
  bot.on("message", (message) => {

    if (message.author.bot) return;
    if (message.content.length >= 1000) { // degager les messages de 1000+ chars
      warnMember(message.member);
    }
    //Deleting "@everyone" made by random people

    if (message.content.indexOf("@everyone") == 0) {
      if (message.member.roles.has("463382995466715136") || message.member.roles.has("463383000768446485")) {
        return;
      } else {
        var st = message.content;
        message.delete().then(msg => console.log(`Deleted message from $(msg.author.username) with content = $(msg.content);; content check = ` + st));
      }
    }
  })


  bot.login(token.token); //Yes.
