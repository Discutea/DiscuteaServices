var bobot = require('../../src/bot');
var user = require('../../src/user');
var filter = require('../../src/filter');
var countries = require("i18n-iso-countries");
var removeDiacritics = require('diacritics').remove;
var getYouTubeID = require('get-youtube-id');
var request = require('request');
var mysql = require('mysql2');

function Discutea(ircd, conf) {
    this.ircd = ircd;
    this.conf = conf;
    this.bot = undefined;
    this.channel = '#Node.Js';
    this.conf.badreal.rage
    
    this.sql = mysql.createConnection(conf.sql);
    this.youtubekey = conf.youtube_api;
};

Discutea.prototype.webirc = function(bot, sql) {
    matched = false;
    sql.query('SELECT * FROM command', function (err, results) {
        results.forEach(function(res) {
            if ( (res.message) && (res.target) ) {
                matched = true;
                bot.msg(res.target, '(\002\00304WebSite\003\002) \00314' + res.message + '\003');
            }
        });
        if (matched) {
            sql.query('TRUNCATE TABLE command');
        }
    });
}

Discutea.prototype.init = function() {
    
    var mychan = this.conf.channel;
    var botconf = this.conf.bot;
    var bot = new bobot( botconf.uid, botconf.vhost, botconf.nick, botconf.ident, botconf.modes, botconf.realname );
    this.ircd.introduceBot( bot );
    bot.join(mychan);
    this.bot = bot;
    setInterval(this.webirc, 15000, bot, this.sql);    
    var that = this;

    this.ircd.emitter.on('privmsg'+bot.me+'', function (u, splited, splited2, data) {
        if (!(u instanceof user)) {return;}
        locale = 'en';
        
        switch (u.server.name) {
            case 'irc.discutea.fr':
                locale = 'fr';
                break;
            case 'irc.discutea.es':
                locale = 'es';
                break;
        }
        
        cmd = splited[3];
        if ( (typeof cmd === 'string') && (cmd.charAt(0) == ":") ) {
            cmd = cmd.substring(1);
        }
        data = splited.slice(4,splited.length);
        that.cmdDispatcher(u, cmd, data, locale);
    });

    this.ircd.emitter.on('user_join#Ados', function (u, c) {
        if ( (!u.role) && (u.age > 19) ) {
            that.bot.send('MODE', '#Ados', '+s');
            that.bot.send('MODE', '#Ados', '+e', '*!*@*discutea.com');
            that.bot.send('MODE', '#Ados', '+b', '*!*@' + u.vhost, ':');
            that.bot.send('MODE', '#Ados', '+bbbbbbbbbb', 'r:--* r:2* r:3* r:4* r:5* r:6* r:7* r:2* r:8* r:9*', ':');
            that.bot.send('KICK', '#Ados', u.nick, 'Salon réservé aux moins de 19 ans.');
        }
    });
    
    this.ircd.emitter.on('user_has_badreal', function (u, realname) {
        that.processBadReal(u, realname);    
    });

    this.ircd.emitter.on('user_accountname', function (u, account) {
        that.bot.send('SAJOIN', u.nick, '#Vip-FR');
    });

    this.ircd.emitter.on('user_is_mineur', function (u) {
        that.bot.send('SAJOIN', u.nick, '#Ados');
    });
    
    this.ircd.emitter.on('user_has_role', function (u, role) {
        that.bot.send('SAJOIN', u.nick, '#Equipe');
        that.bot.send('SAJOIN', u.nick, '#Aide');
        that.bot.send('SAJOIN', u.nick, '#Ados');
    });
    
    this.ircd.emitter.on('SNONOTICE', function (splited, splited2, data) {
        //filter youtube\.com\/watch\?v\=[[:print:]]{11} block p :Discutea_Youtube
        //filter youtu\.be\/[[:print:]]{11} block p :Discutea_Youtube
        if ( (splited2[2] === 'FILTER') && (splited[12] === 'Discutea_Youtube' ) ) {
            nick = splited[4];
            u = that.ircd.findBy(that.ircd.users, 'nick', nick);
            if (!(u instanceof user)) {return;}
            now = Math.floor(Date.now() / 1000);
            
            if (u.stocks['ytb'] !== undefined) {
                timediff = now - u.stocks['ytb'];
                if (timediff < 120) {
                    wait = 120 - timediff;
                    that.bot.notice(nick, '\00304\002[Anti Flood]\002\003 Vous devez patienter encore ' + wait + ' secondes pour poster une nouvelle vidéo');
                    return;
                }
            }
            
            chan = splited[11].replace(':', '');
            vid = getYouTubeID( splited.slice(14, +splited.length) );

            youtubeapi = 'https://www.googleapis.com/youtube/v3/videos?id='+vid+'&key='+that.youtubekey+'&part=snippet&fields=items/snippet/title'
            
            request(youtubeapi, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    var infos = JSON.parse(body);
                    infos.items.forEach(function(info) {
                        u.stocks['ytb'] = now;
                        that.bot.msg(chan, '\002\00301You\00304Tube\003\002  \00301Partage de\002\00306 '+nick+' \002\00301Titre:\00306 ' + info.snippet.title);
                        that.bot.msg(chan, '\00306Lien:\003 https://youtu.be/' + vid);
                        that.bot.msg('#Musique', '\002\00301You\00304Tube\003\002  \00301Partage de\002\00306 '+nick+' sur ' + chan + ' \002\00301Titre:\00306 ' + info.snippet.title);
                        that.bot.msg('#Musique', '\00306Lien:\003 https://youtu.be/' + vid);
                    });
                }
            });
        }
    });
};

