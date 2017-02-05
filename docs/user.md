# User Class


Properties:

(string) uid 
(int)    time
(string) nick
(string) host
(string) vhost
(string) ident
(string) ip
(array)  modes
(string) realname

Methods:

toString() // return the user nick 
setMode(string modes = +hhh || -xxx ) // return addMode or delMode
addMode(char(1) mode) 
delMode(char(1) mode) 
hasMode(char(1) mode) // Return (boolean)

