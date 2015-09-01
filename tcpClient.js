let net = require('net')
let JsonSocket = require('json-socket')

let socket = new JsonSocket(new net.Socket())

socket.connect(8001, '127.0.0.1')

socket.on('connect', function(){
	socket.on('message', function(message){
		console.log("the result is" + message.result)
	})
})