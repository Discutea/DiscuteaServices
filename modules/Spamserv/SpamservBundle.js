var robot = require('../../src/bot'),
    user = require('../../src/user'),
    filter = require('../../src/filter');

    
function Spamserv(ircd, conf, bot, sql) {
    if (!(bot instanceof robot)) {return;}
    
    this.ircd = ircd;
    this.conf = conf;
    this.bot = bot;
    this.channel = conf.channel;
};

Spamserv.prototype.init = function() {
    var that = this;
    that.bot.join(that.channel);
    that.bot.send('MODE', this.channel, '+h', that.bot.nick, ':');

    this.ircd.emitter.on('kick'+that.bot.me+'', function (splited, data) {
        that.bot.join(splited[2]);
    });
    
    this.ircd.emitter.on('privmsg'+that.bot.me+'', function (u, splited, splited2, data) {
        if (!(u instanceof user)) {return;}
    
        if (!u.isOperator()) {
            that.bot.notice(u.nick, '\00304Permission denied!');
            return;
        }
        
        req = splited[3];
        if ( (typeof req === 'string') && (req.charAt(0) == ":") ) {
            req = req.substring(1);
        }
        data = splited.slice(4,splited.length);
        switch (req.toUpperCase()) {
          case 'SPAMLIST':
            that.cmdSpamList(u);
            break;
          case 'DELSPAM':
            that.cmdDelSpam(u, data);
            break;
          case 'SPAM':
            that.cmdSpam(u, data);
            break;
        }
    }); 
};

Spamserv.prototype.cmdSpam = function(u, data) {

    if ( (!data) || (!data[0]) ) {
        this.bot.notice(u.nick, '\00314[SPAM] \00304Attention de ne pas faire n\'importe quoi');
        this.bot.notice(u.nick, '\00314[NOTE] \00302Les caractères sont déjà échappés');
        this.bot.notice(u.nick, '\00314[NOTE] \00302Vous ne pouvez pas ajouter de regex avec cette commande utilisez /filter');
        this.bot.notice(u.nick, '\00314[UTILISATION] \00302!spam www.exemple.com');
        return;
    }
    
    data = data.join('[\\s]'); 
    if (data.length < 9) {
        this.bot.notice(u.nick, '\00304[ERREUR] \00302La chaine ' + data + ' est trop courte');
        return;
    }
    
    action = 'gline';
    flags = 'pnPqo';
    regex = data.replace(/\./g, '\\.').replace(/\//g, '\\/').replace(/\*/g, '');
    duration = 3600;
    reason = 'Spam_' + Math.floor(1000 + Math.random() * 9000);
    
    this.bot.send('FILTER', regex, action, flags, duration, reason);
    this.ircd.introduceFilter(action, flags, regex, this.bot.nick, duration, reason);
    this.bot.msg('#Equipe', '\00304(SpamFilter)\003 \00314'+ u.nick +' ajoute ' + regex );
}

Spamserv.prototype.cmdDelSpam = function(u, data) {

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

Spamserv.prototype.cmdSpamList = function(u) {
    
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

module.exports = Spamserv;