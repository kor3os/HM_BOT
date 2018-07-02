  //Hello !
  //This bot is being dev'd for the Discord server Hentai Moutarde at https://discord.gg/yYsCw8z
  //It is a french Discord, revolving around hentai (and more, soon(tm))
  //If you plan on stealing this, please kindly go duck yourself.

  //Have any questions ? Go ask Koreos#8912 over at HM !

const Discord = require("discord.js");

  //Bot client.
const bot = new Discord.Client();

  //contains bot token
const config = require("./config.json");

  //Runs on bot start
bot.on("ready", () => {
  console.log(`Bot started, blyat. ${bot.users.size} users.`);
  bot.user.setGame(`https://twitter.com/hentaimoutarde`);

});

bot.on("guildCreate", guild => {
  console.log(`Joined guild ${guild.name} // id : ${guild.id}`);
});

bot.on("message", (message) => {
  if(message.author.bot) return;

  if(message.channel.id = "388795219560103948") {
     if(message.member.roles.exists("name", "Généraux"))
      {
        console.log(`Message kept due to admin role`)
       return;
     } else {
      message.delete(1);
     }
  }

  if(message.content === "?role secte nsfw") {
    const
  }



});

bot.login(token.token);
