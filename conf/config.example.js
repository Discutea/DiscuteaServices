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
    }
};

module.exports = conf;
