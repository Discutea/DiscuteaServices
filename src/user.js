exports = module.exports = User;
var remove = require('unordered-array-remove');
var channel = require('./channel');
var user = require('./user');
var fips = require('fips');
var config = require('../conf/config');
var geoip = require('geoip-lite');

function User(emitter, uid, nick, ident, host, vhost, ip, uptime, realname, s)
{
    if (!(this instanceof User)) { return new User(emitter, uid, nick, ident, host, vhost, ip, uptime, realname, s); }
    
    this.emitter = emitter;
    this.uid = uid;
    this.nick = nick;
    this.ident = ident;
    this.host = host;
    this.vhost = vhost;
    this.ip = ip;
    this.time = uptime;
    this.realname = realname;
    this.server = s;
    this.account = undefined;
    this.registered = false;
    this.age = undefined;
    this.modes = [];
    this.stocks = []; // stocks for developers
    this.channels = [];
    this.away = undefined;
    this.lastnicks = [];
    this.country = undefined;
    this.region = undefined;
    this.ssl = false;
    this.city = undefined;
    this.version = undefined;
    this.opertype = undefined;
    this.role = false;

    // User informations
    this.cookies = undefined;
    this.enc = undefined;
    this.lang = undefined;
    this.tactile = undefined;
    this.resolution = undefined;
    this.agent = undefined;
    
    this.iptype = '';
    if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip)) {
        this.iptype = 'ipv4';
    } else {
        this.iptype = 'ipv6';
    }
    this.emitter.emit('user_introduce', this);
    this.setGeoInfos( geoip.lookup(ip) );
    this.setRealname(realname, false);
}

User.prototype.setVersion = function (version)
{
    var that = this;
    if (typeof version !== 'string') {return;}
    
    var vsplited = version.split(':::');
    
    if (vsplited.length > 1) {
        version = vsplited[0];
        
        vsplited.forEach(function(infos) {
            info = infos.split(' ');
            if (typeof info[1] === 'string') {
                switch (info[0]) {
                    case 'c':
                        that.cookies = info[1];
                        break;
                    case 'ag':
                        that.agent = info.slice(1, info.length).join(' ');
                        break;
                    case 'enc':
                        that.enc = info.slice(1, info.length).join(' ');
                        break;
                    case 'lang':
                        that.lang = info.slice(1, info.length).join(' ');
                        break;
                    case 'r':
                        that.tactile = info[1];
                        that.resolution = info[2];
                        break;
                }
            }
        });
    }

    this.version = version;
}

User.prototype.setGeoInfos = function (geo)
{
    country = geo ? geo.country : undefined;
    if (country != ""){
        this.country = country;
    }
    
    region = geo ? geo.region : undefined;
    if (region != ""){
        if (country != ""){
            region = fips.longform(country+region);
        }
        this.region = region;
        
    } else if (this.iptype === 'ipv4') {
        if (/^A[\x20-\x7E]{10,47}abo\.wanadoo\.fr$/.test(this.host)) {
            if (typeof this.host.split('-')[0] === 'string') {
                this.region = this.host.split('-')[0].substr(1);
            }
        }
        
        if (/fbx\.proxad\.net$/.test(this.host)) {
            var dept = this.host.split('-')[0];
            
            if (typeof this.dept === 'string') {
                dept = dept.substr( +dept.length - 2  );
                
                if (dept.length === 2) {
                    if (this.getDeptByNum(dept)) {
                        this.region = this.getDeptByNum(dept);
                    }
                }
            }
        }
    }
    
    city = geo ? geo.city : undefined;
    if (city != ""){
        this.city = city;
    }
    
    if (country !== undefined) {
        this.emitter.emit('user_has_geoinfos', this);
    }

}

User.prototype.setRealname = function (realname, emit = true)
{
    lastreal = this.realname;
    this.realname = realname;
    if(emit) {
        this.emitter.emit('user_change_realname', this, lastreal);
    }
    
    if (realname !== undefined) {
        if (config.realname.matchminor === true) {
            age = realname.split(' ');
            age = parseInt(age[0]);
            if ( (!isNaN(age)) && (age < 99) && (age > 9) ) {
                this.age = age;
                if (age <= parseInt(config.realname.minorage)) {
                    this.emitter.emit('user_is_mineur', this);
                }
            }
        }
    }
    
    if (config.realname.matchbadreal === true) {
        if (!config.realname.regex.test(realname)) {
            this.emitter.emit('user_has_badreal', this, realname);
        }
    }
}

