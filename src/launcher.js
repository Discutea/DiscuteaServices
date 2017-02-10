var fs = require('fs');

var daemon = require("daemonize2").setup({
    main: "./app.js",
    name: "Discutea IRC Services",
    pidfile: "../discutea.pid"
});

switch (process.argv[2]) {

    case "start":
        daemon.start();
        break;

    case "stop":
        daemon.stop();
        break;
        
    case 'rehash':
        console.log('Loading new config..');
        daemon.sendSignal("SIGUSR1");
        break;

    case 'send':
        if (((process.argv[3] === '--channel') || (process.argv[3] === '--user'))  && (process.argv[5] === '--message') && (process.argv[6] !== undefined)) {
            
            target = process.argv[4];
            
            if (process.argv[3] === '--channel') {
               target = '#' + target; 
            }
            
            end = process.argv.lenght;
            msg = target + ' :' + process.argv.slice(6, end).join(' ') + '\r\n';

            fs.writeFile(__dirname + '/../tmp.txt', msg, (err) => {
                if (!err) {
                    daemon.sendSignal("SIGUSR2");
                }
            });
           
        } else {
            console.log('Send message on IRC.');
            console.log('ex: ./bin/Discutea send --channel Node.Js --message Hello world!');
            console.log('ex: ./bin/Discutea send --user Strategy --message Hi!');
        }  
        break;
        
    default:
        console.log("Usage: [start|stop|rehash|send]");
}
