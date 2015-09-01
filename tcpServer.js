let chokidar = require('chokidar')
let net = require('net')
let jsonSocket = require('json-socket')


let tcpServer = net.createServer();
tcpServer.listen(8001);

tcpServer.on('connection', function(socket) {
    socket = new jsonSocket(socket); 
	fswatch(socket);
});

function fswatch(socket){
	let resObj = {}
	let watcher = chokidar.watch('.', {
		ignored: /[\/\\]\./,
		persistent: true
	});

	watcher
	  .on('add', function(path) { console.log('File', path, 'has been added'); })
	  .on('addDir', function(path) { console.log('Directory', path, 'has been added'); })
	  .on('change', function(path) {
	  	resObj.action = "write"
	  	resObj.path = path
	  	resObj.type = "file"
	  	socket.sendEndMessage(resObj);
	  })
	  .on('unlink', function(path) { console.log('File', path, 'has been removed'); })
	  .on('unlinkDir', function(path) { console.log('Directory', path, 'has been removed'); })
	  .on('ready', function() { console.log('Initial scan complete. Ready for changes.'); })
}