User.prototype.setVhost = function (vhost)
{
    this.vhost = vhost;
    this.emitter.emit('user_chg_vhost', this, vhost);

    return this;
}

User.prototype.setOperType = function (type)
{
    this.opertype = type;
    this.emitter.emit('user_opertype', this, type);
}

User.prototype.setNick = function (newNick)
{
    lastNick = this.nick;
    this.nick = newNick;
    this.emitter.emit('user_nick', this, lastNick);
    
    return this;
}

User.prototype.setAway = function (awayMsg)
{
    this.away = awayMsg;
    if (awayMsg === undefined) {
        this.emitter.emit('user_away_off', this);
    } else {
        this.emitter.emit('user_away_on', this, awayMsg);
    }
    
    return this;
}

User.prototype.setMode = function (modes, t)
{    
    if ((typeof modes == 'string') && (modes.length >= 1)) {
        var that = this;
        var addmode = true;
        
        for (i in modes) {
            if (modes[i] === '+') {
                addmode = true;
            } else if (modes[i] === '-') {
                addmode = false;
            } else {
                if (addmode) {
                    that.addMode(modes[i], t);
                } else {
                    that.delMode(modes[i], t);
                }
            }
        }
    }
}

User.prototype.addMode = function (mode, t = undefined)
{
    if (this.hasMode(mode) === false) {
        this.modes.push(mode);
        this.emitter.emit('user_add_mode', this, mode, t);
    }
}

User.prototype.addChannel = function (c)
{
    if (c instanceof channel) {
        this.channels.push(c);
        c.countUsers++;
        this.emitter.emit('user_join', this, c);
        this.emitter.emit('user_join' + c.name, this, c);
    }
}

User.prototype.removeChannel = function (c)
{
    if (c instanceof channel) {
        var that = this;
    
        for (i in that.channels)
        {
            if (that.channels[i] === c)
            {
                remove(that.channels, i);
                c.countUsers--;
            }
        }
    }
}

User.prototype.delMode = function (mode, t = undefined)
{
    for (i in this.modes)
    {
        if (this.modes[i] === mode)
        {
            remove(this.modes, i);
            this.emitter.emit('user_del_mode', this, mode, t);
        }
    }
}

User.prototype.hasMode = function(mode) {
    for (i in this.modes)
    {
        if (this.modes[i] == mode)
        {
            return true;
        }
    }
    return false;
}

User.prototype.channelPart = function(c, partMsg) {
    if (c instanceof channel) {
        this.removeChannel(c);
        this.emitter.emit('user_part', this, c, partMsg);
    
        return c.countUsers;
    };
    return false;
}

User.prototype.isRoot = function() {
    if (this.role === 'ROOT') {
        return true;
    }
    return false;
}

User.prototype.isAdmin = function() {
    if (!this.role) {return false;}
    
    if ((this.role === 'ADMIN') || (this.role === 'ROOT')) {
        return true;
    }
    
    return false;
}

User.prototype.isOperator = function() {
    if (!this.role) {return false;}
    
    if ((this.role === 'OPERATOR') || (this.role === 'ADMIN') || (this.role === 'ROOT')) {
        return true;
    }
    
    return false;
}

User.prototype.isModerator = function() {
    if (!this.role) {return false;}
    
    if ((this.role === 'MODERATOR') || (this.role === 'OPERATOR')) {
        return true;
    }
    
    if ((this.role === 'ADMIN') || (this.role === 'ROOT')) {
        return true;
    }
    
    return false;
}

User.prototype.isHelper = function() {
    if (!this.role) {return false;}
    
    if ((this.role === 'HELPEUR') || (this.role === 'MODERATOR') || (this.role === 'OPERATOR')) {
        return true;
    }
    
    if ((this.role === 'ADMIN') || (this.role === 'ROOT')) {
        return true;
    }
    
    return false;
}

