//this module s the timekeeper for the slowmode of a single channel.
//it is so focused on a single channel, in fact, that it has no concept of it.
//to be used by slowmodemanager.js, not intended for standalone use.
module.exports={
  SM : function(timeout){
    this.timeout = timeout;
    this.users = [];
    this.timers = [];
    
    
    this.wipe = function(){
      for(var i=0;i<timers.length;i++){
        clearTimeout(timers[i]);
      }
      this.users = [];
    }
    
    this.isPrevented = function (message){ //returns true if the message should be deleted.
      if(this.users.includes(message.author)){
        return true;
      }else{
        this.users.push(message.author);
        this.timers.push(setTimeout(this.popUser, this.timeout, this.users));
        return false;
      }
    }
    
    this.popUser = function(users){
      users.shift()
    }
    
  }
}