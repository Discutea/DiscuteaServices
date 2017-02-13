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
    realname: {
        matchbadreal: true,
        geolocalisation: 'badreal', // false || badreal || all
        matchminor: true,
        minorage: 19,
        regex: {
            full: /^[0-9-]{2}[\s][mMHhfFwWCcX][\s][\x20-\x7E]{2,47}$/,
            age: /^[0-9-]{2}$/,
            sex: /^[mMHhfFwWCcX]$/
        }
    },
    modules: {
        loader: [
            'Logger',
            'Secure'
        ],
        config: {
            Secure: {
                bot: {
                    uid:      'BBBBBB',
                    vhost:    'NodeJs.Discutea.com',
                    nick:     'SecureServ',
                    ident:    'Discutea',
                    modes:    '+IWBOiows +*',
                    realname: '-- X Bot'
                },
                badgeocode: {
                    global: {
                        target: 
                            ['AF','AX','AL','DE','AD','AO','SA','AM','AW','AT',
                             'AZ','BH','BD','BY','BT','BA','BV','BR','BN','BG'
                            ],
                        reason: 'Connections from your country are not allowed.'
                    }
                },
                channel: '#Node.Js'
            },
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
    }
};

module.exports = conf;
