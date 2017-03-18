var robot = require('../../src/bot'),
    user = require('../../src/user'),
    server = require('../../src/server'),
    channel = require('../../src/channel'),
    extchannel = require('../../src/extchannel'),
    remove = require('unordered-array-remove'),
    getYouTubeID = require('get-youtube-id'),
    request = require('request'),
    abuse = require('./abuse'),
    command = require('./command'),
    find = require('array-find');

function Discutea(ircd, conf, bot, sql) {
    if (!(bot instanceof robot)) {return;}
    
    this.ircd = ircd;
    this.conf = conf;
    this.bot = bot;
    this.channel = conf.channel;
    this.abuses = [];
    this.sql = sql;
    this.youtubekey = conf.youtube_api;
};

Discutea.prototype.init = function() {
    var that = this;
    this.bot.join(this.channel);
    this.bot.send('MODE', this.channel, '+h', this.bot.nick, ':');
    this.conf.officialChannels.forEach(function(chan) {
        that.bot.join(chan);
        that.bot.send('MODE', chan, '+qo', that.bot.nick, that.bot.nick, ':');
    });

    setInterval(this.webirc, 15000, that.sql, this.bot);
    this.cmd = new command(this.ircd, this.bot, this.sql, this.conf.channel);

    this.ircd.emitter.on('kick'+that.bot.me+'', function (splited, data) {
        that.bot.join(splited[2]);
    });
    
    /* test abuse */
    this.ircd.emitter.on('user_join', function (u, c) {
        find(that.abuses, function (search) {
            if (search instanceof abuse) {
                if ( (search.channel === c) && (u.ident === search.uid) ) {
                  if (search.retry>=1) {
                    that.bot.msg('#equipe', '\00310(contournement)\003 \00314'+u.nick+' a été glined du réseau.\003');
                    that.bot.gline('*@' + u.host, 259200,  'Vous êtes banni du réseau 3 jours trop de tentatives de contournements.');
                  } else {
                    that.bot.send('MODE', c.name, '+b', '*!*@' + u.vhost, ':');
                    that.bot.send('KICK', c.name, u.nick, 'contournement vous êtes déjà banni de ce salon.');
                    that.bot.msg('#equipe', '\00310(contournement)\003 \00314'+u.nick+' a été banni de ' + c.name);
                    search.retry++;
                  }
                }
            }
        });
    });
    
    this.ircd.emitter.on('add_ext_channel_mode', function (c, ext) {
        if (ext.type === 'b') {
            target = ext.target.split('@')[1];
            if (typeof target !== 'string') {return;}
            if (!target.match(/\*/g)) {
                u = that.ircd.findBy(that.ircd.users, 'vhost', target);
                if ((u instanceof user) && (u.version) && (typeof u.version === 'string')) {                    
                    if ( (u.version.split(' ')[0] === 'KiwiIRC') && (u.ident != 'KiwiIrc') ) {
                        a = new abuse(u.ident, c, ext.target, ext.time);
                        that.abuses.push(a);
                    }
                }
            }
        }
    });
       
    this.ircd.emitter.on('del_ext_channel_mode', function (c, type, target, by) {
        if (type === 'b') {
            find(that.abuses, function (search, index) {
                if (search instanceof abuse) {
                    if ( (target === search.target) && (search.channel === c) ) {
                        remove(that.abuses, index);
                        delete search;
                    }
                }
            });
        }
    });
    /* end abuse */
    
    this.ircd.emitter.on('user_join#Aide', function (u, c) {
        if ( (!u.role) && (!u.hasMode('k')) && (!u.opertype) ) {
            that.cmd.informationUser(u, 'help');
        }
    });
    
    this.ircd.emitter.on('privmsg'+that.bot.me+'', function (u, splited, splited2, data) {
        if (!(u instanceof user)) {return;}
        locale = 'en';
        
        if (u.server instanceof server) {
            switch (u.server.name) {
                case 'irc.discutea.fr':
                    locale = 'fr';
                    break;
                case 'irc.discutea.es':
                    locale = 'es';
                    break;
            }
        }
        
        req = splited[3];
        if ( (typeof req === 'string') && (req.charAt(0) == ":") ) {
            req = req.substring(1);
        }
        data = splited.slice(4,splited.length);
        that.cmd.dispatcher(u, req, data, locale);
    });

    this.ircd.emitter.on('user_join#Ados', function (u, c) {
        if ( (u.hasMode('I')) || (u.role) ) {return;}
        if ( (u.age > 19) || (!u.age) || (u.age === '--') ) {
            that.bot.send('MODE', '#Ados', '+s');
            that.bot.send('MODE', '#Ados', '+e', '*!*@*discutea.com');
            that.bot.send('MODE', '#Ados', '+b', '*!*@' + u.vhost, ':');
            that.bot.send('MODE', '#Ados', '+bbbbbbbbbb', 'r:--* r:2* r:3* r:4* r:5* r:6* r:7* r:2* r:8* r:9*', ':');
            that.bot.send('KICK', '#Ados', u.nick, 'Salon réservé aux moins de 19 ans.');
        }
    });

    this.ircd.emitter.on('user_accountname', function (u, account) {
        that.ircd.send('SVSJOIN', u.uid, '#Vip-FR');
    });

    this.ircd.emitter.on('user_is_mineur', function (u) {
        that.ircd.send('SVSJOIN', u.uid, '#Ados');
    });
    
    this.ircd.emitter.on('user_has_role', function (u, role) {
        that.bot.send('SAJOIN', u.nick, '#Equipe');
        that.bot.send('SAJOIN', u.nick, '#Aide');
        that.bot.send('SAJOIN', u.nick, '#Ados');
    });
    
    this.ircd.emitter.on('SNONOTICE', function (splited, splited2, data) {
        //filter youtube\.com\/watch\?v\=[[:print:]]{11} block p :Discutea_Youtube
        //filter youtu\.be\/[[:print:]]{11} block p :Discutea_Youtube
        if (splited2[2] === 'FILTER') {
            if (splited[12] === '(Discutea_Youtube)' || splited[12] === '(HTTP_URL)') {
                nick = splited[4];
                u = that.ircd.findBy(that.ircd.users, 'nick', nick);
                if (!(u instanceof user)) {return;}
              
                target = splited[11].replace(':', '');
                txt = splited.slice(14, +splited.length);
                
                if (splited[12] === '(Discutea_Youtube)') {
                    that.processYoutube(u, target, txt);
                } else {
                    that.bot.msg('#Netadmin ', '\00306nick: '+u.nick+' target: '+target+' txt: ' + txt);
                }
            }
        }
    });
    
    setInterval(function() { // check auto unban
        that.autoUnBan();
    }, 3 * 60000);
};

