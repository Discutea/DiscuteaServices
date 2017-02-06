# Structure module

```javascript
function Logger(ircd) {
    this.ircd = ircd;
};

Logger.prototype.init = function() {
   console.log('init ok');
};

module.exports = Logger;
```
