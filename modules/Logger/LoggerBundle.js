var bobot = require('../../src/bot');

function Logger(ircd, conf) {
    this.ircd = ircd;
    this.conf = conf;
};

Logger.prototype.init = function() {
    
    var mychan = this.conf.channel;
    var botconf = this.conf.bot;
   
    var bot = new bobot( botconf.uid, botconf.vhost, botconf.nick, botconf.ident, botconf.modes, botconf.realname );
    this.ircd.introduceBot( bot );
    bot.join(mychan);

    this.ircd.on('filter_introduce', function (f) {
        if (!f.addby) {
            bot.msg(mychan, '\00304(SpamFilter)\00314 Le serveur ajoute ' + f.regex + '\003 ');
        } else {
            bot.msg(mychan, '\00304(SpamFilter)\00314 ' + f.addby + ' ajoute ' + f.regex + '\003 ');
        }
    });
    
    this.ircd.on('filter_destroy', function (regex, by) {
        bot.msg(mychan, '\00304(SpamFilter)\00314 ' + by + ' suprime ' + regex + '\003 ');
    });
 
    this.ircd.on('del_xline', function (delby, type, line, name) {
        bot.msg(mychan, '\00304\002(' + name + ')\002\00314 ' + delby + ' supprime ' + line + '\003 ');
    });
    
    this.ircd.on('add_xline', function (x) {
        bot.msg(mychan, '\00304\002(' + x.name() + ')\002\00314 ' + x.addby + ' ajoute ' + x.addr + ' :' + x.reason + '\003 ');
    });

    this.ircd.on('user_opertype', function (u, type) {
        bot.msg(mychan, '\00304\002(Oper)\002\00314 ' + u.nick + ' ' + type + '\003 ');
    });
    
    this.ircd.on('user_operquit', function (u, type, reason) {
        bot.msg(mychan, '\00304\002(' + type + ')\002\00314 ' + u.nick + '\003 ' + reason);
    });
    
    this.ircd.on('user_chg_vhost', function (u, vhost) {
        bot.msg(mychan, '\00310(\002Vhost\002)\00314 ' + u.nick + ' change de vhost en ' + vhost + '\003');
    });
    
    this.ircd.on('user_has_role', function (u, role) {
        bot.msg(mychan, '\00304(\002Role\002)\00314 ' + u.nick + ' a maintenant le role ' + u.role + '\003');
    });
    
    this.ircd.on('add_ext_channel_mode', function (c, ext) {
        var res;
        switch (ext.type) {
            case 'b':
                res = ' a banni ' + ext.target;
                break;
            case 'e':
                res = ' ajoute ' + ext.target + ' en exeption';
                break;
            case 'Y':
                res = ' a promu ' + ext.target + ' network administrateur';
                break;
            case 'q':
                res = ' a promu ' + ext.target + ' owner';
                break;
            case 'a':
                res = ' a promu ' + ext.target + ' administrateur';
                break;
            case 'o':
                res = ' a promu ' + ext.target + ' opérateur';
                break;
            case 'h':
                res = ' a promu ' + ext.target + ' modérateur';
                break;
            case 'v':
                res = ' a promu ' + ext.target + ' voice';
                break;
            case 'I':
                res = ' ajoute ' + ext.target + ' en invitation';
                break;
            case 'w':
                res = ' ajoute ' + ext.target + ' en autoop';
                break;
            default:
                res = ' add_ext_channel_mode in type: ' + ext.type + ' target: ' + ext.target;
        }
        
        bot.msg(mychan, '\00310(ExtMode)\00314 ' + ext.by + res + ' sur ' + c.name + '\003');
    });
       
    this.ircd.on('del_ext_channel_mode', function (c, type, target, by) {
       bot.msg(mychan, by + ' del_ext_channel_mode in ' + c.name + ' type: ' + type + ' target: ' + target);
    });
    
    this.ircd.on('user_add_mode', function (u, mode, t) {
        bot.msg(mychan, '\00310(Add UMode)\00314 ' + t.nick + ' ajoute le mode ' + mode + ' à ' + u.nick + '\003');
    });
    
    this.ircd.on('user_del_mode', function (u, mode, t) {
       bot.msg(mychan, '\00310(Del UMode)\00314 ' + t.nick + ' enlève le mode ' + mode + ' à ' + u.nick + '\003');
    });
    
    this.ircd.on('channel_add_mode', function (u, mode, c) {
        bot.msg(mychan, '\00306(Add CMode)\00314 ' + u.nick + ' ajoute le mode ' + mode + ' sur ' + c.name + '\003');
    });
    
    this.ircd.on('channel_del_mode', function (u, mode, c) {
       bot.msg(mychan, '\00306(Del CMode)\00314 ' + u.nick + ' enlève le mode ' + mode + ' sur ' + c.name + '\003');
    });
    
    this.ircd.on('user_has_badreal', function (u, realname) {
        bot.msg(mychan, '\00304(Bad realname)\00314 ' + u.nick + ': ' + realname + '\003');
    });
   
    this.ircd.on('user_change_realname', function (u, lastreal) {
        bot.msg(mychan, '\00306(realname)\00314 ' + u.nick + ' change de realname en ' + u.realname + '\003');
    });
    
    this.ircd.on('user_introduce', function (u) {
        bot.msg(mychan, '\00305(Connection)\00314 ' + u.nick + '!' + u.ident + '@' + u.host + ':' + u.realname +' (' + u.ip + ')\003');
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

        bot.msg(mychan, '\00305(GéoInfos)\00314 ' + u.nick + geo + '\003');
    });
   
    this.ircd.on('user_destroy', function (nick, reason) {
        bot.msg(mychan, '\00305(Déconnection)\00314 ' + nick + '\003: ' + reason);
    }); 
   
    this.ircd.on('server_introduce', function (s) {
        bot.msg(mychan, '\00304(\002Server\002)\00314 ' + s.name + ' rejoint le réseau.\003');
    });
 
    this.ircd.on('channel_introduce', function (c) {
        bot.msg(mychan, '\00310(Ouverture)\00314 Le salon ' + c.name + ' est maintenant ouvert.\003');
    }); 

    this.ircd.on('channel_destroy', function (name) {
        bot.msg(mychan, '\00304(Fermeture)\00314 Le salon ' + name + ' est maintenant fermé.\003');
    }); 

    this.ircd.on('server_destroy', function (name, reason) {
        bot.msg(mychan, '\00304(\002NetSplit\002)\00314 ' + name + '\003 : '+ reason);
    });
   
    this.ircd.on('user_nick', function (u, last) {
        bot.msg(mychan, '\00306(nick)\00314 ' + last + ' change de pseudo en ' + u.nick + '\003');
    });

    this.ircd.on('channel_introduce_topic', function (c) {
    
    });
    
    this.ircd.on('channel_chg_topic', function (c, u) {
        bot.msg(mychan, '\00310(topic)\00314 ' + u.nick + ' change le topic de ' + c.name + ' :\003 ' + c.topic);
    });
   
    this.ircd.on('user_kick', function (u, target, c, reason) {
        bot.msg(mychan, '\00310(kick)\00314 ' + u.nick + ' kick ' + target.nick + ' sur ' + c.name + '\003 ' + reason);
    });
   
    this.ircd.on('user_accountname', function (u, account) {
        bot.msg(mychan, '\00306(LogIn)\00314 ' + u.nick + ' => ' + account + '\003');
    });

    this.ircd.on('user_accountname_off', function (u) {
        bot.msg(mychan, '\00316(LogOut)\00314 ' + u.nick + '\003');
    }); 
   
    this.ircd.on('user_is_mineur', function (u) {
        bot.msg(mychan, '\00304(' + u.nick + ')\00314 est mineur ' + u.age + ' ans\003');
    });

    this.ircd.on('user_part', function (u, c, partMsg) {
        bot.msg(mychan, '\00310(part)\00314 ' + u.nick + ' part de ' + c.name + ' ('+c.countUsers+' Users)\003 ' + partMsg);
    }); 
    
    this.ircd.on('user_join', function (u, c) {
        bot.msg(mychan, '\00310(join)\00314 ' + u.nick + ' entre sur ' + c.name + ' ('+c.countUsers+' Users)\003');
    });

    this.ircd.on('user_away_off', function (u) {
        bot.msg(mychan, '\00306(Away)\00314 ' + u.nick + ' revient d\'absense\003');
    });

    this.ircd.on('user_away_on', function (u, awayMsg) {
        bot.msg(mychan, '\00306(Away)\00314 ' + u.nick + ' ' + awayMsg + '\003');
    });
};

module.exports = Logger;
