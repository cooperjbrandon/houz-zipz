var amqp, clc, moment, beginFetchOfZips, config,
		connection, bindingRoutingKey, publishRoutingKey,
		queue, queueName, queueConnected,
		exchange, exchangeName, exchangeConnected;

amqp = require('amqp');
clc = require('cli-color');
moment = require('moment');
config = require('houz-config');

exchangeName = config.exchangeName;
queueName = config.queueName.pages;
bindingRoutingKey = config.routingKey.pages;
publishRoutingKey = config.routingKey.zipids;

var beginSetup = function(beginFetch) {
	beginFetchOfZips = beginFetch;
	connection = amqp.createConnection();
	connection.on('ready', connectToQueueAndExchange);
};

var connectToQueueAndExchange = function() {
	console.log(clc.blue('The connection is ready'));
	connectToQueue();
	connectToExchange();
};

var connectToExchange = function() {
	exchange = connection.exchange(exchangeName, {autoDelete: false}); //connect to exchange
	exchange.on('open', function() { queueOrExchangeReady('exchange'); });
}

var connectToQueue = function() {
	queue = connection.queue(queueName); //connect to queue
	queue.on('open', bindQueueToExchange);
};

var bindQueueToExchange = function() {
	console.log(clc.blue('The queue "' + queue.name + '" is ready'));
	queue.bind(exchangeName, bindingRoutingKey); //bind to exchange w/ routingKey (most likely already done; this is just incase)
	queue.on('queueBindOk', function() { queueOrExchangeReady('queue'); });
};

var queueOrExchangeReady = function(type) {
	if (type === 'exchange') {
		console.log(clc.bgBlueBright('The exchange "' +exchange.name+ '" is ready'));
		exchangeConnected = true;
	} else if (type === 'queue') {
		console.log(clc.blue('The queue "' +queue.name+ '" is bound to the exchange "' +exchangeName+ '" with the routing key "' +bindingRoutingKey+ '"'));
		queueConnected = true;
	}
	if (exchangeConnected && queueConnected) { subscribeToQueue(); }
};

var subscribeToQueue = function() {
	queue.subscribe({ack: true}); //subscribe to queue
	queue.on('message', messageReceiver);
};

var messageReceiver = function(message, headers, deliveryInfo, messageObject) {
	console.log(clc.yellow('Message received: Page Number ' + message.pagenum + ', City '+message.city+' at ' + moment().format('MMMM Do YYYY, h:mm:ss a')));
	beginFetchOfZips(message, headers, deliveryInfo, messageObject);
};

var handleZips = function(zipIds) {
	for (var i = 0; i < zipIds.length; i++) {
		exchange.publish(publishRoutingKey, { zipid: zipIds[i] }); //routingKey, message
	}
	nextItem();
};

var nextItem = function() {
	queue.shift();
};

module.exports.beginSetup = beginSetup;
module.exports.handleZips = handleZips;