User.prototype.getDeptByNum = function(num) {

var depts = [];
  depts['01'] = 'Ain';
  depts['02'] = 'Aisne';
  depts['03'] = 'Allier';
  depts['04'] = 'Alpes-de-Haute-Provence';
  depts['05'] = 'Hautes-Alpes';
  depts['06'] = 'Alpes-Maritimes';
  depts['07'] = 'Ardèche';
  depts['08'] = 'Ardennes';
  depts['09'] = 'Ariège';
  depts['10'] = 'Aube';
  depts['11'] = 'Aude';
  depts['12'] = 'Aveyron';
  depts['13'] = 'Bouches-du-Rhône';
  depts['14'] = 'Calvados';
  depts['15'] = 'Cantal';
  depts['16'] = 'Charente';
  depts['17'] = 'Charente-Maritime';
  depts['18'] = 'Cher';
  depts['19'] = 'Corrèze';
  depts['21'] = 'Côte-d Or';
  depts['22'] = 'Côtes-d Armor';
  depts['23'] = 'Creuse';
  depts['24'] = 'Dordogne';
  depts['25'] = 'Doubs';
  depts['26'] = 'Drôme';
  depts['27'] = 'Eure';
  depts['28'] = 'Eure-et-Loir';
  depts['29'] = 'Finistère';
  depts['30'] = 'Gard';
  depts['31'] = 'Haute-Garonne';
  depts['32'] = 'Gers';
  depts['33'] = 'Gironde';
  depts['34'] = 'Hérault';
  depts['35'] = 'Ille-et-Vilaine';
  depts['36'] = 'Indre';
  depts['37'] = 'Indre-et-Loire';
  depts['38'] = 'Isère';
  depts['39'] = 'Jura';
  depts['40'] = 'Landes';
  depts['41'] = 'Loir-et-Cher';
  depts['42'] = 'Loire';
  depts['43'] = 'Haute-Loire';
  depts['44'] = 'Loire-Atlantique';
  depts['45'] = 'Loiret';
  depts['46'] = 'Lot';
  depts['47'] = 'Lot-et-Garonne';
  depts['48'] = 'Lozère';
  depts['49'] = 'Maine-et-Loire';
  depts['50'] = 'Manche';
  depts['51'] = 'Marne';
  depts['52'] = 'Haute-Marne';
  depts['53'] = 'Mayenne';
  depts['54'] = 'Meurthe-et-Moselle';
  depts['55'] = 'Meuse';
  depts['56'] = 'Morbihan';
  depts['57'] = 'Moselle';
  depts['58'] = 'Nièvre';
  depts['59'] = 'Nord';
  depts['60'] = 'Oise';
  depts['61'] = 'Orne';
  depts['62'] = 'Pas-de-Calais';
  depts['63'] = 'Puy-de-Dôme';
  depts['64'] = 'Pyrénées-Atlantiques';
  depts['65'] = 'Hautes-Pyrénées';
  depts['66'] = 'Pyrénées-Orientales';
  depts['67'] = 'Bas-Rhin';
  depts['68'] = 'Haut-Rhin';
  depts['69'] = 'Rhône';
  depts['70'] = 'Haute-Saône';
  depts['71'] = 'Saône-et-Loire';
  depts['72'] = 'Sarthe';
  depts['73'] = 'Savoie';
  depts['74'] = 'Haute-Savoie';
  depts['75'] = 'Île-de-France';
  depts['76'] = 'Normandie';
  depts['78'] = 'Yvelines';
  depts['79'] = 'Deux-Sèvres';
  depts['80'] = 'Somme';
  depts['81'] = 'Tarn';
  depts['82'] = 'Tarn-et-Garonne';
  depts['83'] = 'Var';
  depts['84'] = 'Vaucluse';
  depts['85'] = 'Vendée';
  depts['86'] = 'Vienne';
  depts['87'] = 'Haute-Vienne';
  depts['88'] = 'Vosges';
  depts['89'] = 'Yonne';
  depts['90'] = 'Territoire de Belfort';
  depts['91'] = 'Essonne';
  depts['92'] = 'Hauts-de-Seine';
  depts['93'] = 'Seine-Saint-Denis';
  depts['94'] = 'Val-de-Marne';
  depts['95'] = 'Val-d Oise';
  
  return depts[num];
}