Discutea.prototype.processBadReal = function(u, realname) {
    // remove accents
    nreal = removeDiacritics(realname);
    if (!/^[0-9-]{2}[\s][mMHhfFwWCcX][\s][\x20-\x7E]{2,47}$/.test(nreal)) {
        exreal = realname.split(' ');
        var age = '--';
        var sexe = ' X ';
        
        if (this.conf.badreal.rage.test(exreal[0])) { age = exreal[0]; }
        if (this.conf.badreal.rsex.test(exreal[1])) { sexe = ' ' + exreal[1] + ' '; }
    
        nreal = age + sexe;
    
        if (u.region !== undefined) {
            nreal = nreal + u.region;
            if (nreal.length <= 30) {
                nreal = nreal + ' ' + countries.getName(u.country, "fr");
            }
        } else {
            if (u.country !== undefined) {
                nreal = nreal + countries.getName(u.country, "fr");
            } else {
                nreal = nreal + 'Inconnu';
            }
        }
        
        nreal = removeDiacritics(nreal);
    }
    
    nreal = nreal.replace(/\s\s+/g, ' ');
    nreal = nreal.replace(':', '');

    this.bot.send('CHGNAME', u.uid, nreal);    
}

Discutea.prototype.cmdDispatcher = function(u, cmd, data, locale) {
    switch (cmd.toUpperCase()) {
        case 'HELP':
            this.cmdHelp(u);
            break;
        case 'RULES':
            this.cmdRules(u, locale);
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
        case 'SPAMLIST':
            this.cmdSpamList(u);
            break;
        case 'DELSPAM':
            this.cmdDelSpam(u, data);
            break;
        case 'SPAM':
            this.cmdSpam(u, data);
            break;
        default:
            this.bot.msg(this.channel, '\00304Command:\003 ' + u.nick + ' cmd: ' + cmd + ' data: ' + data);
            break;
    }    
}

