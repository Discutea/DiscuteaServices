var robot = require('../../src/bot'),
    user = require('../../src/user'),
    countries = require("i18n-iso-countries"),
    removeDiacritics = require('diacritics').remove;

function Badserv(ircd, conf, bot, sql) {
    if (!(bot instanceof robot)) {return;}
    
    this.ircd = ircd;
    this.conf = conf;
    this.bot = bot;
    this.channel = conf.channel;
    this.sql = sql;
    this.badnicks = [];
};

Badserv.prototype.init = function() {
    var that = this;
    that.bot.join('#Opers');
    that.bot.send('MODE', this.channel, '+h', that.bot.nick, ':');
    this.updateBadnicks();

    this.ircd.emitter.on('kick'+that.bot.me+'', function (splited, data) {
        that.bot.join(splited[2]);
    });
    
    this.ircd.emitter.on('privmsg'+that.bot.me+'', function (u, splited, splited2, data) {
        if (!(u instanceof user)) {return;}
    
        if (!u.isModerator()) {
            that.bot.notice(u.nick, '\00304Permission denied!');
            return;
        }
        
        req = splited[3];
        if ( (typeof req === 'string') && (req.charAt(0) == ":") ) {
            req = req.substring(1);
        }
        data = splited.slice(4,splited.length);
        switch (req.toUpperCase()) {
          case 'BADNICK':
            that.cmdBadNick(u, data);
            break;
          case 'BADNICKLIST':
            that.cmdBadNickList(u);
            break;
          case 'ADDNICK':
            that.cmdBadNick(u, data, 'addnick');
            break;
          case 'DELNICK':
            that.cmdDelNick(u, data);
            break;
        }
    });

    this.ircd.emitter.on('user_has_geoinfos', function (u) {
        that.processRealname(u);     
    });
    
    this.ircd.emitter.on('user_nick', function (u, last) {
        that.verifyBadnick(u);
    });
    this.ircd.emitter.on('user_introduce', function (u) {
        that.verifyBadnick(u);
    });
    
    setInterval(function() { // check auto unban
        that.updateBadnicks();
    }, 3 * 60000);
};

Badserv.prototype.updateBadnicks = function() {
    var that = this;
    that.badnicks = [];
    that.sql.query('SELECT nick, addby FROM `anope_badnick` WHERE 1', function (err, results) {
        if (err) { console.log(err); }
        results.forEach(function(res) {
            that.pushBadnick(res.nick, res.addby);
        });
    });
}

Badserv.prototype.verifyBadnick = function(u) {
    if (!(u instanceof user)) {return;}
    
    if (u.nick.length < 4) {
        rand = Math.floor(Date.now() / 1000).toString().substring(4);
        newnick = u.nick + '_' + rand;
        this.bot.send('SANICK', u.nick, newnick, ':');
        return;
    }
    
    isBad = this.isBadnick(u.nick);
    if ( isBad !== false) {
        rand = Math.floor(Date.now() / 1000).toString().substring(4);
        newnick = 'Pseudo_' + rand;
        this.bot.send('SANICK', u.nick, newnick, ':');
        this.bot.msg(this.channel, '\00304(BadNick)\003 \00314'+u.nick+' matché sur ' + isBad.origin + ' changé en ' + newnick);
        this.bot.msg('#Equipe', '\00304(BadNick)\003 \00314'+u.nick+' matché sur ' + isBad.origin + ' (' + isBad.addby + ') changé en ' + newnick);
    } else if (this.verifyCaps(u.nick)) {
        newnick = u.nick.toLowerCase();
        newnick = newnick.charAt(0).toUpperCase() + newnick.slice(1);
        this.bot.send('SANICK', u.nick, newnick, ':');
    }
}

Badserv.prototype.cmdBadNickList = function(u) {
    var that = this;
    i = 1;
    this.badnicks.forEach(function(badnick) {
        if (typeof badnick === 'object') {
            that.bot.msg(u.nick, '\00314['+i+'] \00302'+badnick.origin+' ajouté par: ' + badnick.addby);
            i++;
        }
    });
    that.bot.msg(u.nick, '***');
}

Badserv.prototype.cmdDelNick = function(u, data) {
    var that = this;
    
    if ( (!data) || (!data[0]) ) {
        this.bot.notice(u.nick, '\00314[DEKNICK] \00302Retire un pseudo incorrect de la base de donnée.');
        this.bot.notice(u.nick, '\00314[UTILISATION] \00302!delnick pseudo');
        return;
    }
    
    badnick = data[0];
    this.sql.execute('DELETE FROM `anope_badnick` WHERE nick = ?', [badnick], function (err, results) {
        if ((err) || (!results.affectedRows)) {
            that.bot.notice(u.nick, '\00304[ERREUR] \00302' +badnick+ ', n\'a pas été retiré a la base de donnée.');
            return false;
        } else {
            that.updateBadnicks();
            that.bot.notice(u.nick, '\00303[BADNICK] \00302' +badnick+ ', a bien été retiré a la base de donnée.')
        }
    });
    
    return true;
}

