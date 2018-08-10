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
    
    this.isPrevented = function (message){
      if(this.users.includes(message.author)){
        return true;
      }else{
        this.users.push(message.author);
        this.timers.push(setTimeout(this.popUser(), this.timeout));
        return false;
      }
    }
    
    this.popUser = function(){
      this.users.shift()
    }
    
  }
}