Discutea.prototype.cmdSpam = function(u, data) {
    if (!u.isOperator()) {
        this.bot.notice(u.nick, '\00304Permission denied!');
        return;
    }

    if ( (!data) || (!data[0]) ) {
        this.bot.notice(u.nick, '\00314[SPAM] \00304Attention de ne pas faire n\'importe quoi');
        this.bot.notice(u.nick, '\00314[NOTE] \00302Les caractères sont déjà échappés');
        this.bot.notice(u.nick, '\00314[NOTE] \00302Vous ne pouvez pas ajouter de regex avec cette commande utilisez /filter');
        this.bot.notice(u.nick, '\00314[UTILISATION] \00302!spam www.exemple.com');
        return;
    }

    action = 'gline';
    flags = 'pnPqo';
    regex = data[0].replace(/\./g, '\\.').replace(/\//g, '\\/').replace(/\*/g, '');
    duration = 3600;
    reason = 'Spam_' + Math.floor(1000 + Math.random() * 9000);
    
    this.bot.send('FILTER', regex, action, flags, duration, reason);
    this.ircd.introduceFilter(action, flags, regex, this.bot.nick, duration, reason);
    this.bot.msg('#Equipe', '\00304(SpamFilter)\003 \00314'+ u.nick +' ajoute ' + regex );
}

Discutea.prototype.cmdDelSpam = function(u, data) {
    if (!u.isOperator()) {
        this.bot.notice(u.nick, '\00304Permission denied!');
        return;
    }

    if ( (!data) || (!data[0]) || (!/^[0-9]{1,4}$/.test(data[0])) ) {
        this.bot.notice(u.nick, '\00314[DELSPAM] \00304Retire un spam');
        this.bot.notice(u.nick, '\00314[NOTE] \00302Utiliser !spamlist pour voir l\'id du spam');
        this.bot.notice(u.nick, '\00314[UTILISATION] \00302!delspam id');
        this.bot.notice(u.nick, '\00314[EXEMPLE] \00302!delspam 77');
        return;
    }

    id = parseInt(data[0]);

    fi = this.ircd.filters[id];    

    if (fi instanceof filter) {
        this.bot.send('FILTER', fi.regex);
        this.ircd.destroyFilter(fi, this.bot.nick);
        this.bot.msg('#Equipe', '\00304(SpamFilter)\003 \00314'+ u.nick +' retire ' + fi.regex);
    } else {
        this.bot.notice(u.nick, '\00304['+data[0]+'] Introuvable!');
    }
    
    this.bot.notice(u.nick, '\00304[IMPORTANT] \00314Recharger la liste après chaques ajouts ou supressions!');
}

Discutea.prototype.cmdSpamList = function(u) {
    if (!u.isOperator()) {
        this.bot.notice(u.nick, '\00304Permission denied!');
        return;
    }
    
    filters = this.ircd.filters;
    
    if (!filters) {
        this.bot.notice(u.nick, '\00302\La liste des Spams est vide.\003');
        return;
    }
    
    this.bot.notice(u.nick, '\00302--- Liste des Spams ---\003');
    
    var that = this;
    
    for (var i in filters){
        that.bot.notice(u.nick, '\00301\002(\002\00303'+i+'\002\00301)\002 \00307'+filters[i].regex+'\00304 -> ' + filters[i].action);
    }
    
    this.bot.notice(u.nick, '\00302--- Fin de la liste ---\003');
    this.bot.notice(u.nick, '\00304[IMPORTANT] \00314Recharger la liste après chaques ajouts ou supressions!');
}

Discutea.prototype.cmdNickLock = function(u, data) {
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
    
    if (data[1] === undefined) {
        newnick = data[0];
    } else {
       newnick = data[1];
    }
    
    this.bot.send('NICKLOCK', target.nick, newnick);
    this.bot.msg('#Equipe', '\00304(NickLock)\00314 '+u.nick+' bloque ' + target.nick + ' en ' + newnick);
}

Discutea.prototype.cmdNickUnLock = function(u, data) {
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

Discutea.prototype.cmdKHelp = function(u, data) {
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

Discutea.prototype.cmdJHelp = function(u, data) {
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

Discutea.prototype.cmdHelp = function(u) {
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
        this.bot.notice(u.nick, '\002\00304(( !inco ))\003\002 et \002\00304(( !delnick ))\003\002 \00302fonctionnent maintenant avec Anope');
        this.bot.notice(u.nick, '-');
    }
    
    if (u.isOperator()) {
        this.bot.notice(u.nick, '\00301[\002\00310AOP && SOP\002\00301]');
        this.bot.notice(u.nick, '\002\00310!spam (spam à ajouter)\002\00302 Ajoute une chaine de spam');
        this.bot.notice(u.nick, '\002\00310!spamlist\002\00302 Affiche la liste des spams');
        this.bot.notice(u.nick, '\002\00310!delspam (id)\002\00302 Retire un spam de la liste');
        this.bot.notice(u.nick, '\002\00304(( !addnick ))\002 \00302fonctionnent maintenant avec Anope');
        this.bot.notice(u.nick, '-');
    }

    this.bot.notice(u.nick, '\00303GitHub: https://github.com/Discutea/DiscuteaServices/');
}

Discutea.prototype.cmdRules = function(u, locale) {
    if (!locale) {return;}
    var that = this;
    
    if (locale === 'en') {
        url = 'https://discutea.net/rules.txt';
    } else {
        url = 'https://discutea.'+locale+'/rules.txt';
    }
    
    require('request').get(url, function (error, response, lines) {
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

module.exports = Discutea;
