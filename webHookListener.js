
let http = require('http');
let crypto = require('crypto');
const exec = require('child_process').exec

module.exports = {
    init: function (port, secret) {
        http.createServer(function (req, res) {
            req.on('data', function (chunk) {
                let sig = "sha1=" + crypto.createHmac('sha1', secret).update(chunk.toString()).digest('hex');
                if (req.headers['x-hub-signature'] == sig) {
                    this.update()
                }
            });
        }).listen(port);
    },

    update : function() {
        exec('cd ' + this.repo + ' && git pull');
        if (this.callback != null) {
            this.callback();
        }
    },

    callback : null,
    repo: "/home/themoonisacheese/HM_BOT"

}