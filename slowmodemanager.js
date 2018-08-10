module.exports = {
  Manager : function (){
    var slowmode = require("./slowmode.js");
    this.slowModes = new Map();
    this.addSlowMode = function (channel, timeout){
      this.slowModes.set(channel, new slowmode.SM(timeout));
    }
    
    this.clearTimeOuts = function(channel){
      this.slowModes.get(channel).wipe();
    }
    
    this.isPrevented = function(message){
      var sm = this.slowModes.get(message.channel);
      return sm !== undefined && sm.isPrevented(message);
    }
    
    this.removeSlowMode = function(channel){
      this.slowModes.delete(channel);
    }
    
  }
}
