exports = module.exports = Command;

var user = require('../../src/user'),
    server = require('../../src/server'),
    channel = require('../../src/channel'),
    nmap = require('libnmap'),
    filter = require('../../src/filter'),
    countries = require("i18n-iso-countries"),
    request = require('request');
    
function Command(ircd, bot, sql, channel)
{
    if (!(this instanceof Command)) { return new Command(ircd, bot, sql, channel); }
    this.ircd = ircd;
    this.bot = bot;
    this.sql = sql;
    this.channel = channel;
}

Command.prototype.dispatcher = function(u, cmd, data, locale) {
    switch (cmd.toUpperCase()) {
        case 'HELP':
            this.cmdHelp(u);
            break;
        case 'RULES':
            this.cmdRules(u, locale);
            break;
        case 'MYINFOS':
            this.cmdMyInfos(u, data);
            break;
        case 'KHELP':
            this.cmdKHelp(u, data);
            break;
        case 'JHELP':
            this.cmdJHelp(u, data);
            break;
        case 'NICKLOCK':
            this.cmdNickLock(u, data);
            break;
        case 'NICKUNLOCK':
            this.cmdNickUnLock(u, data);
            break;
        case 'INFOUSER':
            this.cmdInfoUser(u, data);
            break;
        case 'NMAP':
            this.cmdNmap(u, data);
            break;
        case 'WARNING':
            this.cmdWarning(u, data);
            break;
        default:
            this.bot.msg(this.channel, '\00304Command:\003 ' + u.nick + ' cmd: ' + cmd + ' data: ' + data);
            break;
    }    
}


Command.prototype.cmdWarning = function(u, data) {
    if (!u.isAdmin()) {
        this.bot.notice(u.nick, '\00304Permission denied!');
        return;
    }
    
    if ( (!data) || (!data[0]) || (!data[1]) ) {
        this.bot.notice(u.nick, '\00314[Warning] \00302Envoi un message important a un utilisateur');
        this.bot.notice(u.nick, '\00314[NOTE] \00302Capture: https://github.com/Discutea/DiscuteaServices/issues/12');
        this.bot.notice(u.nick, '\00314[UTILISATION] \00302!warning pseudo');
        return;
    }
    
    var target = this.ircd.findBy(this.ircd.users, 'nick', data[0]);
    if (!(target instanceof user)) {
        this.bot.notice(u.nick, '\00304 Désolé je ne trouve pas ' + data[0]);
        return;
    } else {
        var msg = data.slice(1, data.length).join(' ');
        this.bot.notice(target.nick, 'Important: ' + msg);
        this.bot.notice(u.nick, '\00304 Envoyé a ' + target.nick + ' => ' + msg);
    }
}

Command.prototype.cmdNmap = function(u, data) {
    if (!u.isOperator()) {
        this.bot.notice(u.nick, '\00304Permission denied!');
        return;
    }

    if ( (!data) || (!data[0]) ) {
        this.bot.notice(u.nick, '\00314[Nmap] \00302Recherche des informations sur l\'ip d\'un utilisateur.');
        this.bot.notice(u.nick, '\00314[NOTE] \00302Informations retourné sur le salon staff.');
        this.bot.notice(u.nick, '\00314[UTILISATION] \00302!nmap pseudo');
        return;
    }

    ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
    ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;

    if ( (ipv4Regex.test(data[0])) || (ipv6Regex.test(data[0])) ) {
        target = data[0];
    } else {
        target = this.ircd.findBy(this.ircd.users, 'nick', data[0]);
        if (!(target instanceof user)) {
            this.bot.notice(u.nick, '\00304 Désolé je ne trouve pas ' + data[0]);
            return;
        } else {
            target = target.ip;
        }
    }
    
    var that = this;
    opts = {range: [target]};
 
    nmap.scan(opts, function(err, report) {
        if (err) {
            console.log(err);
            return;
        }

        for (item in report) {
            if (typeof report[item].host !== 'object') {
                that.bot.msg('#Equipe', '\00306 Nmap ' + data[0] + '\003 aucun port ouvert détécté.');
                return;
            }

            ports = report[item].host[0].ports[0].port;
            if (ports !== undefined) {
                for (i in ports) {
                    p = ports[i].item;
                    that.bot.msg('#Equipe', '\00306 Nmap ' + data[0] + '\003 Port: \002' + p.portid + '\002 Protocol: \002' + p.protocol);
                }
            }
        }
        that.bot.msg('#Equipe', '\00304 End of NMAP');
    });
    
    this.bot.msg('#Equipe', '\00304 Nmap en cours sur ' + data[0] + ' demandé pas ' + u.nick);
}