Discutea.prototype.processYoutube = function(u, target, txt) {
    var that = this;
    now = Math.floor(Date.now() / 1000);
            
    if (u.stocks['ytb'] !== undefined) {
        timediff = now - u.stocks['ytb'];
        if (timediff < 120) {
          wait = 120 - timediff;
          that.bot.notice(u.nick, '\00304\002[Anti Flood]\002\003 Vous devez patienter encore ' + wait + ' secondes pour poster une nouvelle vidéo');
          return;
        }
    }
                    
    vid = getYouTubeID( txt );
    youtubeapi = 'https://www.googleapis.com/youtube/v3/videos?id='+vid+'&key='+that.youtubekey+'&part=snippet&fields=items/snippet/title'
            
    request(youtubeapi, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var infos = JSON.parse(body);
            infos.items.forEach(function(info) {
                u.stocks['ytb'] = now;
                that.bot.msg(target, '\002\00301You\00304Tube\003\002  \00301Partage de\002\00306 '+u.nick+' \002\00301Titre:\00306 ' + info.snippet.title);
                that.bot.msg(target, '\00306Lien:\003 https://youtu.be/' + vid);
                that.bot.msg('#Musique', '\002\00301You\00304Tube\003\002  \00301Partage de\002\00306 '+u.nick+' sur ' + target + ' \002\00301Titre:\00306 ' + info.snippet.title);
                that.bot.msg('#Musique', '\00306Lien:\003 https://youtu.be/' + vid);
            });
        }
    });
}

Discutea.prototype.autoUnBan = function() {
    var that = this;
    this.conf.officialChannels.forEach(function(chan) {
        c = that.ircd.findChannel(chan);
        if (c instanceof channel) {
            now = Math.floor(Date.now() / 1000);
            exts = c.extsModes;
            for (i in exts) {
                if (exts[i] instanceof extchannel) {
                    if ( (exts[i].type === 'b') && ((now - exts[i].time) > 14400) ) {
                        if (exts[i].target.split(':')[0] !== 'r') {
                            that.bot.send('MODE', c.name, '-b', exts[i].target, ':');
                            c.removeExtMode(that.bot.me, undefined, 'b', exts[i].target);
                        }
                    }
                } else {
                    delete exts[i];
                    remove(exts, i);
                }
            }
        }
    });
}

Discutea.prototype.webirc = function(sql, bot) {
    var that = this;
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

module.exports = Discutea;
