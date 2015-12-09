var Database = require('./db');
var db = new Database();

module.exports = function (client) {
    var self = this;
    var user = null;

    if (!self.clients) self.clients = {};

    client.on('connect', function (packet) {
        self.clients[packet.clientId] = client;
        client.id = packet.clientId;
        console.log("CONNECT: client id: " + client.id);
        if (packet.username === undefined) {
            client.connack({returnCode: 4});
        }
        user = packet.username;
        client.connack({returnCode: 0});
    });

    client.on('subscribe', function (packet) {
        var topic = packet.subscriptions[0].topic.toString();
        if(!/device\/(\d)/.test(topic) || /device\/(\d)/.exec(topic).length < 1){
            return client.connack({returnCode: 6});
        }
        var deviceId = parseInt(/device\/(\d)/.exec(topic)[1]);
        var payload = {user: parseInt(user), device: deviceId};
        db.subscribe(payload, function (results) {
            client.publish({
                topic: topic,
                payload: JSON.stringify(results)
            });
        });
    });

    client.on('publish', function (packet) {
        console.log("PUBLISH(%s): %j", packet.clientId, packet);
    });

    client.on('pingreq', function (packet) {
        console.log('PINGREQ(%s)', client.id);
        client.pingresp();
    });

    client.on('disconnect', function (packet) {
        client.stream.end();
    });

    client.on('close', function (packet) {
        delete self.clients[client.id];
    });

    client.on('error', function (e) {
        client.stream.end();
        console.log(e);
    });
};