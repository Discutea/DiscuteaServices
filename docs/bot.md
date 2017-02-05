# Bot Class

Properties:

(Object) ircd(Protocol/Inspircd)
(string) uid
(string) host
(string) nick
(string) me // ircd.sid + this.uid
(timespamp) uptime

Methods:

setIrcd(Protocol/Inspircd)
join(string channel) // Join a channel
send(args) // send a command
