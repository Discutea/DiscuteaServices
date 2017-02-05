# Events emit

ping            => (string) data
ircd_ready      => (string) data
user_mode       => (object) User, (string) modes
user_connect    => (object) User
privmsg         => (string) data
user_disconnect => (string) nickname, (string) reason, (string) data
