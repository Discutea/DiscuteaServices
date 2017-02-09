exports = module.exports = Xline;

function Xline(type, addr, addby, addat, expireat, reason)
{
    if (!(this instanceof Xline)) { 
        return new Xline(type, addr, addby, addat, expireat, reason); 
    }
    
    this.type = type;
    this.addr = addr;
    this.addby = addby;
    this.addat = addat;
    this.expireat = expireat;
    this.reason = reason;
    this.index = 0;
}

Xline.prototype.name = function () {
    
    if (this.type.length === 1) {
        return this.type + '-Line';
    }
    
    return this.type;
};
