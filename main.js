const http = require("http");
const https = require("https")
const fs = require("fs")
const net = require("net");
const url = require("url");
const lineReader = require('line-reader');
const mpConsole = require("debug")("mproxy");
const chaves = {
    key: fs.readFileSync('keys/google.key'),
    cert: fs.readFileSync('keys/google.cert'),
}

var serverHTTP = http.createServer();
var serverHTTPS = https.createServer(chaves);

serverHTTPS.on("request", Request); //Inicio de uma requisição HTTPS ***não pega dominios que não sejam localHost***
serverHTTPS.on("connect", Connect);
serverHTTPS.listen(443);

serverHTTP.on("request", Request); //Inicio de uma requisição HTTP
serverHTTP.on("connect", Connect); //https só é reconhecido aqui no Connect
serverHTTP.listen(80);

function valida(req, socket, head){
  //  console.log(req.url)
   var palavras = [];
    return new Promise((resolve, reject) => {
        lineReader.eachLine('file.txt', function(line, last) {
            palavras.push(line)
            last ? verificar(req) : false
        });
        function verificar(req){
            let Rows = palavras.length;
            for(i=0; i!=Rows; i++){
                let url = req.url.split('.');
                for(j=0; j!=url.length;j++){
                    if(url[j]==palavras[i]){
                        req.destroy()
                    }else{
                        resolve()
                    }
                }       
            }
        }
    })    
}

function Request(req, res) {
    console.log(req.url)
    try {
        if(req.url == 'www.example.com'){
            console.log(req.url)
            req.write("URL Bloqueada")
            req.end
        }
        var self = this;
        var path = req.headers.path || url.parse(req.url).path;
        var requestOptions = {
            host: req.headers.host.split(':')[0],
            port: req.headers.host.split(':')[1] || 80,
            path: path,
            method: req.method,
            headers: req.headers
        };
        if (requestOptions.host == "127.0.0.1" && requestOptions.port == port) {
            res.writeHead(200, {
                'Content-Type': 'text/plain'
            });
            res.write("ok");
            res.end();
            return;
        }
    }catch (e) {        
        mpConsole("requestHandlerError" + e.message);
    }

    self.emit("beforeRequest", requestOptions, req);
    requestRemote(requestOptions, req, res, self);

    function requestRemote(requestOptions, req, res, proxy) {
        var remoteRequest = http.request(requestOptions, function(remoteResponse) {
            remoteResponse.headers['proxy-agent'] = 'Easy Proxy 1.0';
            proxy.emit("beforeResponse", remoteResponse, requestOptions);
            res.writeHead(remoteResponse.statusCode, '', remoteResponse.headers);
            remoteResponse.pipe(res);
        });

        remoteRequest.on('error', function(e) {
            proxy.emit("requestError", e, req, res);

            res.writeHead(502, 'Proxy fetch failed');
        });

        req.pipe(remoteRequest);
        res.on('close', function() {
            remoteRequest.abort();
        });
    }
}

function Connect(req, socket, head){
    valida(req, socket, head).then(e => {
        try {
            var self = this;
            var requestOptions = {
                host: req.url.split(':')[0],
                port: req.url.split(':')[1] || 443
            };
    
            self.emit("beforeRequest", requestOptions, req);
            connectRemote(requestOptions, socket);
    
            function ontargeterror(e) {
                mpConsole(req.url + " Tunnel error: " + e);
                _synReply(socket, 502, "Tunnel Error", {}, function() {
                    try {
                        socket.end();
                    }
                    catch(e) {
                        mpConsole('end error' + e.message);
                    }
    
                });
            }
    
            function connectRemote(requestOptions, socket) {
                var tunnel = net.createConnection(requestOptions, function() {

                    _synReply(socket, 200, 'Connection established', {
                            'Connection': 'keep-alive',
                            'Proxy-Agent': 'Easy Proxy 1.0'
                        },
                        function(error) {
                            if (error) {
                                mpConsole("syn error", error.message);
                                tunnel.end();
                                socket.end();
                                return;
                            }
                            tunnel.pipe(socket);
                            socket.pipe(tunnel);
                        }
                    );
                });
                socket.on('error', function(e) {
                    mpConsole('socket error:', e);
                });
                tunnel.setNoDelay(true);
    
                tunnel.on('error', ontargeterror);
            }
        } catch (e) {
            mpConsole("connectHandler error: " + e.message);
        }
    });
}

function _synReply(socket, code, reason, headers, cb) {
    try {
        var statusLine = 'HTTP/1.1 ' + code + ' ' + reason + '\r\n';
        var headerLines = '';
        for (var key in headers) {
            headerLines += key + ': ' + headers[key] + '\r\n';
        }
        socket.write(statusLine + headerLines + '\r\n', 'UTF-8', cb);
    } catch (error) {
        cb(error);
    }
}
