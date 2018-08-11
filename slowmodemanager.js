//this module acts as an interface to keep track of multiple slowmodes.
module.exports = {
  Manager : function (){
    this.slowmode = require("./slowmode.js");
    this.slowModes = new Map();
    this.addSlowMode = function (channel, timeout){
      this.slowModes.set(channel, new this.slowmode.SM(timeout));
    }
    
    this.clearTimeOuts = function(channel){
      this.slowModes.get(channel).wipe();
    }
    
    this.isPrevented = function(message){ //returns true if the message should be deleted and false if not or if theres no slowmode on that channel.
      var sm = this.slowModes.get(message.channel);
      return sm !== undefined && sm.isPrevented(message);
    }
    
    this.removeSlowMode = function(channel){
      this.slowModes.delete(channel);
    }
    
  }
}
