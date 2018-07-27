//this module exposes functions to check if a messages is being spammed
//its timeout parameter is the time, in miliseconds, that the functions should remember messages for


module.exports = {
  Manager : function (timeout) {
    this.messages = [];
    this.t= timeout;
    console.log(this.t);
    this.isSpam = function (message){ // returns true if the message is spam and false otherwise
      if (this.messages.indexOf(message) != -1) {
        return true; // TODO: maybe put back the messages in the queue? not sure.
      } else {
        this.messages.push(message);
        setTimeout(pop, this.t, this.messages);
        console.log(this.messages);
        return false;
      }
    }
    this.changeTimeout = function (timeout){// changes the timeout
      this.t = timeout;
    }
    function pop(messages) { // doing this in an anonymous function throws. i give up on javascript.
      messages.shift();
      console.log(messages);
    }
  }

};
