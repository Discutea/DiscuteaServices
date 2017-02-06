var bobot = require('../../src/bot');

function Logger(ircd) {
    this.ircd = ircd;
};

Logger.prototype.init = function() {
   var bot = new bobot.Bot( 'AAAAAA', 'jjj', 'Logger' );
   this.ircd.introduceBot( bot );
   bot.join('#Node.Js');
   
   this.ircd.on('user_mode', function (u, modes) {
       bot.msg('#Node.Js', u.nick + ' MODES ' + modes);
   });

   this.ircd.on('user_introduce', function (u) {
       bot.msg('#Node.Js', u.nick + ' is introduce');
   });   
   
   this.ircd.on('user_destroy', function (nick, reason) {
       bot.msg('#Node.Js', nick + ' is destroy => ' + reason);
   }); 
   
   this.ircd.on('server_introduce', function (s) {
       bot.msg('#Node.Js', s.name + ' server is introduce');
   });
 
   this.ircd.on('channel_introduce', function (c) {
       bot.msg('#Node.Js', c.name + ' channel is introduce');
   }); 

   this.ircd.on('user_join', function (u, c) {
       bot.msg('#Node.Js', u.nick + ' join ' + c.name);
   });

   this.ircd.on('user_part', function (u, c) {
       bot.msg('#Node.Js', u.nick + ' part ' + c.name);
   });  

   this.ircd.on('channel_destroy', function (name) {
       bot.msg('#Node.Js', name + ' channel is destroy');
   }); 

   this.ircd.on('user_destroy', function (nick) {
       bot.msg('#Node.Js', nick + ' user is destroy');
   });

   this.ircd.on('server_destroy', function (name) {
       bot.msg('#Node.Js', name + ' server is destroy');
   });   

};

module.exports = Logger;
