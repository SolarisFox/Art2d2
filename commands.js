/**
/**
 * This is the file where the bot commands are located
 *
 * @license MIT license
 */

var sys = require('sys');
var Promise = require('promise');

var middleButton = '<a href="http://www.smogon.com/forums/threads/ps-art-room-contest-summer-vacation.3573290/"><img src="https://i.gyazo.com/2f8c3f7fa792629d037c8ba867d912ab.gif" width="105" height="30"></a>';
const BAR = '|'; //makes this character accessible with the eval command
const pokemonTypes = ["normal","fire","water","electric","grass","ice","fighting","poison","flying","ground","psychic","bug","rock","ghost","dragon","dark","steel","fairy"];

exports.commands = {
	/**
	 * Help commands
	 *
	 * These commands are here to provide information about the bot.
	 */

	about: function(arg, by, room) {
		room.say("A bot made by SolarisFox. Objectively the cutest bot on Showdown.");
	},

	help: function(arg, by, room) {
		if (!config.botguide) return false;
		room.say("List of bot commands can be found here: " + config.botguide);
	},

	git: function(arg, by, room) {
		room.say("My git repository can be found here: https://github.com/SolarisFox/Art2d2");
	},

	uptime: function(arg, by, room) {
		if (!by.hasRank('+', room) || room.pm) {
			by.say("I have been running for " + Tools.getTimeAgo(this.uptime, true));
		} else {
			room.say("I have been running for " + Tools.getTimeAgo(this.uptime, true));
		}
	},

	/**
	 * Dev commands
	 *
	 * These commands are here for highly ranked users (or the creator) to use
	 * to perform arbitrary actions that can't be done through any other commands
	 * or to help with upkeep of the bot.
	 */

	hotpatch: 'reload',
	reload: function(arg, by, room) {
		if (!by.isSysOp()) return false;
		arg = arg.trim();
		var file = "./" + arg + ".js";
		try {
			require(file)[arg];
			Tools.uncacheTree(file);
			global[arg.charAt(0).toUpperCase() + arg.substr(1)] = require(file)[arg];
			room.say(file + " has been hotpatched.");
		} catch (e) {
			DebugTools.error('failed to reload: ' + sys.inspect(e));
		}
	},
	js: function(arg, by, room) {
		if (!by.isSysOp()) return false;
		try {
			var result = eval(arg.trim());
			room.say(JSON.stringify(result));
		} catch (e) {
			room.say(e.name + ": " + e.message);
		}
	},
	test: function(arg, by, room) {
		// DO NOT REMOVE THIS LINE
		if (!by.isSysOp()) return false;
		try {
		// =======================



		// =======================
		} catch (e) {
			console.log(e.stack);
		}
	},
	say: function(arg, by, room) {
		if (!by.isSysOp()) return false;
		var targets = arg.split(',');
		if (!Rooms[Tools.toRoomId(targets[0])]) {
			room.say("'" + targets[0] + "' does not exist.");
		} else {
			var targetRoom = getRoom(targets[0]);
			targetRoom.say(targets.slice(1).join(',').trim());
		}
	},
	announce: function(arg, by, room) {
		if (!by.isSysOp()) return false;
		var targets = arg.split(',');
		if (!Rooms[Tools.toRoomId(targets[0])]) {
			room.say("'" + targets[0] + "' does not exist.");
		} else {
			var targetRoom = getRoom(targets[0]);
			var text = targets.slice(1).join(',');
			if (targetRoom.canHTML()) {
				targetRoom.say(Tools.speechBubble(text));
			} else if (targetRoom.canAnnounce()) {
				targetRoom.say("/wall " + text);
			} else {
				targetRoom.say(text);
			}
		}
	},

	/**
	 * Room Owner commands
	 *
	 * These commands allow room owners to personalise Data.settings for moderation and command use.
	 */

	settings: 'set',
	set: function(arg, by, room) {
		if (!by.hasRank('%', room) || room.pm) return false;

		var settable = {
			joke: 1,
			fox: 1,
			randomcommands: 1,
			message: 1,
			showimage: 1
		};

		var opts = arg.split(',');
		var cmd = toId(opts[0]);
		if (!Commands[cmd]) return room.say('\\' + opts[0] + ' is not a valid command.');
		var failsafe = 0;
		while (!(cmd in settable)) {
			if (typeof Commands[cmd] === 'string') {
				cmd = Commands[cmd];
			} else if (typeof Commands[cmd] === 'function') {
				if (cmd in settable) {
					break;
				} else {
					room.say('The settings for \\' + opts[0] + ' cannot be changed.');
					return;
				}
			} else {
				room.say('Something went wrong. PM SolarisFox here or on Smogon with the command you tried.');
				return;
			}
			failsafe++;
			if (failsafe > 5) {
				room.say('The command "\\' + opts[0] + '" could not be found.');
				return;
			}
		}

		var settingsLevels = {
			'off': false,
			'disable': false,
			'paw': 'roompaw',
			'roompaw': 'roompaw',
			'+': '+',
			'%': '%',
			'@': '@',
			'&': '&',
			'#': '#',
			'~': '~',
			'on': true,
			'enable': true
		};

		if (!opts[1] || !opts[1].trim()) {
			var msg = '';
			if (!Data.settings.commands[cmd] || (!Data.settings.commands[cmd][room.id] && Data.settings.commands[cmd][room.id] !== false)) {
				msg = '\\' + cmd + ' is available for users of rank ' + ((cmd === 'autoban' || cmd === 'banword') ? '#' : config.defaultrank) + ' and above.';
			} else if (Data.settings.commands[cmd][room.id] in settingsLevels) {
				msg = '\\' + cmd + ' is available for users of rank ' + settings.commands[cmd][room.id] + ' and above.';
			} else if (Data.settings.commands[cmd][room.id] === true) {
				msg = '\\' + cmd + ' is available for all users in this room.';
			} else if (Data.settings.commands[cmd][room.id] === false) {
				msg = '\\' + cmd + ' is not available for use in this room.';
			}
			room.say(msg);
			return;
		} else {
			if (!by.hasRank('#~', room)) return false;
			var newRank = opts[1].trim();
			if (!(newRank in settingsLevels)) return room.say('Unknown option: "' + newRank + '". Valid settings are: off/disable, +, %, @, &, #, ~, on/enable.');
			if (!Data.settings.commands[cmd]) Data.settings.commands[cmd] = {};
			Data.settings.commands[cmd][room.id] = settingsLevels[newRank];
			Tools.writeJSON('settings', Data.settings);
			room.say('The command \\' + cmd + ' is now ' +
				(settingsLevels[newRank] === newRank ? ' available for users of rank ' + newRank + ' and above.' :
				(Data.settings.commands[cmd][room.id] ? 'available for all users in this room.' : 'unavailable for use in this room.')))
		}
	},

	/**
	 * Art Related Commands
	 *
	 * These commands mostly have to do with images and art resources
	 */

	showimage: function(arg, by, room) {
		if (!room.canHTML()) return false;
		var link = arg.trim();
		if (!/^https?:\/\//.test(link)) return room.say('Link must use HTTP or HTTPS.');
		var tarRoom = room;

		Tools.getImageData(link).then(img => {
			if (by.canUse("showimage", tarRoom)) {
				tarRoom.say("/addhtmlbox " + img.maxSize(500, 500).html());
			} else if (by.paw || by.hasRank('+', tarRoom)) {
				if (room.pm) tarRoom = getRoom("art");
				if (tarRoom.isPrivate) return false;
				Parser.pendingImageNumber++;
				Parser.pendingImages[Parser.pendingImageNumber] = {
					img: img,
					room: tarRoom
				};
				var text = by.name + "( " + tarRoom.id + ") wishes to share:<br>";
				text += img.maxSize(200, 180).html();
				text += "<center><button name=\"send\" value=\"/pm " + config.nick + ", " + config.commandcharacter + "approveimage " + Parser.pendingImageNumber + "\">Approve</button></center>"
				
				var onlineAuth = [];
				for (var mod in tarRoom.auth) {
					if (tarRoom.auth[mod] === "@" || tarRoom.auth[mod] === "#") {
						if (tarRoom.users.indexOf(mod) > -1) onlineAuth.push(mod)
					}
				}
				if (onlineAuth.length > 0) {
					var i = 0;
					var sayTimer = setInterval(function() {
						tarRoom.say("/pminfobox " + onlineAuth[i] + ", " + text);
						if (++i >= onlineAuth.length) clearInterval(sayTimer);
					}, 700);
				}
			}
		}).catch(e => {
			room.say("Was unable to load image from link.");
		});
	},

	// This command should be called via html button
	approveimage: function (arg, by, room) {
		if (!this.pendingImages[arg]) return false;
		var tarRoom = this.pendingImages[arg].room;
		if (!by.hasRank("@", tarRoom)) return false;

		var img = this.pendingImages[arg].img;
		tarRoom.say("/addhtmlbox " + img.maxSize(500, 300).html());
		tarRoom.say("/modnote " + by.id + " shared image: " + img.src);

		delete this.pendingImages[arg];
	},

	clearimages: function(arg, by, room) {
		if (!by.hasRank("@", room)) return false;
		this.pendingImages = {};
		if (!by.isSelf()) room.say("All currently pending images can no longer be approved.");
	},

	roomintro: function (arg, by, room) {
		if (!by.hasRank('@', room)) return false;
		if (room.id !== "art") return false;

		var introNum = 0;
		if (by.isSelf()) {
			// bot calls this function to cycle intros automatically from the Parser
			introNum = parseInt(arg);
			if (!Data.roomintros[introNum]) {
				DebugTools.error("Cycled to invalid roomintro #" + introNum);
				introNum = 1;
			}
			var newIntro = Data.roomintros[introNum];
			arg = [newIntro.banner, newIntro.caption, newIntro.hover];
		} else {
			// deleteing Data.roomintros
			if (arg.substr(0, 7).toLowerCase() === "delete ") {
				var target = arg.substr(7);
				if (!/https?:\/\//.test(target)) return room.say("Please provide an image link of the banner you wish to delete.");
				var foundAt = 0;
				for (var i in Data.roomintros) {
					if (target === Data.roomintros[i].banner) {
						foundAt = i;
						break;
					}
				}
				if (foundAt) {
					Data.roomintros[foundAt] = Data.roomintros[Object.size(Data.roomintros)];
					delete Data.roomintros[Object.size(Data.roomintros)];
					return room.say("Target roomintro has been deleted.");
				} else {
					return room.say("Could not find a roomintro with the provided banner");
				}
			}

			arg = arg.split(', ');
			if (arg.length !== 3) return room.say('Syntax is: ``\\roomintro [image link], [caption], [hover text]``');
			if (!/https?:\/\//.test(arg[0])) return room.say('please include a http hyperlink');
			if (!/\.(?:png|gif|jpe?g)$/.test(arg[0])) return room.say('Link must be a JPG, GIF, or PNG file.');
			do {
				introNum = random(1000000);
			} while (Data.roomintros[introNum]);
		}

		// if an image is uploaded a second time, override previous information
		for (var i in Data.roomintros) {
			if (arg[0] === Data.roomintros[i].banner) {
				introNum = i;
				break;
			}
		}

		var intro = '<!--#' + introNum + '--><div align="right"><font size=1 color=#585858><em>' +  arg[1] + ' &nbsp;';
		intro += '</em></font></div><center><div title="' + arg[2].replace(/"/g, "\"") + '">';
		intro += '<img src="' + arg[0] + '" width="493" height="120">';
		intro += '<br></div><font size=5>&#8203;</font><img src="http://www.thecloudplayer.com/images/empty.png" width="0" height="35">';
		intro += '<a href="http://psartroom.weebly.com/"><img src="http://i.imgur.com/ymObSSH.gif" width="105" height="30"></a>&nbsp;';
		intro += '<a href="http://www.smogon.com/forums/threads/daily-draw-challenge.3541628/"><img src="http://i.imgur.com/GwYE4IY.gif" width="105" height="30"></a>&nbsp;';
		intro += middleButton + '&nbsp;';
		intro += '<a href="https://docs.google.com/forms/d/1GS2xTBClmuqhnamCEWPBwGYWJJlx_0X00PR8BN5UR1Y/viewform"><img src="http://i.imgur.com/0azFwMv.png" width="105" height="30"></a>';
		intro += '<a href="https://docs.google.com/spreadsheets/d/1omEfmcW1o4fB6TEk53iVwakshT3ENHEOQJs4n28RZ88/edit#gid=1264539397"><img src="' + 'http://i.imgur.com/xGYlPuu.gif' + '" width="58" height="30"></a>';
		intro += '</center>';

		if (!by.isSelf()) {
			Data.roomintros[introNum] = {
				banner: arg[0],
				caption: arg[1],
				hover: arg[2],
				addedBy: by.id,
				lastUsed: 0,
				index: introNum
			}
			this.currentIntro = introNum;
		}
		Data.roomintros[this.currentIntro].lastUsed = Date.now();
		Tools.writeJSON('Data.roomintros', Data.roomintros);
		room.say("/roomintro " + intro);
		this.roomintroTimer = Date.now();
	},

	newcontest: function(arg, by, room) {
		if (!by.hasRank("#", room)) return false;
		if (room.id !== "art") return false;

		arg = arg.split(",");
		if (arg.length !== 2) return room.say("syntax is: ``\\newcontest [contest link], [button image]``");

		middleButton = '<a href="' + arg[0] + '"><img src="' + arg[1] + '" width="105" height="30"></a>';
		Commands.roomintro.call(this, this.currentIntro, getUser(config.nick), room);
		room.say('!htmlbox <div class="broadcast-green"><center><b>A new contest has been posted!</b></center></div>');
	},

	dd: 'dailydraw',
	dailydraw: function(arg, by, room) {
		var text = ""
		if (!Data.dailydraws.dd) Data.dailydraws.dd = 'There is no Daily Draw currently set.';
		if (!arg) {
			if (room.pm || !by.hasRank('+', room)) return by.say(Data.dailydraws.dd);
			if (room.canHTML()) return room.say(Tools.speechBubble(Data.dailydraws.dd));
			return room.say(Data.dailydraws.dd);
		} else if (toId(arg) === 'ideas') {
			if (!room.pm && !by.hasRank('+', room)) text = '/pm ' + by.currentId + ', ';
			return room.say(text + 'https://docs.google.com/forms/d/19clD3D7rw9COaY6PvgD0UgJ7v933dzBiK5VVNYyjOQE/viewform?usp=send_form');
		} else if (toId(arg) === 'list') {
			if (!room.pm && !by.hasRank('+', room)) text = '/pm ' + by.currentId + ', ';
			return room.say(text + 'https://docs.google.com/spreadsheets/d/13_TuErG5sqs94VEbFCIha7oHXtjuxxG7GOcYBpWoV4o/edit#gid=376727512');
		} else if (toId(arg) === 'info') {
			return room.say(text + '**Daily Draw** is a room activity wherein you make a short sketch or speedpaint of the listed activity to practice your skills and creativity. ' + 
					'Use ``\\dd posts`` to share a link to your drawing or to look at what others have made.');
		} else if (arg.substr(0, 5).toLowerCase()  === 'set, ') {
			if (!by.hasRank('%', getRoom("art"))) return room.say('Requires %.');
			if (room.pm) return by.say('\\dd set cannot be used in pm.');
			Data.dailydraws.dd = arg.charAt(5).toUpperCase() + arg.substr(6);
			Data.dailydraws.ddlog = {"user":Tools.trimRank(by.name),"time":Date.now()};
			if (!Data.dailydraws.archive) Data.dailydraws.archive = [];
			Data.dailydraws.archive.push(Tools.getDate() + ": " + Data.dailydraws.dd);
			Tools.writeJSON('dailydraws', Data.dailydraws);
			return room.say('The Daily Draw has been set!');
		} else if (arg.substr(0, 7).toLowerCase()  === 'amend, ') {
			if (!by.hasRank('%', getRoom("art"))) return room.say('Requires %.');
			if (room.pm) return by.say('\\dd set cannot be used in pm.');
			if (!Data.dailydraws.dd) return room.say('There is no Daily Draw currently set!');
			Data.dailydraws.dd = arg.charAt(7).toUpperCase() + arg.substr(8);
			Data.dailydraws.archive[Data.dailydraws.archive.length - 1] = Tools.getDate() + ": " + Data.dailydraws.dd;
			Tools.writeJSON('dailydraws', Data.dailydraws);
			return room.say('The Daily Draw has edited!');
		} else if (toId(arg) === 'posts') {
			if (!room.pm && !by.hasRank('+', room)) text = '/pm ' + by.currentId + ', ';
			return room.say(text + 'http://www.smogon.com/forums/threads/daily-draw-challenge.3541628/');
		} else if (toId(arg) === 'archive') {
			if (!by.hasRank('+', getRoom("art")) && !by.paw) return room.say('Requires +.');
			Tools.uploadToHastebin(by, Data.dailydraws.archive.join("\n"));
		} else if (toId(arg) === 'log') {
			if (!room.pm && !by.hasRank('+', room)) text = '/pm ' + by.currentId + ', ';
			var timeAgo = Tools.getTimeAgo(Data.dailydraws.ddlog.time);
			return room.say(text + 'Daily Draw was set ' + timeAgo + ' ago by ' + Data.dailydraws.ddlog.user + '.');
		} else {
			room.say(text + 'Valid Daily Draw commands are: ``set``, ``amend``, ``info``, ``ideas``, ``archive``, and ``posts``.');
		}
	},

	gallery: function(arg, by, room) {
		arg = arg.trim();
		if (!arg) {
			if (by.gallery) {
				room.say(by.name + "'s gallery: " + by.gallery);
			} else {
				room.say("You do not currently have a gallery. To set one, use ``\\gallery [link]``");
			}
		} else if (/^https?:\/\//.test(arg)) {
			Data.galleries[by.id] = arg;
			Tools.writeJSON('galleries', Data.galleries);
			by.gallery = arg;
			room.say(by.name + "'s gallery has been set to: " + arg);
		} else {
			var foundLink = "";
			if (Users[toId(arg)]) foundLink = getUser(arg).gallery;
			if (!foundLink) foundLink = Data.galleries[toId(arg)];
			if (!foundLink) return room.say("No gallery was found for " + arg);
			room.say(arg + "'s gallery: " + foundLink);
		}
	},

	/**
	 * Mail Related Commands
	 *
	 * These commands are for offline PMs
	 */

	mail: 'message',
	msg: 'message',
	message: function(arg, by, room) {
		if (!by.paw && !by.canUse('message', getRoom("art"))) return by.say('``\mail`` is only available to users ' + Data.settings.commands.message.art || config.defaultrank + ' and above and those with "roompaw".');
		var parts = arg.split(', ');
		var target = toId(parts[0]);
		if (Users[target]) target = getUser(target).id;
		if (target.length > 18 || target.length === 0) return room.say('That\'s not a real username! >:I');
		var message = by.name + ': ' + parts.slice(1).join(', ');
		if (message.length < by.name.length + 3) return room.say('You forgot to include the message! D:');
		if (['art2d2', 'zarel'].indexOf(target) > -1) return by.say('/me chews up mail.');
		if (!Data.messages) Data.messages = {};
		if (!Data.messages[target]) {
			Data.messages[target] = {
				timestamp: Date.now(),
				mail: []
			};
		}
		if (Data.messages[target].mail.length >= 3) return by.say(target + "'s message inbox is full.");
		Data.messages[target].mail.push(message);
		Tools.writeJSON("messages", Data.messages);
		by.say('Your message has been sent to ' + target + '.');
	},

	roompaw: function(arg, by, room) {
		if (!by.hasRank('@', getRoom('art')) || room.pm) return false;
		if (!arg) return room.say('Who shall be roompaw\'d?');
		var target = toId(arg);
		if (!Users[target]) return room.say("User '" + arg.trim() + "' not found.");
		var user = getUser(target);
		if (user.paw) return room.say(user.name + " already has roompaw.");
		user.paw = true;
		Data.roompaws[user.id] = Date.now();
		Tools.writeJSON("Roompaws", Data.roompaws);
		room.say(user.name + ' has been promoted to Roompaw!');
		room.say('/modnote ' + user.id + ' has been given roompaw by ' + by.id);
	},

	unpaw: "roomunpaw",
	unroompaw: "roomunpaw",
	roomunpaw: function(arg, by, room) {
		if (!by.hasRank('@', getRoom('art')) || room.pm) return false;
		if (!arg) return room.say('Who shall have roompaw removed?');
		var target = toId(arg);
		if (Users[target]) {
			var user = getUser(target);
			if (!user.paw) return room.say(user.name + " does not currently have roompaw.");
			user.paw = false;
			delete Data.roompaws[user.id];
			Tools.writeJSON("Roompaws", Data.roompaws);
			room.say(user.name + " no longer has roompaw.");
			room.say('/modnote ' + user.id + ' had roompaw removed by ' + by.id);
		} else {
			if (!Data.roompaws[target]) return room.say(target + " does not currently have roompaw.");
			delete Data.roompaws[target];
			room.say(target + " no longer has roompaw.");
			room.say('/modnote ' + target + ' had roompaw removed by ' + by.id);
		}
	},

	 /**
	 * PAD Commands
	 *
	 * Commands using the Puzzle and Dragons api
	 */

	paddex: function(arg, by, room, con) {
		if (!by.hasRank('+', room) && !room.pm) return false;
		if (!Data.PAD.monsters) {
			Data.PAD.tools.getFiles().then(loaded => {
				Commands.paddex.call(this, arg, by, room);
			}).catch(e => {
				room.say("Failed to load Data.PAD files.");
			});
			return;
		}

		var parse = Data.PAD.tools;
		var search = toId(arg);
		var results = [];
		var exactMatch = false;
		for (var i = 0; i < Data.PAD.monsters.length; i++) {
			if (!isNaN(search)) {
				if (Data.PAD.monsters[i].id == search) {
					exactMatch = true;
					var buffer = {
						type: "monster",
						num: i,
						name: Data.PAD.monsters[i].name
					};
					results.push(buffer);
					break;
				}
			} else {
				var name = toId(Data.PAD.monsters[i].name);
				if (name === search) {
					exactMatch = true;
					var buffer = {
						type: "monster",
						num: i,
						name: Data.PAD.monsters[i].name
					};
					results.push(buffer);
					break;
				} else if (name.indexOf(search) > -1) {
					var buffer = {
						type: "monster",
						num: i,
						name: Data.PAD.monsters[i].name
					};
					results.push(buffer);
				}
			}
		}
		if (!exactMatch) {
			for (var j = 0; j < Data.PAD.active_skills.length; j++) {
				var name = ".";
				if (Data.PAD.active_skills[j].name) name = toId(Data.PAD.active_skills[j].name);
				if (name === search) {
					exactMatch = true;
					var buffer = {
						type: "active",
						num: j,
						name: Data.PAD.active_skills[j].name
					};
					results.push(buffer);
					break;
				} else if (name.indexOf(search) > -1) {
					var buffer = {
						type: "active",
						num: j,
						name: Data.PAD.active_skills[j].name
					};
					results.push(buffer);
				}
			}
		}
		if (!exactMatch) {
			for (var j = 0; j < Data.PAD.leader_skills.length; j++) {
				var name = ".";
				if (Data.PAD.leader_skills[j].name) name = toId(Data.PAD.leader_skills[j].name);
				if (name === search) {
					exactMatch = true;
					var buffer = {
						type: "leader",
						num: j,
						name: Data.PAD.leader_skills.name
					};
					results.push(buffer);
					break;
				} else if (name.indexOf(search) > -1) {
					var buffer = {
						type: "leader",
						num: j,
						name: Data.PAD.leader_skills[j].name
					};
					results.push(buffer);
				}
			}
		}
		if (!exactMatch) {
			for (var j = 0; j < Data.PAD.awakenings.length; j++) {
				var name = toId(Data.PAD.awakenings[j].name);
				if (name === search) {
					exactMatch = true;
					var buffer = {
						type: "awaken",
						num: j,
						name: Data.PAD.awakenings[j].name
					};
					results.push(buffer);
					break;
				} else if (name.indexOf(search) > -1) {
					var buffer = {
						type: "awaken",
						num: j,
						name: Data.PAD.awakenings[j].name
					};
					results.push(buffer);
				}
			}
		}

		var text = "";
		if (results.length === 1) {
			var result = results[0];
			switch (result.type) {
			case "monster":
				result = Data.PAD.monsters[result.num];
				if (!room.pm && room.canHTML()) {
					text += '!htmlbox <table><tr>';
					text += '<td><a href="http://puzzledragonx.com/en/monster.asp?n=' + result.id + '"><img src="https://www.padherder.com' + result.image60_href + '" height=60 width=60></a></td>';
					text += '<td><font size=1>';
					text += '<font color=#666666>#' + result.id + '</font> ';
					text += '<b>' + result.name + '</b> ';
					text += '<hr>';
					if (result.active_skill) {
						var activeSkill = parse.activeSkill(result.active_skill);
						text += '<span title="' + activeSkill.effect + ' - Cooldown: ' + activeSkill.min_cooldown + ' turns"><font color=#666666>Active Skill:</font> ' + result.active_skill + '</span>';
					} else {
						text += '<font color=#666666>Active Skill:</font> none';
					}
					text += '<hr>';
					if (result.leader_skill) {
						text += '<span title="' + parse.leaderSkill(result.leader_skill).effect + '"><font color=#666666>Leader Skill:</font> ' + result.leader_skill + '</span>';
					} else {
						text += '<font color=#666666>Leader Skill:</font> none';
					}
					text += '</font></td>';
					text += '<td><table cellpadding=1>';
					text += '<tr><td align="right"><font size=1>HP:</font></td><td align="right">' + result.hp_max + "</td></tr>";
					text += '<tr><td align="right"><font size=1>ATK:</font></td><td align="right">' + result.atk_max + "</td></tr>";
					text += '<tr><td align="right"><font size=1>RCV:</font></td><td align="right">' + result.rcv_max + "</td></tr>";
					text += '</table></td>';
					text += '</tr><tr><td align="center">';
					text += '<span title="' + parse.type(result.type) + '"><img src="' + parse.typeImage(result.type) + '" height=16 width=16></span>';
					if (result.type2) text += ' <span title="' + parse.type(result.type2) + '"><img src="' + parse.typeImage(result.type2) + '" height=16 width=16></span>';
					if (result.type3) text += ' <span title="' + parse.type(result.type3) + '"><img src="' + parse.typeImage(result.type3) + '" height=16 width=16></span>';
					text += '</td><td align="center">';
					for (var aa = 0; aa < result.awoken_skills.length; aa++) {
						var awoken = parse.awakening(result.awoken_skills[aa]);
						text += '<span title="' + awoken.name + ": " + awoken.desc + '">';
						text += '<img src="http://puzzledragonx.com/en/img/awoken/' + (awoken.id + 2) + '.png" height=16 width=16></span>';
						if (aa < result.awoken_skills.length - 1) text += " ";
					}
					text += '</td><td>';
					text += '<font size=1>&nbsp;cost: ' + result.team_cost + '</font>';
					text += '</td></tr></table>';
				} else {
					text += "#" + result.id + " ";
					text += "**" + result.name + "**: ";
					text += "``" + parse.element(result.element);
					if (result.element2) text += "/" + parse.element(result.element2);
					text += "`` | ``" + parse.type(result.type);
					if (result.type2) text += "/" + parse.type(result.type2);
					if (result.type3) text += "/" + parse.type(result.type3);
					text += "`` | Max level: " + result.max_level;
					text += " ``(hp: " + result.hp_max + ", atk: " + result.atk_max + ", rcv: " + result.rcv_max + ")``";
					text += " | cost: " + result.team_cost;
					text += " | Active Skill: " + result.active_skill;
					text += " | Leader Skill: " + result.leader_skill;
					if (result.awoken_skills.length > 0) {
						//text += " | Awakens: ``"
						//for (var n = 0; n < result.awoken_skills.length; n++) {
						//	text += parse.awakening(result.awoken_skills[n], true);
						//	if (n < result.awoken_skills.length - 1) text += ", ";
						//}
						//text += "``";
					}
				}
				break;
			case "active":
				result = Data.PAD.active_skills[result.num];
				text += "**" + result.name + "**: ";
				text += "cooldown: ``" + result.min_cooldown + "-" + result.max_cooldown;
				text += "`` | " + result.effect;
				break;
			case "leader":
				result = Data.PAD.leader_skills[result.num];
				text += "**" + result.name + "**: ";
				text += result.effect;
				break;
			case "awaken":
				result = Data.PAD.awakenings[result.num];
				text += "**" + result.name + "**: ";
				text += result.desc;
				break;
			}
		} else if (results.length === 0) {
			text = "No monsters, abilities, or skills named '" + arg + "' found.";
		} else if (results.length < 7) {
			text += "Matching Searches: "
			for (var k = 0; k < results.length; k++) {
				switch (results[k].type) {
				case "monster":
					text += "``Monster:`` ";
					break;
				case "active":
					text += "``Active Skill:`` ";
					break;
				case "leader":
					text += "``Leader Skill:`` ";
					break;
				}
				text += results[k].name;
				if (k < results.length - 1) text += " | ";
			}
		} else {
			text = "Too many matches found! Try a more specific search.";
		}
		room.say(text);
	},

	padx: function(arg, by, room) {
		if (!by.hasRank('+', room) && !room.pm) return false;
		if (!Data.PAD.monsters) {
			Data.PAD.tools.getFiles().then(loaded => {
				Commands.padx.call(this, arg, by, room);
			}).catch(e => {
				room.say("Failed to load Data.PAD files.");
			});
			return;
		}

		var monster = toId(arg);
		var num = 0;
		for (var i = 0; i < Data.PAD.monsters.length; i++) {
			if (toId(Data.PAD.monsters[i].name) === monster) {
				num = Data.PAD.monsters[i].id;
				break;
			}
		}
		if (num) {
			room.say("http://www.puzzledragonx.com/en/monster.asp?n=" + num);
		} else {
			room.say("No monster named '" + arg + "' found.");
		}
	},

	skillup: function(arg, by, room) {
		if (!by.hasRank('+', room) && !room.pm) return false;
		if (!Data.PAD.monsters || !Data.PAD.active_skills) {
			Data.PAD.tools.getFiles().then(loaded => {
				Commands.skillup.call(this, arg, by, room);
			}).catch(e => {
				room.say("Failed to load Data.PAD files.");
			});
			return;
		}

		var target = toId(arg);
		var monster = {};
		for (var i = 0; i < Data.PAD.monsters.length; i++) {
			if (toId(Data.PAD.monsters[i].name) === target) {
				monster = Data.PAD.monsters[i];
				break;
			}
		}
		if (Object.size(monster) > 0) {
			var skillUpMats = [];
			for (var i = 0; i < Data.PAD.monsters.length; i++) {
				if (Data.PAD.monsters[i].active_skill === monster.active_skill && Data.PAD.monsters[i].id !== monster.id) {
					skillUpMats.push(Data.PAD.monsters[i]);
				}
			}
			if (skillUpMats.length === 0) return room.say("Only Pis currently skill up " + monster.name + ".");

			if (room.canHTML && !room.pm) {
				var text = "/addhtmlbox ";
				for (var i = 0; i < skillUpMats.length; i++) {
					text += '<span title="' + skillUpMats[i].name + '">';
					text += '<a href="http://www.puzzledragonx.com/en/monster.asp?n=' + skillUpMats[i].id + '">';
					text += '<img src="https://www.padherder.com' + skillUpMats[i].image40_href + '" height="40" width="40">';
					text += '</a></span> ';
				}
				room.say(text);
			} else {
				var names = [];
				for (var i = 0; i < skillUpMats.length; i++) {
					names.push(skillUpMats[i].name);
				}
				room.say(names.join(", "));
			}
		} else {
			room.say("No monster named '" + arg + "' was found.");
		}
	},

	/**
	 * Creativity Commands
	 *
	 * mostly random rollers of various things
	 */

	randomcommands: function(arg, by, room) {
		return false;
		room.say('Random commands are: \'randpokemon\', \'randtype\', \'randstats\', \'randitem\', \'randability\', \'randlocation\', \'randpalette\'');
	},

	rt: 'randomtype',
	randtype: 'randomtype',
	randomtype: function(arg, by, room) {
		if (!by.canUse('randomcommands', room) && !room.pm) return false;
		var type1 = pokemonTypes[random(pokemonTypes.length)].capitalize();
		var type2 = pokemonTypes[random(pokemonTypes.length)].capitalize();
		
		if (type1 !== type2) {
			room.say("Randomly generated type: **" + type1 + "/" + type2 + "**");
			return [type1, type2];
		} else {
			room.say("Randomly generated type: **" + type1 + "**");
			return [type1];
		}
	},

	randstats: 'randomstats',
	rs: 'randomstats',
	randomstats: function(arg, by, room) {
		if (!by.canUse('randomcommands', room) && !room.pm) return false;
		var stat = [0, 0, 0, 0, 0, 0];
		var currentST = 0;
		var leveler = random(5) + 2;

		var bstMin = 200;
		var bstMax = 780
		if (arg) {
			if (isNaN(arg.charAt(0))) return room.say('Syntax is: ``\\randstats [BST min]-[BST max]``');
			arg = arg.split('-');
			if (arg.length == 1) {
				bstMin = parseInt(arg);
				bstMax = parseInt(arg);
			} else if (arg.length == 2) {
				bstMin =  parseInt(arg[0]);
				bstMax =  parseInt(arg[1]);
			} else {
				return room.say('Syntax is: ``\\randstats [BST min]-[BST max]``');
			}
		}
		if (!Number.isInteger(bstMin) || bstMin < 150) return room.say("Specified BST must be a whole number between 150 and 780.");
		if (!Number.isInteger(bstMin) || bstMin > 780) return room.say("Specified BST must be a whole number between 150 and 780.");
		if (bstMax < bstMin) return room.say('Invalid range');
		var bst = (Math.floor((bstMax - bstMin) * Math.random()) + bstMin);
		
		for (var j = 0; j < leveler; j++) {
			for (var i = 0; i < 6; i++) {
				var randomPart = random(bst / ( leveler * 3 )) + 1;
				if (randomPart < (20 / leveler)) randomPart = Math.floor(20 / leveler);
				stat[i] += randomPart;
				currentST += randomPart;
			}
		}

		if (currentST > bst) {
			for (var k = currentST; k > bst; k--) {
				stat[random(6)] -= 1;
			}
		} else if (currentST < bst) {
			for (var k = currentST; k < bst; k++) {
				stat[random(6)] += 1;
			}
		}
		
		stat = Tools.shuffle(stat);
		if (!room.canHTML()) {
			room.say('Random stats: HP:**' + stat[0] + 
					'** Atk:**' + stat[1] + 
					'** Def:**' + stat[2] + 
					'** SpA:**' + stat[3] +
					'** SpD:**' + stat[4] + 
					'** Spe:**' + stat[5] + 
					'** BST:**' + bst + '**'
			);
		} else {
			var text = '!htmlbox <table style="width: 200px; table-layout: fixed;"><tr style="color: gray; font-size: 8pt; text-align: right;">' +
				'<td>HP</td><td>Atk</td><td>Def</td><td>SpA</td><td>SpD</td><td>Spe</td><td>BST</td>' +
				'</tr><tr style="text-align: right; font-size: 8pt";">';
			for (var i = 0; i < 6; i++) {
				text += '<td>' + stat[i] + '</td>';
			}
			text += '<td style="color: gray">' + bst + '</td></tr></table>';
			room.say(text);
		}
		
		return stat;
	},

	ra: 'randomability',
	randability: 'randomability',
	randomability: function(arg, by, room, con) {
		if (!by.canUse("randomcommands", room) && !room.pm) return false;

		var abilityQuantity = 1;
		var randomAbilities = [];
		var viableOnly = false;
		if (arg) {
			arg = arg.split(",");
			for (var j = 0; j < arg.length; j++) {
				if (arg[j] === 'viable') {
					viableOnly = true;
				} else {
					abilityQuantity = parseInt(arg[j]);
					if (!Number.isInteger(abilityQuantity) || abilityQuantity < 1 || abilityQuantity > 6) {
						return room.say("Number of moves must be between 1 and 6.");
					}
				}
			}
		}

		var keys = Tools.shuffle(Object.keys(Data.Abilitydex));
		for (var k = 0; k < keys.length; k++) {
			var ability = Data.Abilitydex[keys[k]];
			if (viableOnly && !ability.viable) continue;
			randomAbilities.push(ability.name);
			if (randomAbilities.length === abilityQuantity) break;
		}

		var text = "";
		if (randomAbilities.length === 1 && randomAbilities[0] !== 'Cacophony' && room.canBroadcast()) text = "!dt ";
		room.say(text + randomAbilities.join(', '));
		return randomAbilities;
	},

	randmove: 'randommove',
	rt: 'randommove',
	randommove: function(arg, by, room) {
		if (!by.canUse('randomcommands', room) && !room.pm) return false;

		var numOfMoves = 1;
		var requiredType = "";
		var requiredCategory = "";
		var requiredContestType = "";
		var requiredFlags = [];
		var requireViable = false;

		var allCategories = {'physical':1, 'special':1, 'status':1};
		var allContestTypes = {'beautiful':1, 'clever':1, 'cool':1, 'cute':1, 'tough':1};
		var allFlags = {'authentic':1, 'bite':1, 'bullet':1, 'contact':1, 'defrost':1, 'powder':1, 'pulse':1, 'punch':1, 'secondary':1, 'snatch':1, 'sound':1};

		// Parse the search terms
		var args = arg.split(",");
		for (var i = 0; i < args.length; i++) {
			var param = args[i].trim().toLowerCase();
			if (Number.isInteger(parseFloat(param))) {
				var num = parseInt(param);
				if (0 >= num || num > 16) room.say("Number of random moves must be between 1 and 15.");
				numOfMoves = num;
				continue;
			}

			if (param === "viable") {
				requireViable = true;
				continue;
			}

			if (param.indexOf(" type") > -1) {
				if (requiredType) return room.say("Moves only have one type.");
				param = param.replace(" type", "");
				if (pokemonTypes.indexOf(param) > -1) {
					requiredType = param.capitalize();
				} else {
					return room.say("'" + param + " type' is not recognized.");
				}
				continue;
			}

			if (param in allCategories) {
				if (requiredCategory) return room.say("Moves only have one category.");
				requiredCategory = param.capitalize();
				continue;
			}

			if (param in allContestTypes) {
				if (requiredContestType) return room.say("Moves only have one contest type.");
				requiredContestType = param.capitalize();
				continue;
			}

			if (param in allFlags) {
				requiredFlags.push(param);
				continue;
			}

			return room.say("Parameter '" + args[i] + "' was not recognized.");
		}

		// The search itself
		var dex = Tools.shuffle(Object.keys(Data.Movedex));
		var matches = [];

		for (var i = 0; i < dex.length; i++) {
			if (matches.length === numOfMoves) break;

			var move = Data.Movedex[dex[i]];

			if (requiredType && move.type !== requiredType) continue;
			if (requiredCategory && move.category !== requiredCategory) continue;
			if (requiredContestType && move.contestType !== requiredContestType) continue;
			if (requiredFlags.length) {
				var missingFlag = false;
				for (var j = 0; j < requiredFlags.length; j++) {
					if (!move.flags[requiredFlags[j]]) missingFlag = true;
				}
				if (missingFlag) continue;
			}
			if (requireViable && !move.isViable) continue;

			// passed all conditions
			matches.push(move.name);
		}

		if (!matches.length) {
			room.say("No moves matching the given parameters were found.");
		} else if (matches.length < numOfMoves) {
			room.say("Only these " + matches.length + " fit the given parameters: " + matches.join(", "));
		} else {
			room.say(matches.join(", "));
		}
		return matches;
	},

	fakemon: "cap",
	cap: function(arg, by, room) {
		if (!by.canUse('randomcommands', room) && !room.pm) return false;

		var self = getUser(config.nick);
		var dummyRoom = new Room("dummy");
		dummyRoom.say = function(text) {}; // will ignore say functions
		var stats = Commands.randomstats.call(this, "500-600", self, dummyRoom);
		var statNames = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'];
		var bst = stats[0] + stats[1] + stats[2] + stats[3] + stats[4] + stats[5];
		var type = Commands.randomtype.call(this, "", self, dummyRoom);
		var ability = Commands.randomability.call(this, "2,viable", self, dummyRoom);
		var move = [];
		if (stats[1] + 30 > stats[3]) {
			move = Commands.randommove.call(this, "2,viable,physical", self, dummyRoom);
		} else if (stats[3] + 30 > stats[1]) {
			move = Commands.randommove.call(this, "2,viable,special", self, dummyRoom);
		} else {
			move = Commands.randommove.call(this, "2,viable", self, dummyRoom);
		}

		// Code for generating a random name based on types generated
		// Start by accessing the array from the namelist.js file in the data folder.
		var name = '';
		var type1array = Tools.shuffle(Data.Namelist[type[0]]);

		var type2array = [];
		if (type.length === 1) { //Checking for single type case
			type2array = Tools.shuffle(type1array);
		} else {
			type2array = Tools.shuffle(Data.Namelist[type[1]]);
		}

		// Grab our first word for the name
		for (var i = 0; i < type1array.length; i++) {
			if (type1array[i].charAt(0) === '+') {
				// Case Prefix, remove '+' char from string and use
				name += type1array[i].substr(1);
				break;
			} else if (type1array[i].charAt(0) !== '-') {
				// If our string isn't a suffix, it's still ok. No characters to remove.
				name += type1array[i];
				break;
			}
		}
		//Second word. Same stuff as the first, for the most part.
		for (var i = 0; i < type2array.length; i++) {
			if (type2array[i].charAt(0) === '-') {
				// Case Suffix, remove '-' char from string and use
				name += type2array[i].substr(1);
				break;
			} else if (type2array[i].charAt(0) !== '+') {
				// If our string isn't a prefix, it's still ok. No characters to remove.
				name += type2array[i];
				break;
			}
		}
		name = name.capitalize();

		var text = "";
		if (!room.canHTML()) {
			text = "``" + name + ":`` A **" + type.join("/") + "** Pokemon with **";
			text += ability[0] + "**. It's stats are ``" + stats.join(", ") + "`` (" + bst + " bst). ";
			text += "It uses the move **" + move[0] + "**.";
		} else {
			text = '!htmlbox <table style="color:#444444;font-size:8pt">';
			text += '<tr style="height:30px">';
			text += '<td rowspan="3" style="width:40;vertical-align:top"><img src="http://i.imgur.com/Fx5wxDl.png" height="30" width="40"></img></td>'; // sprite
			text += '<td colspan="6">'+ name +'</td>'; // name
			text += '<td style="width:32px"><img src="//play.pokemonshowdown.com/sprites/types/' + type[0] + '.png" height="14" width="32"></img></td>'; //type 1
			text += '<td style="width:32px">';
			if (type.length === 2) text += '<img src="//play.pokemonshowdown.com/sprites/types/' + type[1] + '.png" height="14" width="32"></img>'; //type 2
			text += '</td>';
			text += '<td style="width:86px;text-align:center">' + ability[0] + '</td>'; //main ability
			text += '<td style="width:86px;text-align:center"><em>' + ability[1] + '</em></td>'; //hidden ability
			text += '</tr><tr style="height:15px;color:#888888;text-align:right">'
			for (var i = 0; i < 6; i++) {
				text += '<td style="width:24px">' + statNames[i] + '</td>'; //stat names
			}
			text += '<td>BST</td>';
			text += '<td colspan="3" style="text-align:center">Featured Moves</td>';
			text += '</tr><tr style="height:15px;text-align:right">';
			for (var i = 0; i < 6; i++) {
				text += '<td style="width:24px">' + stats[i] + '</td>'; //stats
			}
			text += '<td>' + bst + '</td>'; //bst
			text += '<td colspan="3" style="text-align:center">' + move.join(", ") + '</td>'; //moves
			text += '</tr></table>'
		}
		room.say(text);
	},

	fakemonlc: "lccap",
	caplc: "lccap",
	lcfakemon: "lccap",
	lccap: function(arg, by, room) {
		if (!by.canUse('randomcommands', room) && !room.pm) return false;

		var self = getUser(config.nick);
		var dummyRoom = new Room("dummy");
		dummyRoom.say = function(text) {}; // will ignore say functions
		var stats = Commands.randomstats.call(this, "250-410", self, dummyRoom);
		var statNames = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'];
		var bst = stats[0] + stats[1] + stats[2] + stats[3] + stats[4] + stats[5];
		var type = Commands.randomtype.call(this, "", self, dummyRoom);
		var ability = Commands.randomability.call(this, "2,viable", self, dummyRoom);
		var move = [];
		if (stats[1] + 30 > stats[3]) {
			move = Commands.randommove.call(this, "2,viable,physical", self, dummyRoom);
		} else if (stats[3] + 30 > stats[1]) {
			move = Commands.randommove.call(this, "2,viable,special", self, dummyRoom);
		} else {
			move = Commands.randommove.call(this, "2,viable", self, dummyRoom);
		}

		// Code for generating a random name based on types generated
		// Start by accessing the array from the namelist.js file in the data folder.
		var name = '';
		var type1array = Tools.shuffle(Data.Namelist[type[0]]);

		var type2array = [];
		if (type.length === 1) { //Checking for single type case
			type2array = Tools.shuffle(type1array);
		} else {
			type2array = Tools.shuffle(Data.Namelist[type[1]]);
		}

		// Grab our first word for the name
		for (var i = 0; i < type1array.length; i++) {
			if (type1array[i].charAt(0) === '+') {
				// Case Prefix, remove '+' char from string and use
				name += type1array[i].substr(1);
				break;
			} else if (type1array[i].charAt(0) !== '-') {
				// If our string isn't a suffix, it's still ok. No characters to remove.
				name += type1array[i];
				break;
			}
		}
		//Second word. Same stuff as the first, for the most part.
		for (var i = 0; i < type2array.length; i++) {
			if (type2array[i].charAt(0) === '-') {
				// Case Suffix, remove '-' char from string and use
				name += type2array[i].substr(1);
				break;
			} else if (type2array[i].charAt(0) !== '+') {
				// If our string isn't a prefix, it's still ok. No characters to remove.
				name += type2array[i];
				break;
			}
		}
		name = name.capitalize();

		var text = "";
		if (!room.canHTML()) {
			text = "``" + name + ":`` A **" + type.join("/") + "** Pokemon with **";
			text += ability[0] + "**. It's stats are ``" + stats.join(", ") + "`` (" + bst + " bst). ";
			text += "It uses the move **" + move[0] + "**.";
		} else {
			text = '!htmlbox <table style="color:#444444;font-size:8pt">';
			text += '<tr style="height:30px">';
			text += '<td rowspan="3" style="width:40;vertical-align:top"><img src="http://i.imgur.com/Fx5wxDl.png" height="30" width="40"></img></td>'; // sprite
			text += '<td colspan="6">'+ name +'</td>'; // name
			text += '<td style="width:32px"><img src="//play.pokemonshowdown.com/sprites/types/' + type[0] + '.png" height="14" width="32"></img></td>'; //type 1
			text += '<td style="width:32px">';
			if (type.length === 2) text += '<img src="//play.pokemonshowdown.com/sprites/types/' + type[1] + '.png" height="14" width="32"></img>'; //type 2
			text += '</td>';
			text += '<td style="width:86px;text-align:center">' + ability[0] + '</td>'; //main ability
			text += '<td style="width:86px;text-align:center"><em>' + ability[1] + '</em></td>'; //hidden ability
			text += '</tr><tr style="height:15px;color:#888888;text-align:right">';
			for (var i = 0; i < 6; i++) {
				text += '<td style="width:24px">' + statNames[i] + '</td>'; //stat names
			}
			text += '<td>BST</td>';
			text += '<td colspan="3" style="text-align:center">Featured Moves</td>';
			text += '</tr><tr style="height:15px;text-align:right">';
			for (var i = 0; i < 6; i++) {
				text += '<td style="width:24px">' + stats[i] + '</td>'; //stats
			}
			text += '<td>' + bst + '</td>'; //bst
			text += '<td colspan="3" style="text-align:center">' + move.join(", ") + '</td>'; //moves
			text += '</tr></table>';
		}
		room.say(text);
	},

	randsalad: 'randomsalad',
	randomsalad: function(arg, by, room) {
		if (!by.canUse('randomcommands', room) && !room.pm) return false;
		var adjectives = ["Crunchy","Cold","Warm","Moist","Yummy Yummy","Fresh","Rotten","Sketchy","Steamy","Glossy","Sparkly","Purple","Delicious","Heavenly","Stinky","Wet","Sexy","Explosive","Soggy","Giant","Hot",
				"Sparkling","Deluxe","Up-side Down","Omnipotent","Spicy","Milky","Tangy","Mmmmm~","Otter-Flavored","Flying","Salad-Flavored","Mystery","Radioactive","Sadistic","Microwaved"
		];
		var salads = ["Ambrosia Salad","Acar Salad","Antipasto","Arab Salad","Asinan","Bean Salad","Caesar Salad","Cheese Slaw","Chef Salad","Chicken Salad","Cobb Salad","Coleslaw","Crab Louie","Dressed Herring","Egg Salad",
				"Fattoush","Fiambre","Fruit Salad","Garden Salad","Greek Salad","Ham Salad","Jell-o Salad","Macaroni Salad","Michigan Salad","Panzanella","Pasta Salad","Potato Salad","Sheperd's Salad","Szalot",
				"Taco Salad","Tuna Salad","Waldorf Salad","Salad Salad"
		];
		room.say('Random salad: **' + Tools.sample(adjectives)[0] + ' ' + Tools.sample(salads)[0] + '**.');
	},

	randlocation: 'randomlocation',
	randomlocation: function(arg, by, room) {
		if (!by.canUse('randomcommands', room) && !room.pm) return false;
		var adjectives = ["crystal", "floating", "eternal-dusk", "sunset", "snowy", "rainy", "sunny", "chaotic", "peaceful", "colorful", "gooey", "fiery", "jagged", "glass", "vibrant", "rainbow", "foggy",
				"calm", "demonic", "polygonal", "glistening", "sexy", "overgrown", "frozen", "dark", "mechanical", "mystic", "steampunk", "subterranean", "polluted", "bleak", "dank", "smooth", "vast", "pixelated",
				"enigmatic", "illusionary", "sketchy", "spooky", "flying", "legendary", "cubic", "moist", "oriental", "fluffy", "odd", "fancy", "strange", "authentic", "bustling", "barren", "cluttered", "creepy", "dangerous",
				"distant", "massive", "exotic", "tainted", "filthy", "flawless", "forsaken", "frigid", "frosty", "grand", "grandiose", "grotesque", "harmful", "harsh", "hospitable", "hot", "jaded", "meek", "weird", "awkward",
				"silly", "cursed", "blessed", "drought-stricken"
		];
		var locations = ["river", "island", "desert", "forest", "jungle", "plains", "mountains", "mesa", "cave", "canyon", "marsh", "lake", "plateau", "tundra", "volcano", "valley", "waterfall", "atoll",
				"asteroid", "grove", "treetops", "cavern", "beach", "ocean", "plains", "heavens", "abyss", "city", "crag", "planetoid", "harbor", "evergreen", "cabin", "hill", "field", "ship", "glacier", "estuary",
				"wasteland", "sky", "chamber", "ruin", "tomb", "park", "closet", "terrace", "air balloon", "shrine", "room", "swamp", "road", "path", "gateway", "school", "building", "vault", "pool", "pit",
				"temple", "lagoon", "prison", "mine", "catacombs"
		];
		room.say('Random scenery: **' + Tools.sample(adjectives)[0] + ' ' + Tools.sample(locations)[0] + '**.');
	},

	randpal: 'randompalette',
	randpalette: function(arg, by, room) {
		var sendPM = !by.canUse('randomcommands', room) || room.pm;

		var palleteTypes = ["monochrome", "contrary", "adjacent", "triad", "accent", "angle", "gradient"];
		var colors = []; //[base, shade 1, shade 2, accent 1, accent 2];
		
		var targets = arg.split(',');
		var baseColor = 0;
		var targetType = target = Tools.sample(palleteTypes)[0];
		
		for (var i = 0; i < targets.length; i++) {
			var target = targets[i].trim().toLowerCase();
			if (!target) continue;
			
			// target color
			if (target.charAt(0) === '#') {
				baseColor = parseInt(target.substr(1), 16);
				if (isNaN(baseColor) || target.length !== 7) return room.say("'" + target + "' is not a valid hex code.");
				continue;
			}

			// target palette type
			switch (target) {
			case 'mono': target = "monochrome"; break;
			case 'tri': target = "triad"; break;
			case 'bi': target = "angle"; break;
			case 'grad': target = "gradient"; break;
			}
			targetType = target;
			if (palleteTypes.indexOf(target) === -1) return room.say("Palette type '" + target + "' not recognized.");
		}
		
		if (!baseColor) {
			colors[0] = Tools.toColor(random(0x1000000));
			colors[0].setValue(0.25 + (Math.random() / 20 * 11)); // min lum = 25%
			colors[0].setSaturation(0.1 + (Math.random() / 10 * 9)); // min sat = 205
		} else {
			colors[0] = Tools.toColor(baseColor);
		}
		var maxValue = 1 - colors[0].hsv[2];
		if (colors[0].hsv[2] < maxValue) maxValue = colors[0].hsv[2];
		maxValue *= 0.9;
		var maxSaturation = 1 - colors[0].hsv[1];
		if (colors[0].hsv[1] < maxValue) maxSaturation = colors[0].hsv[1];
		
		switch(targetType) {
		case 'monochrome':
			colors[0].setSaturation(colors[0].hsv[1] * 0.8);
			var valueOffset1 = 0.1 + (Math.random() * (maxValue - 0.1) / 2);
			var valueOffset2 = valueOffset1 + (Math.random() * (maxValue - 0.05) / 2);
			var satOffset = Math.random() - colors[0].hsv[1];
			var hueOffset = random(17) - 8;
			colors[1] = Tools.toColor(colors[0].hex);
			colors[1].setValue(colors[0].hsv[2] + valueOffset1);
			colors[1].setSaturation(colors[0].hsv[1] + satOffset / 2);
			colors[1].setHue(colors[0].hsv[0] + hueOffset);
			colors[2] = Tools.toColor(colors[0].hex);
			colors[2].setValue(colors[0].hsv[2] + valueOffset2);
			colors[2].setSaturation(colors[0].hsv[1] + satOffset);
			colors[2].setHue(colors[0].hsv[0] + hueOffset * 2);
			colors[3] = Tools.toColor(colors[0].hex);
			colors[3].setValue(colors[0].hsv[2] - valueOffset1);
			colors[3].setSaturation(colors[0].hsv[1] + satOffset / 2);
			colors[3].setHue(colors[0].hsv[0] - hueOffset);
			colors[4] = Tools.toColor(colors[0].hex);
			colors[4].setValue(colors[0].hsv[2] - valueOffset2);
			colors[4].setSaturation(colors[0].hsv[1] + satOffset);
			colors[4].setHue(colors[0].hsv[0] - hueOffset * 2);
			break;
		case 'contrary':
			var valueOffset = 0.1 + (Math.random() * (maxValue - 0.1));
			var satOffset = -0.25 + (Math.random() / 2);
			var hueOffset = random(31) - 15;
			colors[1] = Tools.toColor(colors[0].hex);
			colors[1].setValue(colors[0].hsv[2] + valueOffset);
			colors[1].setSaturation(colors[0].hsv[1] + satOffset);
			colors[1].setHue(colors[0].hsv[0] + hueOffset);
			colors[2] = Tools.toColor(colors[0].hex);
			colors[2].setValue(colors[0].hsv[2] - valueOffset);
			colors[2].setSaturation(colors[0].hsv[1] - satOffset);
			colors[2].setHue(colors[0].hsv[0] - hueOffset);
			colors[3] = Tools.toColor(colors[0].hex);
			colors[3].setHue(colors[0].hsv[0] + 180);
			colors[4] = Tools.toColor(colors[3].hex);
			colors[4].setValue(colors[3].hsv[2] + valueOffset);
			colors[4].setSaturation(colors[3].hsv[1] + satOffset);
			colors[4].setHue(colors[3].hsv[0] + hueOffset);
			colors[5] = Tools.toColor(colors[3].hex);
			colors[5].setValue(colors[3].hsv[2] - valueOffset);
			colors[5].setSaturation(colors[3].hsv[1] - satOffset);
			colors[4].setHue(colors[3].hsv[0] - hueOffset);
			break;
		case 'adjacent':
			var angle = 30 + random(60);
			var valueOffset = 0.1 + (Math.random() * (maxValue - 0.1));
			var satOffset = -0.25 + (Math.random() / 2);
			var hueOffset = random(11) - 5;
			colors[1] = Tools.toColor(colors[0].hex);
			colors[1].setValue(colors[0].hsv[2] + valueOffset);
			colors[1].setSaturation(colors[0].hsv[1] + satOffset);
			colors[1].setHue(colors[0].hsv[0] + hueOffset);
			colors[2] = Tools.toColor(colors[0].hex);
			colors[2].setValue(colors[0].hsv[2] - valueOffset);
			colors[2].setSaturation(colors[0].hsv[1] - satOffset);
			colors[2].setHue(colors[0].hsv[0] - hueOffset);
			colors[3] = Tools.toColor(colors[0].hex);
			colors[3].setHue(colors[0].hsv[0] + angle);
			colors[4] = Tools.toColor(colors[0].hex);
			colors[4].setHue(colors[0].hsv[0] - angle);
			break;
		case 'triad':
			var valueOffset = 0.1 + (Math.random() * (maxValue - 0.1));
			var satOffset = -0.25 + (Math.random() / 2);
			var hueOffset = random(11) - 5;
			var triadOffset = random(41) - 110;
			colors[0].setValue(colors[0].hsv[2] * (1 + (1 - colors[0].hsv[2]) / 4));
			colors[1] = Tools.toColor(colors[0].hex);
			colors[1].setValue(colors[0].hsv[2] + valueOffset);
			colors[1].setSaturation(colors[0].hsv[1] + satOffset);
			colors[1].setHue(colors[0].hsv[0] + hueOffset);
			colors[2] = Tools.toColor(colors[0].hex);
			colors[2].setValue(colors[0].hsv[2] - valueOffset);
			colors[2].setSaturation(colors[0].hsv[1] - satOffset);
			colors[2].setHue(colors[0].hsv[0] - hueOffset);
			colors[3] = Tools.toColor(colors[0].hex);
			colors[3].setHue(colors[0].hsv[0] + triadOffset);
			colors[4] = Tools.toColor(colors[0].hex);
			colors[4].setHue(colors[0].hsv[0] - triadOffset);
			break;
		case 'accent':
			colors[0].setSaturation(colors[0].hsv[1] * 0.8);
			var valueOffset1 = 0.1 + (Math.random() * (maxValue - 0.1) / 2);
			var valueOffset2 = valueOffset1 + (Math.random() * (maxValue - 0.05) / 2);
			var satOffset = Math.random() - colors[0].hsv[1];
			var hueOffset = random(17) - 8;
			colors[1] = Tools.toColor(colors[0].hex);
			colors[1].setValue(colors[0].hsv[2] + valueOffset1);
			colors[1].setSaturation(colors[0].hsv[1] + satOffset / 2);
			colors[1].setHue(colors[0].hsv[0] + hueOffset);
			colors[2] = Tools.toColor(colors[0].hex);
			colors[2].setValue(colors[0].hsv[2] + valueOffset2);
			colors[2].setSaturation(colors[0].hsv[1] + satOffset);
			colors[2].setHue(colors[0].hsv[0] + hueOffset * 2);
			colors[3] = Tools.toColor(colors[0].hex);
			colors[3].setValue(colors[0].hsv[2] - valueOffset1);
			colors[3].setSaturation(colors[0].hsv[1] + satOffset / 2);
			colors[3].setHue(colors[0].hsv[0] - hueOffset);
			colors[4] = Tools.toColor(colors[0].hex);
			colors[4].setValue(colors[0].hsv[2] - valueOffset2);
			colors[4].setSaturation(colors[0].hsv[1] + satOffset);
			colors[4].setHue(colors[0].hsv[0] - hueOffset * 2);
			colors[5] = Tools.toColor(0); //the accent color
			colors[5].setHue(colors[0].hsv[0] + 60 + (random(240)));
			colors[5].setValue(0.25 + (Math.random() / 4 * 3)); // min lum = 25%
			colors[5].setSaturation(0.2 + (Math.random() / 5 * 4)); // min sat = 205
			break;
		case 'angle':
			var valueOffset = 0.1 + (Math.random() / 10);
			var satOffset = -0.25 + (Math.random() / 2);
			var hueOffset = random(31) - 15;
			var angle = (random(2) * 2 - 1) * (60 + random(60));
			colors[1] = Tools.toColor(colors[0].hex);
			colors[1].setValue(colors[0].hsv[2] + valueOffset);
			colors[1].setSaturation(colors[0].hsv[1] + satOffset);
			colors[1].setHue(colors[0].hsv[0] + hueOffset);
			colors[2] = Tools.toColor(colors[0].hex);
			colors[2].setValue(colors[0].hsv[2] - valueOffset);
			colors[2].setSaturation(colors[0].hsv[1] - satOffset);
			colors[2].setHue(colors[0].hsv[0] - hueOffset);
			colors[3] = Tools.toColor(colors[0].hex);
			colors[3].setHue(colors[0].hsv[0] + angle);
			colors[4] = Tools.toColor(colors[3].hex);
			colors[4].setValue(colors[3].hsv[2] + valueOffset);
			colors[4].setSaturation(colors[3].hsv[1] + satOffset);
			colors[4].setHue(colors[3].hsv[0] + hueOffset);
			colors[5] = Tools.toColor(colors[3].hex);
			colors[5].setValue(colors[3].hsv[2] - valueOffset);
			colors[5].setSaturation(colors[3].hsv[1] - satOffset);
			colors[5].setHue(colors[3].hsv[0] - hueOffset);
			break;
		case 'gradient':
			var targetAngle = (random(2) * 2 - 1) * (60 + random(120));
			var targetValue = 0.1 + (random(2) * 2 - 1) * Math.random() * (maxValue - 0.1);
			var targetSaturation = Math.random() - colors[0].hsv[1];
			for(var i = 1; i <= 4; i++) {
				colors[i] = Tools.toColor(colors[0].hex);
				colors[i].setHue(colors[0].hsv[0] + targetAngle / 4 * i);
				colors[i].setValue(colors[0].hsv[2] + targetValue / 4 * i);
				colors[i].setSaturation(colors[0].hsv[1] + targetSaturation / 4 * i);
			}
			break;
		}
		
		var text = "";
		if (room.canHTML()) {
			text = '/addhtmlbox <table><tr>';
			for (var i = 0; i < colors.length; i++) {
				text += '<td style="background-color:' + colors[i].toHTML() + ';padding:2px;height:46px;"></td>';
			}
			text += '</tr><tr>';
			for (var i = 0; i < colors.length; i++) {
				text += '<td><code>' + colors[i].toString() + '</code></td>';
			}
			text += '</tr></table>';
		} else {
			text += "HTML unavailable. :c ";
			for (var i = 0; i < colors.length; i++) {
				text += "``" + colors[i].toHTML() + "`` ";
			}
		}
		if (sendPM) {
			by.say(text);
		} else {
			room.say(text);
		}
	},

	/**
	 * Misc. Commands
	 *
	 * These commands didn't fit anywhere else
	 */

	fox: function(arg, by, room) {
		if (!by.canUse('fox', room) && !room.pm) return false;

		var whatTheFoxSays = [
			"Yip!", "Yarp!", "Growlf!", "Myron?!", "/me wags tail",
			"/me bites " + by.name + "", "Yip~ <3", "/me draws furiously",
			":3", ";3", "^w^", "OwO", "=^.~=", ">:3", "^^;w;^^",
			"/me pounces " + by.name + "", "/me licks " + by.name + "",
			"Q~Q", "^^meep^^", ";w;", "rof", "Fox is currently broken. Ask again later.",
			"OwO what's this...?", "/me >///<"
		];

		room.say(Tools.sample(whatTheFoxSays)[0]);
	},
	
	ship: function(arg, by, room) {
		if (!by.canUse('fox', room) && !room.pm) return false;
		var targets = arg.split(",");
		if (0 >= targets.length || targets.length > 2) return room.say("Too many usernames provided");
		if (targets.length === 1) targets = [by.name].concat(targets);
		
		var nameValues = [121, 121]; //arbitrary starting integers
		var map = ' abcdefghijklmnopqrstuvwxyz0123456789'; //index 0 should not be reached
		
		// get name values
		for (var i = 0; i < 2; i++) {
			var target = toId(targets[i]);
			if (0 >= target.length || target.length > 18) return room.say(targets[i] + " is not a username.");
			for (var j = 0; j < target.length; j++) {
				nameValues[i] += map.indexOf(target.charAt(j)) << j;
			}
		}
		
		var total = ((nameValues[0] * nameValues[1]) >> 2) % 101;
		room.say(Tools.trimRank(targets[0]) + " and " + Tools.trimRank(targets[1]) + " are " + total + "% compatible!!!");
	}
}
