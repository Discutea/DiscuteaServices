# Events emit 

* ping              => (string) data
* ircd_ready        => (string) data
* error             => (string) data
* user_mode         => (object) User, (string) modes
* user_introduce    => (object) User
* privmsg           => (string) data
* user_destroy      => (string) nickname, (string) reason, (string) data
* server_introduce  => (object) Server
* channel_introduce => (object) Channel
* user_part         => (object) User, (object) Channel
* user_join         => (object) User, (object) Channel
* channel_destroy   => (string) name
* server_destroy    => (string) name, (string) reason, (string) data
* user_destroy      => (string) nick, (string) reason, (string) data
* user_away_off     => (object) User
* user_away         => (object) User, (string) away_msg
* user_nick         => (object) User, (string) lastnick
* channel_chg_topic => (object) Channel, (object) User, (string) lastTopic
