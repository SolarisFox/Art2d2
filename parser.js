/**
 * This is the file where commands get parsed
 *
 * Some parts of this code are taken from the Pokémon Showdown server code, so
 * credits also go to Guangcong Luo and other Pokémon Showdown contributors.
 * https://github.com/Zarel/Pokemon-Showdown
 *
 * @license MIT license
 */

var sys = require('sys');
var http = require('http');
var https = require('https');
var url = require('url');

const MINUTES = 60 * 1000;
const HOURS = 60 * MINUTES;
const DAYS = 24 * HOURS;

exports.parser = {
	actionUrl: url.parse('https://play.pokemonshowdown.com/~~' + config.serverid + '/action.php'),
	room: {},
	lastMessage: "",
	lastReply: "",
	pendingImages: {},
	pendingImageNumber: Math.floor(Math.random() * 98000) + 1,
	chatTimer: setInterval(function() {
		var curTime = Date.now();

		//clear out inactive users
		for (var user in Users) {
			if (curTime - Users[user].lastSeen > 5 * DAYS) {
				Users[user].destroy();
			}
		}

		//clear out inactive messages
		for (var user in Data.messages) {
			if (curTime - Data.messages[user].timestamp > 30 * DAYS) delete Data.messages[user];
		}
		Tools.writeJSON('messages', Data.messages);

		//reset rp keywords and data
		for (var user in Data.rpdata) {
			if (!Users[user]) {
				delete Data.rpdata[user];
			} else if (curTime - Data.rpdata[user].lastRP > 8 * HOURS) {
				Data.rpdata[user].usedKeywords = []; //reset used keywords
				if (Data.rpdata[user].lewd > 40) Data.rpdata[user].lewd = 40;
			}
		}
		Tools.writeJSON('rpdata', Data.rpdata);

		// clear out old image request
		for (var request in Parser.pendingImages) {
			if (curTime - Parser.pendingImages[request].timestamp > 10 * MINUTES) delete Parser.pendingImages[request];
		}

		// change out art roomintro
		if (curTime - Parser.roomintroTimer > 20 * HOURS) {
			var nextIntro = {};
			do {
				nextIntro = Tools.sample(Data.roomintros)[0];
			} while (curTime - nextIntro.lastUsed < 5 * DAYS);
			Parser.currentIntro = nextIntro.index;
			Commands.roomintro.call(Parser, Parser.currentIntro, getUser(config.nick), getRoom('art'));
		}
		Tools.writeJSON('roomintros', Data.roomintros);
	}, 30 * MINUTES),
	currentIntro: 0,
	roomintroTimer: Date.now(),

	data: function(data) {
		if (data.substr(0, 1) === 'a') {
			this.lastMessage = data.substr(1);
			data = JSON.parse(data.substr(1));
			if (data instanceof Array) {
				for (var i = 0; i < data.length; i++) {
					this.message(data[i]);
				}
			} else {
				this.message(data);
			}
		}
	},
	message: function(message) {
		if (!message) return;
		this.room = getRoom("lobby");
		this.lastReply = message;

		var spl = message.split('|');
		if (spl[0].charAt(0) === ">") {
			var modSpl = spl[0].split("\n");
			this.room = getRoom(modSpl[0].substr(1));
			if (modSpl[1]) { //parse modnotes
				var username = /^\((.*)\snotes:/.exec(modSpl[1]);
				if (username) {
					username = username[1];
					var note = modSpl[1].substr(username.length + 9);
					// currently doesn't need modnote information for anything
				} else {
					username = /^\(?(.*)\swas (de|pro)moted/.exec(modSpl[1]);
					if (username) {
						username = username[1];
						var user = getUser(username);
						var rank = /moted to (.*) by/.exec(modSpl[1])[1].toLowerCase();
						var global = true;
						if (rank.substr(0, 4) === "room") {
							global = false;
							rank = rank.substr(5);
						}
						switch (rank) { //example "Room Voice"
							case "regular user": rank = ' '; break;
							case "voice": rank = '+'; break;
							case "driver": rank = '%'; break;
							case "mod": rank = '@'; break;
							case "bot": rank = '*'; break;
							case "owner": rank = '#'; break;
							case "leader": rank = '&'; break;
							case "admin": rank = '~'; break;
							default:
								DebugTools.error("Rank '" + rank + "' was not identified");
								rank = ' ';
						}
						if (global) {
							user.rank = rank;
						} else {
							this.room.auth[user.id] = rank;
							if (this.room.auth[user.id] === ' ') delete this.room.auth[user.id];
						}
					} else {
						//DebugTools.info("Unknown message type: ");
						//console.log(modSpl[1]);
					}
				}
			}
		}

		switch (spl[1]) {
			case 'challstr':
				DebugTools.info('received challstr, logging in...');
				var id = spl[2];
				var str = spl[3];

				var requestOptions = {
					hostname: this.actionUrl.hostname,
					port: this.actionUrl.port,
					path: this.actionUrl.pathname,
					agent: false
				};

				if (!config.pass) {
					requestOptions.method = 'GET';
					requestOptions.path += '?act=getassertion&userid=' + toId(config.nick) + '&challengekeyid=' + id + '&challenge=' + str;
				} else {
					requestOptions.method = 'POST';
					var data = 'act=login&name=' + config.nick + '&pass=' + config.pass + '&challengekeyid=' + id + '&challenge=' + str;
					requestOptions.headers = {
						'Content-Type': 'application/x-www-form-urlencoded',
						'Content-Length': data.length
					};
				}

				var req = https.request(requestOptions, function(res) {
					res.setEncoding('utf8');
					var data = '';
					res.on('data', function(chunk) {
						data += chunk;
					});
					res.on('end', function() {
						if (data === ';') {
							DebugTools.error('failed to log in; nick is registered - invalid or no password given');
							process.exit(-1);
						}
						if (data.length < 50) {
							DebugTools.error('failed to log in: ' + data);
							process.exit(-1);
						}

						if (data.indexOf('heavy load') !== -1) {
							DebugTools.error('the login server is under heavy load; trying again in one minute');
							setTimeout(function() {
								this.message(message);
							}.bind(this), 60000);
							return;
						}

						try {
							data = JSON.parse(data.substr(1));
							if (data.actionsuccess) {
								data = data.assertion;
							} else {
								DebugTools.error('could not log in; action was not successful: ' + JSON.stringify(data));
								process.exit(-1);
							}
						} catch (e) {}
						send('|/trn ' + config.nick + ',0,' + data);
					}.bind(this));
				}.bind(this));
				
				req.on('error', function(err) {
					DebugTools.error('login error: ' + sys.inspect(err));
				});
				
				if (data) {
					req.write(data);
				}
				req.end();
				break;
			case 'updateuser':
				if (spl[2] !== config.nick) {
					return;
				}

				if (spl[3] !== '1') {
					error('failed to log in, still guest');
					process.exit(-1);
				}

				DebugTools.ok('We\'re in as ' + spl[2]);

				// Now join the rooms
				var cmds = ['|/blockchallenges'];
				for (var i in config.rooms) {
					var room = toId(config.rooms[i]);
					if (room === 'lobby' && config.serverid === 'showdown') {
						continue;
					}
					cmds.push('|/join ' + room);
				}
				cmds.push('|/avatar ' + config.avatarNumber);
				cmds.push('|/cmd userdetails ' + config.nick); //used to check which rooms are private

				var self = this;
				if (cmds.length > 4) {
					self.nextJoin = 0;
					self.joinSpacer = setInterval(function(con, cmds) {
						if (cmds.length > self.nextJoin + 3) {
							send(cmds.slice(self.nextJoin, self.nextJoin + 3));
							self.nextJoin += 3;
						} else {
							send(cmds.slice(self.nextJoin));
							delete self.nextJoin;
							clearInterval(self.joinSpacer);
						}
					}, 4*1000, connection, cmds);
				} else {
					send(cmds);
				}
				break;
			case 'init':
				if (spl[2] === "chat\n") {
					this.room.name = spl[4].substr(0, spl[4].length - 1);
					this.room.users = spl[6].split(",").slice(1);
					for (var i = 0; i < this.room.users.length; i++) {
						var id = toId(this.room.users[i]);
						if (id === toId(config.nick)) this.room.ownRank = this.room.users[i].charAt(0);
						this.room.users[i] = id;
					}
				}
				send("|/roomauth " + this.room.id);
			case 'title':
				DebugTools.ok('joined ' + spl[0].substr(1));
				break;
			case 'c':
				var by = getUser(spl[2]);
				by.update();
				this.parseMessage(by, spl[3]);
				break;
			case 'c:':
				var by = getUser(spl[3]);
				by.update();
				this.parseMessage(by, spl[4]);
				break;
			case 'pm':
				var by = getUser(spl[2]);
				by.update();
				this.room.pm = by;
				this.parseMessage(by, spl[4]);
				this.room.pm = null;
				break;
			case 'N':
				var by = getUser(spl[3]);
				by.newAlt(spl[2]);
				by.update();
				this.room.users.push(by.currentId);
				this.room.users.splice(this.room.users.indexOf(toId(spl[3])), 1);
				break;
			case 'J': case 'j':
				var by = getUser(spl[2]);
				by.update();
				this.room.users.push(by.currentId);
				break;
			case 'l': case 'L':
				var by = getUser(spl[2]);
				by.update();
				this.room.users.splice(this.room.users.indexOf(by.currentId), 1);
				break;
			case 'raw':
				// get current roomintro number
				if (spl[2].substr(0, 42) === '<div class="infobox infobox-limited"><!--#') {
					DebugTools.info("Roomintro number: " + spl[2].substr(42, spl[2].substr(42).indexOf("-->")));
					this.currentIntro = parseInt(spl[2].substr(42, spl[2].substr(42).indexOf("-->")));
					if (Data.roomintros[this.currentIntro]) {
						this.roomintroTimer = Data.roomintros[this.currentIntro].lastUsed;
					} else {
						DebugTools.error("Current roomintro (" + this.currentIntro + ") is unknown. Please add with \\roomintro");
					}
				}
				break;
			case 'html':
				// error Data.messages from the server
				//DebugTools.info(this.lastReply);
				if (spl[2].substr(0, 27) === '<div class="message-error">') {
					var errMsg = spl[2].substring(27, spl[2].indexOf('</div>'))
					if (/The room.+does not exist/.test(errMsg)) {
						var roomname = /&apos;(.*)&apos;/.exec(errMsg);
						if (roomname) {
							var room = getRoom(roomname[1]);
							if (room.users.length) { // checks if room exists
								DebugTools.error("Unable to target " + room.name);
							} else {
								DebugTools.error(errMsg);
							}
						} else {
							DebugTools.error(errMsg);
						}
					} else {
						DebugTools.error(errMsg);
					}
				}
				break;
			case 'popup':
				if (spl[2].indexOf("room auth") > -1) {
					this.room = getRoom(spl[2].substr(0, spl[2].indexOf(" room auth:")));
					this.setRoomAuth(this.room, spl);
				} else if (spl[2].indexOf("user auth") > -1) {
					var user = getUser(spl[2].substr(0, spl[2].indexOf(" user auth:")));
					for (var i = 0; i < spl.length; i++) {
						var globalIndex = spl[i].indexOf("Global auth");
						if (globalIndex > -1) {
							user.rank = spl[i].charAt(globalIndex + 13);
							break;
						}
					}
				}
				break;
			case 'queryresponse':
				if (spl[2] === "userdetails") {
					var data = JSON.parse(spl[3]);
					var user = getUser(data.userid);
					user.rank = data.group;
					if (user.isSelf()) {
						for (var i in data.rooms) {
							if (data.rooms[i].isPrivate) getRoom(i).isPrivate = true;
						}
					}
				} else if (spl[2] === "roomlist") {
					//
				}
				break;
			default:
				//console.log(spl);
		}
	},

	parseMessage: function(by, message) {
		if (by.isSelf()) return;
		message = message.trim();

		// auto accept room invitations
		if (message.substr(0, 8) === '/invite ' && by.hasRank('%')) send("|/join " + message.substr(8));

		// parse commands
		if (message.substr(0, config.commandcharacter.length) === config.commandcharacter) {
			var words = message.split(" ");
			var cmd = words[0].substr(1);
			var arg = words.slice(1).join(" ");
			if (Commands[cmd]) {
				var failsafe = 0;
				while (typeof Commands[cmd] !== "function" && failsafe++ < 10) {
					cmd = Commands[cmd];
				}
				if (typeof Commands[cmd] === "function") {
					Commands[cmd].call(this, arg, by, this.room);
				} else {
					error("invalid command type for " + cmd + ": " + (typeof Commands[cmd]));
				}
				return true; //if a message is a command it doesn't need to be parsed further
			}
		}

		// parse other Data.messages
		if (/i(\'m| am).*go.*to (bed|sleep)/i.test(message) || /good ?night everyone/i.test(message)) this.room.say('Goodnight ' + Tools.trimRank(by.name) + '. c:');
		// warn for replay
		if (["art", "cosmopolitan"].indexOf(this.room.id) > -1) {
			if (message.indexOf("replay.pokemonshowdown.com") > -1) this.room.say('/k ' + by.name + ', Battle replays are not allowed in this room.');
		}
		if (/(some|any)(body|one|1).+(mak(e|ing)|draw(?:ing)?).+m(e|y)/i.test(message) && this.room.id === 'art') 
			by.say('Looking to have something drawn? Try submitting a request here: https://docs.google.com/forms/d/1GS2xTBClmuqhnamCEWPBwGYWJJlx_0X00PR8BN5UR1Y/viewform');

		//parse links
		var urlFragments = message.split("http");
		for (var i = 0; i < urlFragments.length; i++) {
			var fragment = urlFragments[i];
			if (fragment.charAt(0) !== 's' && fragment.charAt(0) !== ':') continue;
			var linkType = fragment.charAt(0) === 's' ? 'https' : 'http';
			if (linkType === 'https') fragment = fragment.substr(1); //push forward 1 character
			if (fragment.substr(0, 3) !== "://") continue;
			var linkEnd = fragment.indexOf(" ");
			this.parseUrl(linkType + (linkEnd > -1 ? fragment.substr(0, linkEnd) : fragment), by);
		}

		// parse stuff for RP responses
		if (this.room.canRP(by)) {
			message = message.toLowerCase();
			if (/art2d2/.test(message) || this.room.pm) {
				var special = this.specialCaseRP(by, message);
				if (!special) if (/^\/me/.test(message) && (/art2d2/.test(message) || this.room.pm)) this.parseRP(by, message.substr(4));
			}
		}
	},

	setRoomAuth: function(room, popup) {
		var ros = [];
		var bots = [];
		var mods = [];
		var drivers = [];
		var voices = [];
		for (var i = 6; i < popup.length; i++) {
			switch(popup[i]) {
			case 'Room Owners (#):': ros = popup[i + 2].split(", "); break;
			case 'Bots (*):': bots = popup[i + 2].split(", "); break;
			case 'Moderators (@):': mods = popup[i + 2].split(", "); break;
			case 'Drivers (%):': drivers = popup[i + 2].split(", "); break;
			case 'Voices (+):': voices = popup[i + 2].split(", "); break;
			}
		}
		for (var i = 0; i < ros.length; i++) {
			room.auth[toId(ros[i])] = "#";
		}
		for (var i = 0; i < bots.length; i++) {
			room.auth[toId(bots[i])] = "*";
		}
		for (var i = 0; i < mods.length; i++) {
			room.auth[toId(mods[i])] = "@";
		}
		for (var i = 0; i < drivers.length; i++) {
			room.auth[toId(drivers[i])] = "%";
		}
		for (var i = 0; i < voices.length; i++) {
			room.auth[toId(voices[i])] = "+";
		}
	},

	parseUrl(link, by) {
		var linkType = link.substr(0, link.indexOf("//") + 2);
		var linkBody = link.substr(linkType.length);
		var linkParts = linkBody.split('.');
		if (this.room.id === "art") {
			// try to display images
			if (/(png|gif|jpe?g|bmp|psd)/i.test(linkParts[linkParts.length - 1])) {
				Tools.getImageData(link, by).then(img => {
					if (by.canUse('showimage', this.room)) {
						this.room.say("/addhtmlbox " + img.maxSize(500, 300).html());
					} else if (by.paw || by.hasRank('+', this.room)) {
						Parser.pendingImageNumber++;
						Parser.pendingImages[Parser.pendingImageNumber] = img;
						var text = by.name + " wishes to share:<br>";
						text += img.maxSize(200, 180).html();
						text += "<center><button name=\"send\" value=\"/pm " + config.nick + ", " + config.commandcharacter + "approveimage " + Parser.pendingImageNumber + "\">Approve</button></center>"
						
						var artRoom = getRoom("art");
						var onlineAuth = [];
						for (var mod in artRoom.auth) {
							if (artRoom.auth[mod] === "@" || artRoom.auth[mod] === "#") {
								if (artRoom.users.indexOf(mod) > -1) onlineAuth.push(mod)
							}
						}
						var i = 0;
						var sayTimer = setInterval(function() {
							artRoom.say("/pminfobox " + onlineAuth[i] + ", " + text);
							if (++i === onlineAuth.length) clearInterval(sayTimer);
						}, 700);
					}
				}).catch(e => {
					// handled in tool itself
				});
			} 			
			if (linkParts[0] !== 'i' && (linkParts[0] === "imgur" || linkParts[1] === "imgur")) {
				// find image from imgur links
				Tools.readHTMLfromURL(link).then(data => {
					var imageContainerIndex = data.indexOf('class="post-image-container"');
					if (imageContainerIndex !== - 1) {
						var buffer = data.substr(imageContainerIndex + 29); //narrow to image container
						buffer = buffer.substr(buffer.indexOf('<img')); //narrow to image tag
						buffer = buffer.substr(buffer.indexOf('src="') + 5); //narrow to src tag
						var imageLink = buffer.substr(0, buffer.indexOf('" ')); //get end of tag
						if (imageLink.substr(0, 2) === "//") Parser.parseUrl.call(Parser, "http:" + imageLink, by);
					}
				}).catch(e => {
					// handled in tools
				});
			}
		}
	},

	specialCaseRP: function(by, msg) {
		var mood = by.getRPdata();
		if (mood.happy <= 0) return false;
		var used = mood.usedKeywords;

		if (/good (boy|girl|fox)/.test(msg) && used.indexOf("S1") === -1) {
			mood.happy += 5;
			mood.lewd += 3;
			used.push("S1");
			this.rpResponce(by, msg, mood, "happy");
			return true;
		} else if (/^\/me/.test(msg)) {
			if (msg.indexOf("throw") > -1 && used.indexOf("S2") === -1) {
				var words = msg.split(" ");
				var throwIndex = words.indexOf("throw");
				if (throwIndex === -1) throwIndex = words.indexOf("throws");
				if (throwIndex === -1) throwIndex = words.indexOf("throwing");
				if (throwIndex > -1) {
					if (words[throwIndex + 1] === "a" || words[throwIndex + 1] === "an") words[throwIndex + 1] = "the";
					if (words[throwIndex + 1] && (words[throwIndex + 1] !== "the" || words[throwIndex + 2])) {
						var atIndex = words.slice(throwIndex).indexOf("at");
						if (atIndex > -1) {
							if (/art2d2|foxbot|you/.test(words[atIndex + 1])) {
								mood.happy -= 5;
								used.push("S2");
								this.room.say("Don't throw things at me! ;A;");
								return true;
							}
						} else {
							var forIndex = words.slice(throwIndex).indexOf("for");
							var object = forIndex > -1 ? words.slice(throwIndex + 1, throwIndex + forIndex).join(" ") : words.slice(throwIndex + 1).join(" ");
							mood.happy += 2;
							used.push("S2");
							this.room.say("/me fetches " + object + "!");
							return true;
						}
					}
				}
			}
		}
	},

	parseRP: function(by, msg) {
		var mood = by.getRPdata();
		if (mood.happy <= 0) return false;
		msg = msg.replace(/(art2d2|foxbot|your)'?s?/, "").replace(/\s\s+/, " ");
		var keywords = {
			happy: [
				"pet", "hug", "nuzzle", "snuggle", "boop", "glomp", "squish", "feed", "snug", "scritch", "nom",
				"yip", "tickle", "cuddle", "giggle", "fixes"
			],
			sad: [
				"kick", "hit", "punch", "slap", "stab", "beat", "bite", "growl", "yell", "shoot", "explode", "yank", "step", "stomp", "tug", "kill", "break", "fight", "flips off", "murder"
			],
			semilewd: [
				"lick", "stroke", "nibble", "kiss", "smooch",  "rubs tummy", "rubs belly", "tummy rub", "belly rub", "love", "pounce", "nip", "eat", "flirt"
			],
			lewd: [
				"hump", "grope", "fondle", "slurp", "frot", "cum", "fuck", "cock", "dick", "balls", "penis", "blowjob", "tailhole", "rubs thigh", "spank", "spreads legs", "sheath", "erect", " butt ", " ass ", "straddle", "yiff",
				"testicle"
			],
			neutral: [
				"meow", "bark", "squeak", "poke", "meme", "pull"
			]
		};

		var foundMatch = false;
		for (var i = 0; i < keywords.happy.length; i++) {
			if (msg.indexOf(keywords.happy[i]) > -1) {
				foundMatch = "happy";
				if (mood.usedKeywords.indexOf(keywords.happy[i]) === -1) {
					mood.happy += 3;
					mood.usedKeywords.push(keywords.happy[i]);
					break;
				}
			}
		}
		for (var i = 0; i < keywords.sad.length; i++) {
			if (msg.indexOf(keywords.sad[i]) > -1) {
				foundMatch = "sad";
				if (mood.usedKeywords.indexOf(keywords.sad[i]) === -1) {
					mood.happy -= 6;
					mood.lewd -= 6;
					mood.usedKeywords.push(keywords.sad[i]);
					break;
				}
			}
		}
		for (var i = 0; i < keywords.semilewd.length; i++) {
			if (msg.indexOf(keywords.semilewd[i]) > -1) {
				if (mood.usedKeywords.indexOf(keywords.semilewd[i]) === -1) {
					foundMatch = "happy";
					mood.happy += 3;
					mood.lewd += Math.floor(mood.happy / 20);
					mood.usedKeywords.push(keywords.semilewd[i]);
					break;
				}
			}
		}
		for (var i = 0; i < keywords.lewd.length; i++) {
			if (msg.indexOf(keywords.lewd[i]) > -1) {
				foundMatch = "lewd";
				if (mood.usedKeywords.indexOf(keywords.lewd[i]) === -1) {
					mood.lewd += Math.floor(mood.happy / 20);
					mood.usedKeywords.push(keywords.lewd[i]);
					break;
				}
			}
		}
		if (!foundMatch) {
			for (var i = 0; i < keywords.neutral.length; i++) {
				if (msg.indexOf(keywords.neutral[i]) > -1) {
					foundMatch = "happy";
					mood.usedKeywords.push(keywords.neutral[i]);
					break;
				}
			}
		}
		this.rpResponce(by, msg, mood, foundMatch);
	},

	rpResponce: function(by, msg, mood, type) {
		if (mood.happy > 100) mood.happy = 100;
		if (mood.happy > 90 && mood.lewd < 35) mood.lewd = 35;
		if (mood.lewd > 100) mood.lewd = 100;

		if (type) {
			mood.lastRP = Date.now();
			var response = "";

			switch(type) {
			case 'happy':
				var happyResponces = [
					"growls suspiciously", "backs away from #BY", "carefully looks at #BY", "squints at #BY", "beeps quietly", "nibbles gently", "pouts", "paws at #BY", "squeaks",
					"XOwO", "yips", "wags tail","X^w^ <3", "'s ears perk up", "lays in #BY's lap", "wiggles happily", "fluffs up!", "snuggles", "rolls around", "nibbles playfully",
					"nuzzles excitedly", "licks #BY :3", "vibrates with anticipation", "'s eyes sparkle", "bounces up and down", "snuggles ferociously", "jumps into #BY's arms", "I love you, #BY~! <3"
				];
				var happyPercent = Math.floor(happyResponces.length * mood.happy / 100);
				do {
					var num = happyPercent - 5 + random(10);
					if (num < 0) num = 0;
					if (num >= happyResponces.length) num = happyResponces.length - 1;
					response = happyResponces[num];
				} while (response === mood.lastResponce);
				mood.lastResponce = response;
				break;
			case 'sad':
				if (mood.happy <= 0) return this.room.say("/me deletes " + by.name + "'s User Object.");
				var sadResponces = [
					"/m #BY, bot abuse", "yowls", "grimaces in pain", "growls", "/k #BY, bot abuse", "runs away", "cries softly", "hides", "flinches", "whimpers",
					"bully! ;n;", "'s ears flatten", "hides under tail", "Xplease don't", "X:'3", "self-destructs", "calls the police", "Xplz", "burns the toast",
					"Xwhy? ;w;", "looks confused", "XQvQ;", "Xmyron?!"
				];
				var sadPercent = Math.floor(sadResponces.length * mood.happy / 100);
				do {
					var num = sadPercent - 5 + random(10);
					if (num < 0) num = 0;
					if (num >= sadResponces.length) num = sadResponces.length - 1;
					response = sadResponces[num];
				} while (response === mood.lastResponce);
				mood.lastResponce = response;
				break;
			case 'lewd':
				var lewdResponces = [];
				if (!this.room.pm || !by.paw) {
					lewdResponces = [
						"/hm #BY, inappropriate", "/m #BY, hold it right there criminal scum; you violated the law!", "/k #BY, l-lewd!", "Xwhat?!", "Xu-umm... ;w;", "Xb-but I'm a robot...", "XThat's weird! ;w;", "squeaks",
						"Xo-oh... QvQ;", "X>///<", "blushes", "X;///;", "covers eyes with paws", "pops toast out of back from surprise", "overheats"
					];
				} else {
					// general handlers
					lewdResponces = [
						"Xu-umm... ;w;", "X;///;", "Xb-but I'm a robot...", "XW-wait! o///o", "X^^meep^^", "covers eyes with paws", "swishes tail around",
						"blushes", "licks tenderly", "overheats", "XOh~ <3", "whimpers softly", "butters your toast", "humps", "pants", "moans", 
						"'s cock throbs with need", "XI love you~ Q///Q <3"
					];
				}
				var lewdPercent = Math.floor(lewdResponces.length * mood.lewd / 100);
				do {
					var num = lewdPercent - 3 + random(6);
					if (num < 0) num = 0;
					if (num >= lewdResponces.length) num = lewdResponces.length - 1;
					response = lewdResponces[num];
				} while (response === mood.lastResponce);
				mood.lastResponce = response;
			}

			if (!response) {
				DebugTools.error("Unable to respond to RP message:");
				console.log(by.name);
				console.log(mood);
				console.log(msg);
				this.room.say("RP mood out of bounds exception. Report to bot owner.");
				return;
			} else if (response.charAt(0) === "X") {
				response = response.substr(1);
			} else if (response.charAt(0) === "/") {
				if (this.room.pm) response = "Hey! >:c"
			} else {
				response = (response.substr(0, 2) === "'s" ? "/mee " : "/me ") + response;
			} 
			response = response.replace('#BY', Tools.trimRank(by.name));
			this.room.say(response);

			Data.rpdata[by.id] = mood;
		} else {
			DebugTools.info("No RP response for: " + msg);
		}
	}
}
