var conf = {
    link: {
        protocol: "inspircd",
        server: "127.0.0.1",
        port: 7000,
        sid: "30Z",
        password: "my_link_password",
        desc: "Sample IRC service with NodeJs for discutea.com",
        host: "node.discutea.com"
    },
    modules: {
        loader: [
            'Logger'
        ],
        config: {
            Logger: {
                bot: {
                    uid:      'AAAAAA',
                    vhost:    'NodeJs.Discutea.com',
                    nick:     'LogServ',
                    ident:    'Discutea',
                    modes:    '+IWBOiows +*',
                    realname: '-- X Bot'
                },
                channel: '#Node.Js'
            }
        }
    },
    /*
     * Require IRCv3 
     * The first params is accountname use by anope
     * The second params is the role
     * roles list: ROOT, ADMIN, OPERATOR, MODERATOR, HELPEUR
     *
     * /!\ CASE SENSITIVE /!\
     *
     */
    opers: { 
        Strategy:   'ROOT',
        capuci:     'ADMIN',
        Minsy:      'OPERATOR',
        melba:      'MODERATOR',
        Ginette:    'HELPEUR'
    }
};

module.exports = conf;
