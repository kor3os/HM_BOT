//this module exposes functions to check if a messages is being spammed
//its timeout parameter is the time, in miliseconds, that the functions should remember messages for


module.exports = {
  Manager : function (timeout) {
    this.messages = new Map();
    this.t= timeout;
    this.isSpam = function (message){ // returns true if the message is spam and false otherwise
      if (this.messages.get(message) >= 4) {
        return true; // TODO: maybe put back the messages in the queue? not sure.
      } else {
        if(messages.has(message)){
          this.messages.set(message, this.messages.get(message) +1);
        }else{
          messages.set(message, 1);
          setTimeout(pop, this.t, this.messages, message);
        }
        return false;
      }
    }
    this.changeTimeout = function (timeout){// changes the timeout
      if (isNaN(timeout) || timeout <0) {
        throw "merci de fournir un nombre positif";
      }
      this.t = timeout;
    }
    function pop(messages, message) { // doing this in an anonymous function throws. i give up on javascript.
      messages.delete(message);
    }
  }

};
