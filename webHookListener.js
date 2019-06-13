const http = require('http');
const crypto = require('crypto');
const exec = require('child_process').exec;

module.exports = {
    init: function (port, secret) {
        http.createServer(req => {
            req.on('data', function (chunk) {
                let sig = "sha1=" + crypto.createHmac('sha1', secret).update(chunk.toString()).digest('hex');
                if (req.headers['x-hub-signature'] === sig) {
                    module.exports.update()
                }
            });
        }).listen(port);
    },

    update : function() {
        exec('cd ' + module.exports.repo + ' && git pull');
        if (module.exports.callback != null) {
            module.exports.callback();
        }
    },

    callback : null,
    repo: "/home/themoon/HM_BOT"

}