Command.prototype.informationUser = function(t, by) {
    if (!(t instanceof user)) {return;}
    if (by instanceof user) {
        this.bot.msg('#Equipe', '\00304'+by.nick+' Demande des informations sur '+t.nick+'\003');
    } else {
        if (by === 'help') {
            this.bot.notice('#Equipe', '\00304'+t.nick+' entre sur #Aide\003"');
        } else {
            return;
        }
    }
    
    this.bot.msg('#Equipe', 'Information sur ' + t.nick);
    this.bot.msg('#Equipe', '-');
    this.bot.msg('#Equipe', '\00306Générale:\003 '+t.nick+'\002 '+t.ident+'@'+t.vhost + ' ('+t.iptype+')');
    this.bot.msg('#Equipe', '\00306Asv:\003 '+ t.realname);
    this.bot.msg('#Equipe', '\00306Modes:\003 ' + t.modes.join(''));
    
    if (t.server instanceof server) {
        this.bot.msg('#Equipe', '\00306Server:\003 ' + t.server.name);
    }
    
    if (t.channels.length >= 1) {
        chans = [];
        t.channels.forEach(function(chan) {
            if (chan instanceof channel) {
                chans.push(chan.name);
            }
        });
        this.bot.msg('#Equipe', '\00306Salons:\003 ' + chans.join(', '));
        delete chans;
    }
    
    
    if (t.account) {
        this.bot.msg('#Equipe', '\00303\002'+t.nick+'\002 est connecté en temps que \002'+t.account+'\002.\003');
    } else {
        this.bot.msg('#Equipe', '\00304\002'+t.nick+'\002 n\'est pas enregistré');
    }

    if(t.ssl) {
        this.bot.msg('#Equipe', '\00303'+t.nick+' utilise une connexion ssl.\003');
    } else {
        this.bot.msg('#Equipe', '\00304'+t.nick+' n\'utilise pas de connexion ssl.\003');
    }
    
    if(t.opertype) {
        this.bot.msg('#Equipe', '\00304'+t.nick+' est '+t.opertype+'.');
    }
		
    this.bot.msg('#Equipe', '\00306Version:\003 ' + t.version);
    
    if (t.country) {
        this.bot.msg('#Equipe', '\00306GeoLocalisation:\003 ' + countries.getName(t.country, "fr") + ' - ' + t.country);
    }
    if (t.region) {
        this.bot.msg('#Equipe', '\00306GeoRegion:\003 ' + t.region);
    }
    if (t.region) {
        this.bot.msg('#Equipe', '\00306GeoCity:\003 ' + t.city);
    }
    this.bot.msg('#Equipe', '-');
    
    if (t.cookies !== undefined) {
        console.log(t.cookies);
        if (t.cookies === 'true') {
            this.bot.msg('#Equipe', '\00303'+t.nick+' Cookies : \00304\002OUI');
        } else {
            this.bot.msg('#Equipe', '\00303'+t.nick+' Cookies : \00304\002NON');
        }
    }

    if (t.tactile !== undefined) {
        if (t.tactile === 'true') {
            this.bot.msg('#Equipe', '\00303'+t.nick+' Tactile : \00304\002OUI');
        } else {
            this.bot.msg('#Equipe', '\00303'+t.nick+' Tactile : \00304\002NON');
        }
    }
    
    if (t.enc) {
        this.bot.msg('#Equipe', '\00306'+t.nick+' Encodage:\003 \002' + t.enc);
    }
    
    if (t.lang) {
        this.bot.msg('#Equipe', '\00306'+t.nick+' Langues:\003 \002' + t.lang);
    }

    if (t.resolution) {
        this.bot.msg('#Equipe', '\00306'+t.nick+' Résolution:\003 \002' + t.resolution);
    }
    
    if (t.agent) {
        var parser = require('ua-parser-js');
        var ua = parser( t.agent );
        
        this.bot.msg('#Equipe', '\00306'+t.nick+' Browser:\003 \002' + ua.browser.name + ' v: ' + ua.browser.version + ' m: ' + ua.browser.major);
        this.bot.msg('#Equipe', '\00306'+t.nick+' Engine:\003 \002 v: ' + ua.engine.version + ' n: ' + ua.engine.name);
        this.bot.msg('#Equipe', '\00306'+t.nick+' OS:\003 \002 '+ ua.os.name + ua.os.version);
        this.bot.msg('#Equipe', '\00306'+t.nick+' CPU:\003 \002 '+ ua.cpu.architecture);
        
    }

}

