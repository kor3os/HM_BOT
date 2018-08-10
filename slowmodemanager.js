module.exports = {
  Manager : function (){
    this.slowmode = require("./slowmode.js");
    this.slowModes = new Map();
    this.addSlowMode = function (channel, timeout){
      this.slowModes.set(channel, new slowmode.SM(timeout));
    }
    
    this.clearTimeOuts = function(channel){
      this.slowModes.get(channel).wipe();
    }
    
    this.isPrevented = function(message){
      return this.slowModes.get(message.channel).isPrevented(message);
    }
    
    this.removeSlowMode = function(channel){
      this.slowModes.delete(channel);
    }
    
  }
}
