/**
 * This is the main file of Pokémon Showdown Bot
 *
 * Some parts of this code are taken from the Pokémon Showdown server code, so
 * credits also go to Guangcong Luo and other Pokémon Showdown contributors.
 * https://github.com/Zarel/Pokemon-Showdown
 *
 * @license MIT license
 */

global.DebugTools = {
	info: function(text) {
		if (config.debuglevel > 3) return;
		if (!colors) global.colors = require('colors');
		console.log('info'.cyan + '  ' + text);
	},
	debug: function(text) {
		if (config.debuglevel > 2) return;
		if (!colors) global.colors = require('colors');
		console.log('debug'.blue + ' ' + text);
	},
	recv: function(text) {
		if (config.debuglevel > 0) return;
		if (!colors) global.colors = require('colors');
		console.log('recv'.grey + '  ' + text);
	},
	error: function(text) {
		if (!colors) global.colors = require('colors');
		console.log('error'.red + ' ' + text);
	},
	ok: function(text) {
		if (config.debuglevel > 4) return;
		if (!colors) global.colors = require('colors');
		console.log('ok'.green + '    ' + text);
	},
	dsend: function(text) {
		if (config.debuglevel > 1) return;
		if (!colors) global.colors = require('colors');
		console.log('send'.grey + '  ' + text);
	}
};

global.send = function(data) {
	if (connection.connected) {
		if (!(data instanceof Array)) {
			data = [data.toString()];
		}
		data = JSON.stringify(data);
		DebugTools.dsend(data);
		connection.send(data);
	}
};

function runNpm(command) {
	console.log('Running `npm ' + command + '`...');

	var child_process = require('child_process');
	var npm = child_process.spawn('npm', [command]);

	npm.stdout.on('data', function(data) {
		process.stdout.write(data);
	});

	npm.stderr.on('data', function(data) {
		process.stderr.write(data);
	});

	npm.on('close', function(code) {
		if (!code) {
			child_process.fork('main.js').disconnect();
		}
	});
}

// Check if everything that is needed is available
try {
	require('sugar');
	require('colors');
	require('request');
	require('promise');
	require('image-size');
} catch (e) {
	console.log('Dependencies are not installed!');
	return runNpm('install');
}

if (!Object.select) {
	console.log('Node needs to be updated!');
	return runNpm('update');
}

// First dependencies and welcome message
var sys = require('sys');
var colors = require('colors');

console.log('------------------------'.red);
console.log('| Welcome back, Master.|'.green);
console.log('------------------------'.red);
console.log('');

// Config and config.js watching...
global.fs = require('fs');
if (!('existsSync' in fs)) {
	fs.existsSync = require('path').existsSync;
}

if (!fs.existsSync('./config.js')) {
	DebugTools.error('config.js doesn\'t exist; are you sure you copied config-example.js to config.js?');
	process.exit(-1);
}

global.Data = {
	Movedex: require('./data/movedex.js').movedex,
	Abilitydex: require('./data/abilitydex.js').abilitydex,
	Namelist: require('./data/namelist.js').namelist, //List of prefixes/suffixes for random names based on type
	PAD: {} // generated on first use
};

global.config = require('./config.js');
global.Tools = require('./tools.js').tools;

var checkCommandCharacter = function() {
	if (!/[^a-z0-9 ]/i.test(config.commandcharacter)) {
		DebugTools.error('invalid command character; should at least contain one non-alphanumeric character');
		process.exit(-1);
	}
};

checkCommandCharacter();

var watchFile = function() {
	try {
		return fs.watchFile.apply(fs, arguments);
	} catch (e) {
		DebugTools.error('your version of node does not support `fs.watchFile`');
	}
};

if (config.watchconfig) {
	watchFile('./config.js', function(curr, prev) {
		if (curr.mtime <= prev.mtime) return;
		try {
			delete require.cache[require.resolve('./config.js')];
			config = require('./config.js');
			DebugTools.info('reloaded config.js');
			checkCommandCharacter();
		} catch (e) {}
	});
};

// And now comes the real stuff...
DebugTools.info('starting server');

var WebSocketClient = require('websocket').client;
global.Parser = require('./parser.js').parser;
global.Commands = require('./commands.js').commands;
global.User = require('./user.js').user;
global.Room = require('./room.js').room;

// JSON files
var jsons = ["settings", "messages", "dailydraws", "roomintros", "galleries", "rpdata", "roompaws"];
for (var i = 0; i < jsons.length; i++) {
	Data[jsons[i]] = {};
	try {
		Data[jsons[i]] = JSON.parse(fs.readFileSync('saves/' + jsons[i] + '.json'));
		if (!Object.keys(Data[jsons[i]]).length && Data[jsons[i]] !== {}) Data[jsons[i]] = {};
	} catch (e) {} // file doesn't exist [yet]
}
if (!Data.settings.commands) Data.settings.commands = {};

var connect = function(retry) {
	if (retry) {
		DebugTools.info('retrying...');
	}

	var ws = new WebSocketClient();

	ws.on('connectFailed', function(err) {
		DebugTools.error('Could not connect to server ' + config.server + ': ' + sys.inspect(err));
		DebugTools.info('retrying in one minute');

		setTimeout(function() {
			connect(true);
		}, 60000);
	});

	ws.on('connect', function(connection) {
		DebugTools.ok('connected to server ' + config.server);
		global.connection = connection;

		connection.on('error', function(err) {
			DebugTools.error('connection error: ' + sys.inspect(err));
		});

		connection.on('close', function() {		
			if (arguments[0] === 1000) {
				DebugTools.info('connection closed normally; resetting');
				connect(false);
			} else {
				DebugTools.error('connection closed: ' + sys.inspect(arguments));
				DebugTools.info('retrying in one minute');
				setTimeout(function() {
					connect(true);
				}, 60000);
			}
		});

		var connectionTimer = null;
		connection.on('message', function(message) {
			if (message.type === 'utf8') {
				DebugTools.recv(sys.inspect(message.utf8Data));
				Parser.data(message.utf8Data, connection);
				if (config.resetduration) {
					clearTimeout(connectionTimer);
					connectionTimer = setTimeout(function() {
						DebugTools.error(config.resetduration + ' minutes without chat message.');
						DebugTools.info('refreshing connection');
						connection.close();
					}, config.resetduration * 60000);
				}
			}
		});
	});

	// The connection itself
	var id = ~~(Math.random() * 900) + 100;
	var chars = 'abcdefghijklmnopqrstuvwxyz0123456789_';
	var str = '';
	for (var i = 0, l = chars.length; i < 8; i++) {
		str += chars.charAt(~~(Math.random() * l));
	}

	var conStr = 'ws://' + config.server + ':' + config.port + '/showdown/' + id + '/' + str + '/websocket';
	DebugTools.info('connecting to ' + conStr + ' - secondary protocols: ' + sys.inspect(config.secprotocols));
	ws.connect(conStr, config.secprotocols);
};

connect();