Command.prototype.cmdInfoUser = function(u, data) {
    if (!u.isHelper()) {
        this.bot.notice(u.nick, '\00304Permission denied!');
        return;
    }

    if ( (!data) || (!data[0]) ) {
        this.bot.notice(u.nick, '\00314[INFOUSER] \00302Recherche des informations sur un utilisateur.');
        this.bot.notice(u.nick, '\00314[NOTE] \00302Informations retourné sur le salon staff.');
        this.bot.notice(u.nick, '\00314[UTILISATION] \00302!info pseudo');
        return;
    }

    target = this.ircd.findBy(this.ircd.users, 'nick', data[0]);
    if (!(target instanceof user)) {
        this.bot.notice(u.nick, '\00304 Désolé je ne trouve pas ' + data[0]);
        return;
    }
    
    this.informationUser(target, u);
}


Command.prototype.cmdNickLock = function(u, data) {
    if (!u.isModerator()) {
        this.bot.notice(u.nick, '\00304Permission denied!');
        return;
    }

    if ( (!data) || (!data[0]) ) {
        this.bot.notice(u.nick, '\00314[NICKLOCK] \00302 Cette empeche un utilisateur de changer de pseudo');
        this.bot.notice(u.nick, '\00314[INFO] \00302 La commande peut être suivis d\'un second pseudo pour bloquer avec le second');
        this.bot.notice(u.nick, '\00314[UTILISATION] \00302!nicklock pseudo pseudo1');
        this.bot.notice(u.nick, '\00314[EXPLICATIONS] \00302Pour l\'exemple ci-dessus pseudo serra changé en pseudo1 et l\'utilisateur serra ensuite bloqué avec pseudo1');
        return;
    }
    
    target = this.ircd.findBy(this.ircd.users, 'nick', data[0]);
    if (!(target instanceof user)) {
        this.bot.notice(u.nick, '\00304 Désolé je ne trouve pas ' + data[0]);
        return;
    }
    
    if ( (data[1] === undefined) || (data[1].length < 4) ) {
        rand = Math.floor(Date.now() / 1000).toString().substring(4);
        newnick = 'Locked_' + rand;
    } else {
       newnick = data[1];
    }
    
    this.bot.send('NICKLOCK', target.nick, newnick, ':');
    this.bot.msg('#Equipe', '\00304(NickLock)\00314 '+u.nick+' bloque ' + target.nick + ' en ' + newnick);
}

Command.prototype.cmdNickUnLock = function(u, data) {
    if (!u.isModerator()) {
        this.bot.notice(u.nick, '\00304Permission denied!');
        return;
    }

    if ( (!data) || (!data[0]) ) {
        this.bot.notice(u.nick, '\00314[NICKLOCK] \00302 Debloque un pseudo prècedement bloqué');
        return;
    }
    
    target = this.ircd.findBy(this.ircd.users, 'nick', data[0]);
    if (!(target instanceof user)) {
        this.bot.notice(u.nick, '\00304 Désolé je ne trouve pas ' + data[0]);
        return;
    }
        
    this.bot.send('NICKUNLOCK', target.nick);
    this.bot.msg('#Equipe', '\00304(NickLock)\00314 '+u.nick+' debloque ' + target.nick);
}

Command.prototype.cmdKHelp = function(u, data) {
    if (!u.isHelper()) {
        this.bot.notice(u.nick, '\00304Permission denied!');
        return;
    }

    if ( (!data) || (!data[0]) ) {
        this.bot.notice(u.nick, '\00314[KAIDE] \00302 Cette commande kick un utilisateur de #Aide');
        this.bot.notice(u.nick, '\00314[KAIDE] \00302 La commande doit être suivis d\'un pseudo');
        this.bot.notice(u.nick, '\00314[UTILISATION] \00302!kaide pseudo');
        return;
    }
    
    target = this.ircd.findBy(this.ircd.users, 'nick', data[0]);
    if (!(target instanceof user)) {
        this.bot.notice(u.nick, '\00304 Désolé je ne trouve pas ' + data[0]);
        return;
    }
        
    this.bot.send('KICK', '#Aide', target.nick, 'Salon réservé à l\'aide ! Merci de ne pas squatter.');
}

Command.prototype.cmdJHelp = function(u, data) {
    if (!u.isHelper()) {
        this.bot.notice(u.nick, '\00304Permission denied!');
        return;
    }
  
    if ( (!data) || (!data[0]) ) {
        this.bot.notice(u.nick, '\00314[JAIDE] \00302 Cette commande force un utilisateur à joindre #Aide');
        this.bot.notice(u.nick, '\00314[JAIDE] \00302 La commande doit être suivis d\'un pseudo');
        this.bot.notice(u.nick, '\00314[UTILISATION] \00302!jaide pseudo');
        return;
    }

    target = this.ircd.findBy(this.ircd.users, 'nick', data[0]);
    if (!(target instanceof user)) {
        this.bot.notice(u.nick, '\00304 Désolé je ne trouve pas ' + data[0]);
        return;
    }
    
    this.bot.send('SAJOIN', target.nick, '#Aide');
    this.bot.msg('#Aide', 'Bonjour ' + target.nick + ', ' + u.nick + ' vous a forcé à rejoindre #Aide merci de patienter quelques instants il va vous expliquer pourquoi.');
}