Badserv.prototype.cmdBadNick = function(u, data, intention = 'badnick') {

    if ( (!data) || (!data[0]) ) {
        if (intention === 'badnick') {
            this.bot.notice(u.nick, '\00314[BADNICK] \00302Change un pseudo incorrect et l\'enregistre dans la base de donnée.');
            this.bot.notice(u.nick, '\00314[UTILISATION] \00302!inco pseudo ou !badnick pseudo');
        } else {
            this.bot.notice(u.nick, '\00314[ADDNICK] \00302Ajoute un pseudo incorrect dans la base de donnée sans le changer.');
            this.bot.notice(u.nick, '\00314[NOTE] \00302Les jokers (*) sont autorisés.');
            this.bot.notice(u.nick, '\00314[UTILISATION] \00302!addnick *badnick*');
        }
        return;
    }
    
    if (intention === 'badnick') {
        target = this.ircd.findBy(this.ircd.users, 'nick', data[0]);
        if (!(target instanceof user)) {
            this.bot.notice(u.nick, '\00304 Désolé je ne trouve pas ' + data[0]);
            return;
        }

        badnick = target.nick;
        rand = Math.floor(Date.now() / 1000).toString().substring(4);
        newnick = 'Pseudo_' + rand;
        
        this.bot.send('SANICK', badnick, newnick, ':');
        this.bot.msg('#Equipe', '\00304(BadNick)\003 \00314'+u.nick+' change ' + badnick + ' en ' + newnick);
    } else {
        badnick = data[0];
    }
        
    if (!this.insertBadnick(badnick, u.account)) {
        this.bot.notice(u.nick, '\00304[ERREUR] \00302' +badnick+ ', n\'a pas été ajouté a la base de donnée.');
    } else {
        this.bot.notice(u.nick, '\00303[BADNICK] \00302' +badnick+ ', a bien été ajouté a la base de donnée.');
    }
}

Badserv.prototype.insertBadnick = function(nick, addby) {
    var that = this;
    
    test = nick.replace(/\*/g, '');
    if (this.isBadnick(test) !== false) {
        return false;
    }
    
    this.sql.execute('INSERT INTO `anope_badnick` (nick, addby) VALUES (?,?)', [nick, addby], function (err, results, fields) {
        if (err) {
            return false;
        } else {
            that.pushBadnick(nick, addby);
        }
    });
    
    return true;
}

Badserv.prototype.pushBadnick = function(nick, addby) {
    if ( (typeof nick !== 'string') || (typeof addby !== 'string') ) {return;}
    if (nick.charAt(0) !== '*') {
        nick = '^' + nick;
    }
    if (nick.charAt(nick.length - 1) !== '*') {
        nick = nick + '$';
    }

    bad = nick.replace(/\*/g, '');
    regex = new RegExp(bad, 'gi');
    this.badnicks.push( {regex: regex, origin: nick, addby: addby} );
}

Badserv.prototype.verifyCaps = function(nick) {
    if (typeof nick === 'string') {
        caps = 0;
        for (i in nick) {
            if (nick[i].match(/[A-Z]/)) { caps++; }
        }
        percent = (100 * caps) / nick.length;
        round = Math.round(percent);

        if (+round > +this.conf.maxcapsnick) {
            return true;
        }
    }
    
    return false;
}

Badserv.prototype.isBadnick = function(nick) {
    matched = false;
    
    if (typeof nick === 'string') {
      this.badnicks.forEach(function(badnick) {
        if (nick.match(badnick.regex)) {
          matched = badnick;
          return;
        }
      });
    }

    return matched;
}

Badserv.prototype.processRealname = function(u) {
    var nreal = removeDiacritics(u.realname);
    var exreal = u.realname.split(' ');
    var age = '--';
    var sexe = ' X ';
        
    if (this.conf.badreal.rage.test(exreal[0])) { age = exreal[0]; }
    if (this.conf.badreal.rsex.test(exreal[1])) { sexe = ' ' + exreal[1] + ' '; }
    
    nreal = age + sexe;
        
    if (u.region !== undefined) {
        nreal = nreal + u.region;
        if (nreal.length <= 20) {
            nreal = nreal + ' ' + countries.getName(u.country, "fr");
        } else {
            nreal = nreal + ' ' + u.country;
        }
    } else {
        if (u.country !== undefined) {
            nreal = nreal + countries.getName(u.country, "fr");
        } else {
            nreal = nreal + 'Inconnu';
        }
    }
        
    nreal = removeDiacritics(nreal);
    nreal = nreal.replace(/\s\s+/g, ' ');
    nreal = nreal.replace(':', '');

    this.bot.send('CHGNAME', u.uid, nreal);
}

module.exports = Badserv;
