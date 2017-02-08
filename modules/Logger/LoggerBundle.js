var bobot = require('../../src/bot');

function Logger(ircd) {
    this.ircd = ircd;
};

Logger.prototype.init = function() {
    
   var mychan = '#Node.Js';

   var bot = new bobot( 'AAAAAA', 'NodeJs.Discutea.com', 'Logger', 'Discutea', '+IWBOiows +*', '-- X Bot' );
   this.ircd.introduceBot( bot );
   bot.join(mychan);
   
   this.ircd.on('add_ext_channel_mode', function (c, ext) {
       bot.msg(mychan, ext.by + ' add_ext_channel_mode in ' + c.name + ' type: ' + ext.type + ' target: ' + ext.target);
   });
  
   this.ircd.on('del_ext_channel_mode', function (c, type, target, by) {
       bot.msg(mychan, by + ' del_ext_channel_mode in ' + c.name + ' type: ' + type + ' target: ' + target);
   });
   
   this.ircd.on('user_mode', function (u, modes) {
       bot.msg(mychan, u.nick + ' MODES ' + modes);
   });

   this.ircd.on('user_change_realname', function (u, lastreal) {
       bot.msg(mychan, u.nick + ' user_change_realname ' + lastreal + ' >> ' + u.realname);
   });

   this.ircd.on('channel_introduce_topic', function (c) {
       bot.msg(mychan, c.topicBy + ' channel_introduce_topic ' + c.name + ' >> ' + c.topic);
   });
   
   this.ircd.on('user_has_badreal', function (u, realname) {
       bot.msg(mychan, u.nick + ' user_has_badreal ' + realname);
   });
   
   this.ircd.on('user_has_geoinfos', function (u) {
       var geo = '';
       
       if (u.country !== undefined) {
          geo = ' country: ' + u.country; 
       }
       
       if (u.region !== undefined) {
          geo = geo + ' region: ' + u.region; 
       }

       if (u.city !== undefined) {
          geo = geo + ' city: ' + u.city; 
       }

       bot.msg(mychan, u.nick + ' user_has_geoinfos ' + geo);

   });
   
   this.ircd.on('user_introduce', function (u) {
       bot.msg(mychan, u.nick + ' is introduce');
   });   
   
   this.ircd.on('user_destroy', function (nick, reason) {
       bot.msg(mychan, nick + ' is destroy => ' + reason);
   }); 
   
   this.ircd.on('server_introduce', function (s) {
       bot.msg(mychan, s.name + ' server is introduce');
   });
 
   this.ircd.on('channel_introduce', function (c) {
       bot.msg(mychan, c.name + ' channel is introduce');
   }); 

   this.ircd.on('user_join', function (u, c) {
       bot.msg(mychan, u.nick + ' join ' + c.name + ' ('+c.countUsers+')');
   });

   this.ircd.on('user_part', function (u, c) {
       bot.msg(mychan, u.nick + ' part ' + c.name);
   });  

   this.ircd.on('channel_destroy', function (name) {
       bot.msg(mychan, name + ' channel is destroy');
   }); 

   this.ircd.on('server_destroy', function (name, reason) {
       bot.msg(mychan, name + ' server is destroy >> ' + reason);
   });

   this.ircd.on('user_away_off', function (u) {
       bot.msg(mychan, u.nick + ' away off');
   });

   this.ircd.on('user_away_on', function (u, awayMsg) {
       bot.msg(mychan, u.nick + ' away on => ' + awayMsg);
   });
   
   this.ircd.on('user_nick', function (u, last) {
       bot.msg(mychan, last + ' new nick => ' + u.nick);
   });

   this.ircd.on('channel_chg_topic', function (c, u) {
       bot.msg(mychan, u.nick + ' chg topic => ' + c.name + ' >' + c.topic);
   });
   
   this.ircd.on('user_kick', function (u, target, c, reason) {
       bot.msg(mychan, u.nick + ' kick => ' + target.nick + ' on ' + c.name + ' ==> ' + reason);
   });
   
   this.ircd.on('user_accountname', function (u, account) {
       bot.msg(mychan, u.nick + ' user_accountname => ' + account);
   });

   this.ircd.on('user_accountname_off', function (u) {
       bot.msg(mychan, u.nick + ' user_accountname_off');
   });   
   
   this.ircd.on('user_is_mineur', function (u) {
       bot.msg(mychan, u.nick + ' user_is_mineur age: ' + u.age);
   });

   
};

module.exports = Logger;
