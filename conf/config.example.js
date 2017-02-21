var conf = {
    link: {
        protocol: "inspircd",
        server: "127.0.0.1",
        port: 7000,
        sid: "30Z",
        password: "my_link_password",
        desc: "Sample IRC service with NodeJs for discutea.com",
        host: "node.discutea.com",
        ssl: false
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
    },
    sql: {
        host:'localhost', 
        password: 'YOUR_PASSWORD', 
        user: 'USERNAME', 
        database: 'DATABASE'
    },
    realname: {
        matchbadreal: true,
        matchminor: true,
        minorage: 19,
        regex: /^[0-9-]{2}[\s][mMHhfFwWCcX][\s][\x20-\x7E]{2,47}$/
    },
    modules: {
        loader: [
        //    'Badserv',
        //    'Secure',
            'Logger',
        //    'Discutea',
        //    'Spamserv'
        ],
        config: {
            Spamserv: {
                bot: {
                    uid:      'EEEEEE',
                    vhost:    'NodeJs.Discutea.com',
                    nick:     'SpamServ',
                    ident:    'Discutea',
                    modes:    '+IWBOiows +*',
                    realname: '-- X Bot',
                },
                channel: '#Opers'
            },
            Badserv: {
                bot: {
                    uid:      'DDDDDD',
                    vhost:    'NodeJs.Discutea.com',
                    nick:     'BadServ',
                    ident:    'Discutea',
                    modes:    '+IWBOkiows +*',
                    realname: '-- X Bot',
                },
                badreal: {
                    rage: /^[0-9-]{2}$/,
                    rsex: /^[mMHhfFwWCcX]$/
                },
                maxcapsnick: 35, // percent of caps accepter in nick
                requiresql: true,
                channel: '#Opers'
            },
            Discutea: {
                bot: {
                    uid:      'CCCCCC',
                    vhost:    'NodeJs.Discutea.com',
                    nick:     'Moderator',
                    ident:    'Discutea',
                    modes:    '+IWBOkiows +*',
                    realname: '-- X Bot'
                },
                requiresql: true,
                youtube_api: 'YOUR_GOOGLEV3_API_KEY',
                channel: '#Opers',
                officialChannels: [
                    '#Accueil', 
                    '#Motus', 
                    '#Quizz'
                ]
            },
            Secure: {
                bot: {
                    uid:      'BBBBBB',
                    vhost:    'NodeJs.Discutea.com',
                    nick:     'SecureServ',
                    ident:    'Discutea',
                    modes:    '+IWBOkiows +*',
                    realname: '-- X Bot'
                },
                bannoctcpreply: false,
                requiresql: true,
                ctcpversion: true,
                stopforumspam: true,
                badgeocode: {
                    global: {
                        target: ['AF','AX','AL','DE','AD','AO','SA','AM','AW','AT'],
                        reason: 'Les connexions à partir de votre pays ne sont pas autorisées. / Connections from your country are not allowed. / No se permiten las conexiones desde su país.'
                    },
                    byservers: {
                        'irc.discutea.fr': {
                            target:['ZA','AI','AG','AR','AU','BS','BB'],
                            reason: 'Les connexions à partir de votre pays ne sont pas autorisées.'
                        },
                        'irc.discutea.net': {
                            target:['DZ','AR','BE','BJ','BO'],
                            reason: 'Connections from your country are not allowed.'
                        },
                    }
                },
                channel: '#Opers'
            },
            Logger: {
                bot: {
                    uid:      'AAAAAA',
                    vhost:    'NodeJs.Discutea.com',
                    nick:     'LogServ',
                    ident:    'Discutea',
                    modes:    '+IWBOkiows +*',
                    realname: '-- X Bot'
                },
                channel: '#Opers'
            }
        }
    }
};

module.exports = conf;