Command.prototype.cmdHelp = function(u) {
    this.bot.notice(u.nick, '\00303Discutea Irc Services');
    this.bot.notice(u.nick, '-');
    this.bot.notice(u.nick, '\002\00304[INFO] \002\00302 Tapez la commande seul pour obtenir plus d\'aide.');
    this.bot.notice(u.nick, '\00301[\002\00303Tchatteur\002\00301]');
    this.bot.notice(u.nick, '\002\00303!regles\002\00304 ->\00302 Affiche les règles du tchat');
    this.bot.notice(u.nick, '-');
    
    if (u.isHelper()) {
        this.bot.notice(u.nick, '\00301[\002\00307Helpeurs\002\00301]');
        this.bot.notice(u.nick, '\002\00307!kaide (pseudo)\002\00302 Expulse un utilisateur de #Aide');
        this.bot.notice(u.nick, '\002\00307!jaide (pseudo) \002\00302 Sajoin un utilisateuur sur #Aide');
        this.bot.notice(u.nick, '-');
    }

    if (u.isModerator()) {
        this.bot.notice(u.nick, '\00301[\002\00306Modérateur\00301]');
        this.bot.notice(u.nick, '\002\00306!nicklock (pseudo)\002\00302 Empeche l\'utilisateur de changer de pseudo.');
        this.bot.notice(u.nick, '\002\00306!nickunlock (pseudo)\002\00302 Debloque un utilisateur bloqué avec NICKLOCK');
        this.bot.notice(u.nick, '\002\00306!badnicks\002\00302 Affiche la liste des badnicks');
        this.bot.notice(u.nick, '\002\00306!inco pseudo\002\00302 Ajoute un pseudo incorrect a la base et change le pseudo');
        this.bot.notice(u.nick, '\002\00306!addnick badnick\002\00302 Ajoute un pseudo incorrect dans la base de donnée');
        this.bot.notice(u.nick, '\002\00306!delnick badnick\002\00302 Retire un pseudo incorrect dans la base de donnée');
        this.bot.notice(u.nick, '-');
    }
    
    if (u.isOperator()) {
        this.bot.notice(u.nick, '\00301[\002\00310AOP && SOP\002\00301]');
        this.bot.notice(u.nick, '\002\00310!nmap (pseudo | ipv4)\002\00302 Lance un NMAP sur une ip');
        this.bot.notice(u.nick, '\002\00310!spam (spam à ajouter)\002\00302 Ajoute une chaine de spam');
        this.bot.notice(u.nick, '\002\00310!spamlist\002\00302 Affiche la liste des spams');
        this.bot.notice(u.nick, '\002\00310!delspam (id)\002\00302 Retire un spam de la liste');
        this.bot.notice(u.nick, '-');
    }

    if (u.isAdmin()) {
        this.bot.notice(u.nick, '\00301[\002\00304ADMIN\002\00301]');
        this.bot.notice(u.nick, '\002\00310!warning pseudo message\002\00302 Envoi un message important a un utilisateur');
        this.bot.notice(u.nick, '-');
    }

    this.bot.notice(u.nick, '\00303GitHub: https://github.com/Discutea/DiscuteaServices/');
}


Command.prototype.cmdMyInfos = function(u, data) {
    var vsplited = data.join(' ').split(':::');

    if (vsplited.length > 1) {
      vsplited.forEach(function(infos) {
        info = infos.split(' ');
        if (typeof info[1] === 'string') {
          switch (info[0]) {
            case 'c':
              u.cookies = info[1];
              break;
            case 'ag':
              u.agent = info.slice(1, info.length).join(' ');
              break;
            case 'enc':
              u.enc = info.slice(1, info.length).join(' ');
              break;
            case 'lang':
              u.lang = info.slice(1, info.length).join(' ');
              break;
            case 'r':
              u.tactile = info[1];
              u.resolution = info[2];
              break;
          }
        }
      });
    }
}

Command.prototype.cmdRules = function(u, locale) {
    if (!locale) {return;}
    var that = this;
    
    if (locale === 'en') {
        url = 'https://discutea.net/rules.txt';
    } else {
        url = 'https://discutea.'+locale+'/rules.txt';
    }
    
    request.get(url, function (error, response, lines) {
        if (!error && response.statusCode == 200) {
            lines.split(/\n|\r/).forEach(function(line) {
                if (!line) {
                    that.bot.msg(u.nick, '-');
                } else {
                    that.bot.msg(u.nick, line);
                }
            });
        } else {
            this.bot.notice(u.nick, '\00304Désolé une erreur c\'est produite!');
        }
    });
}
