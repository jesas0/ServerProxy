var MiniProxy = require("mini-proxy");

var myProxy = new MiniProxy({
	"port": 19133,
	"onBeforeRequest": function(requestOptions, e, f) {
		   //console.log(requestOptions.host)
		   console.log(requestOptions)
	},
	"onBeforeResponse": function(remoteResponse) {
	    console.log(remoteResponse)
	},
	"onRequestError": function(e, req, res) {
       console.log(e)
    }
});

myProxy.start();
console.log("proxy start at 19133");