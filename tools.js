var request = require('request');
var Promise = require('promise');
var sizeOf = require('image-size');
var url = require('url');
var http = require('http');
var https = require('https');
var Color = require('./color.js').color;
var Image = require('./image.js').image;

// common functions are global to save on characters

global.toId = function(text) {
	if (typeof text !== "string") {
		DebugTools.error("toId used on non-string");
		return "TOID ERROR";
	}
	return text.toLowerCase().replace(/[^a-z0-9]/g, '');
};

global.random = function(range) {
	return Math.floor(Math.random() * range);
};

// the rest are assigned to global object "Tools"

exports.tools = {
	toRoomId: function(text) {
		return text.replace(/[^a-z0-9\-]/i, "").toLowerCase();
	},

	trimRank: function(text) {
		if (/[ +%@*#&~]/.test(text.charAt(0))) {
			return text.substr(1);
		} else {
			return text;
		}
	},

	stripCommands: function(text) {
		return ((text.trim().charAt(0) === '/') ? '/' : ((text.trim().charAt(0) === '!') ? ' ':'')) + text.trim();
	},

	shuffle: function(origin) {
		var array = origin.slice(0); //clones the array
		var counter = array.length, temp, index;
		while (counter > 0) {
			index = Math.floor(Math.random() * counter);
			counter--;
			temp = array[counter];
			array[counter] = array[index];
			array[index] = temp;
		}
		return array;
	},

	sample: function(array, elements) {
		if (!elements) elements = 1;
		if (array.length < elements) elements = array.length;
		if (Array.isArray(array)) {
			return this.shuffle(array).slice(0, elements);
		} else { // it's an object
			return this.sample(Object.keys(array), elements).map(k => array[k]);
		}
	},

	removeElm: function(array, element) {
		if (Array.isArray(element)) {
			var removed = [];
			for (var i = 0; i < element.length; i++) {
				removed = removed.concat(this.removeElm(array, element[i]));
			}
			return removed;
		} else {
			var index = array.indexOf(element);
			if (index === -1) return [element];
			array.splice(index, 1);
			return [];
		}
	},

	uncacheTree: function(root) {
		var uncache = [require.resolve(root)];
		do {
			var newuncache = [];
			for (var i = 0; i < uncache.length; ++i) {
				if (require.cache[uncache[i]]) {
					newuncache.push.apply(newuncache,
						require.cache[uncache[i]].children.map(function(module) {
							return module.filename;
						})
					);
					delete require.cache[uncache[i]];
				}
			}
			uncache = newuncache;
		} while (uncache.length > 0);
	},

	writeJSON: function(fileName, newData) {
		if (!newData) {
			DebugTools.error("No data provided to write into " + fileName + ".json");
			return false;
		}
		var writing = false;
		var writePending = false; // whether or not a new write is pending
		var finishWriting = function(fileName) {
			writing = false;
			if (writePending) {
				writePending = false;
				writeJSON(fileName);
			}
		};
		var innerCall = function() {
			if (writing) {
				writePending = true;
				return;
	
			}
			writing = true;
			var data = JSON.stringify(newData);
			fs.writeFile('saves/' + fileName + '.json.0', data, function() {
				// rename is atomic on POSIX, but will throw an ERROR on Windows
				fs.rename('saves/' + fileName + '.json.0', 'saves/' + fileName + '.json', function(err) {
					if (err) {
						// This should only happen on Windows.
						fs.writeFile('saves/' + fileName + '.json', data, finishWriting);
						return;
					}
					finishWriting(fileName);
				});
			});
		};
		innerCall();
	},

	readHTMLfromURL: function(link) {
		return new Promise(function (fulfill, reject) {
			request(link, function (err, response, body) {
				if (!err && response.statusCode == 200) {
					fulfill(body);
				} else {
					DebugTools.error("Failed to load from " + link);
					console.log(response.statusCode);
					console.log(err);
					reject(err);
				}
			});
		});
	},

	readJSONfromURL: function(link) {
		return new Promise(function (fulfill, reject) {
			request(link, function (err, response, body) {
				if (!err && response.statusCode == 200) {
					try {
						fulfill(JSON.parse(body));
					} catch(e) {
						DebugTools.error(e);
						console.log(body.substr(0, 35) + "...");
						reject(e);
					}
				} else {
					DebugTools.error("Failed to load from " + link);
					console.log(response.statusCode);
					console.log(err);
					reject(err);
				}
			});
		});
	},

	getImageData: function(link) {
		return new Promise(function (fulfill, reject) {	
			var options = url.parse(link);
			var linkType = link.substr(0, 5) === "https" ? https : http;

			linkType.get(options, function (response) {
				var chunks = [];
				response.on('data', function (chunk) {
					chunks.push(chunk);
				}).on('end', function() {
					var buffer = Buffer.concat(chunks);
					var imgData;
					try {
						imgData = sizeOf(buffer);
					} catch(e) {
						DebugTools.error("Failed to load image from " + link);
						console.log(e);
						return reject(e);
					}
					fulfill(new Image(link, imgData));
				});
			});
		});
	},

	uploadToHastebin: function(by, toUpload) {
		var reqOpts = {
			hostname: "hastebin.com",
			method: "POST",
			path: '/documents'
		};

		var req = require('https').request(reqOpts, function(res) {
			res.on('data', function(chunk) {
				by.say("hastebin.com/raw/" + JSON.parse(chunk.toString())['key']);
			});
			res.on('error', function(e) {
				by.say("hastebin upload failed.");
				DebugTools.error("hastebin upload failed:");
				console.log(e);
			});
		});
		
		req.write(toUpload);
		req.end();
	},

	getDate: function() {
		var date = new Date();

		var year = date.getUTCFullYear();
		var month = date.getUTCMonth();
		var day = date.getUTCDate();
		
		//month 2 digits
		month = ("0" + (month + 1)).slice(-2)
		
		//year 2 digits
		year = year.toString().substr(2,2)
		
		var formattedDate = '' + day + '/' + month + "/" + year;
		return formattedDate;
	},

	getTimeAgo: function(time, full) {
		time = Date.now() - time;
		time = Math.round(time/1000); // rounds to nearest second
		var seconds = time%60;
		var times = [];
		if (seconds) times.push(String(seconds) + (seconds === 1?' second':' seconds'));
		var minutes, hours, days;
		if (time >= 60) {
			time = (time - seconds)/60; // converts to minutes
			minutes = time%60;
			if (minutes) times = [String(minutes) + (minutes === 1?' minute':' minutes')].concat(times);
			if (time >= 60) {
				time = (time - minutes)/60; // converts to hours
				hours = time%24;
				if (hours) times = [String(hours) + (hours === 1?' hour':' hours')].concat(times);
				if (time >= 24) {
					days = (time - hours)/24; // you can probably guess this one
					if (days) times = [String(days) + (days === 1?' day':' days')].concat(times);
				}
			}
		}
		if (!times.length) times.push('0 seconds');
		if (full) {
			return times.join(', ');
		} else {
			return times[0];
		}
	},
	
	markupHTML: function(text) {
		// ``code``
		var str = text.replace(/\`\`([^< ](?:[^<`]*?[^< ])??)\`\`/g, '<code>$1</code>');
		// ~~strikethrough~~
		str = str.replace(/\~\~([^< ](?:[^<]*?[^< ])??)\~\~/g, '<s>$1</s>');
		// __italics__
		str = str.replace(/\_\_([^< ](?:[^<]*?[^< ])??)\_\_/g, '<i>$1</i>');
		// **bold**
		str = str.replace(/\*\*([^< ](?:[^<]*?[^< ])??)\*\*/g, '<b>$1</b>');
		// ^^superscript^^
		str = str.replace(/\^\^([^< ](?:[^<]*?[^< ])??)\^\^/g, '<sup>$1</sup>');
		// \\subscript
		str = str.replace(/\\\\([^< ](?:[^<]*?[^< ])??)\\\\/g, '<sub>$1</sub>');
		
		return str;
	},
	
	speechBubble: function(text) {
		var bubble = '/addhtmlbox ';
		bubble += '<table style="padding:0px;border-collapse: collapse;"><tr><td>';
		bubble += '<img src="http://i.imgur.com/6fpZRYw.gif" height="100" width="100"></td>'; //sprite
		bubble += '<td style="padding:0px 0px 12px 0px;vertical-align:bottom;">';
		bubble += '<img src="http://i.imgur.com/kwTo7Q4.png" height="16" width="16" style="vertical-align:bottom;">' //bubble carrot
		bubble += '</td><td style="padding:0px 0px 12px 0px;vertical-align:bottom;">';
		bubble += '<div style="border-top-style:solid;border-right-style:solid;border-bottom-style:none;';
		bubble += 'border-left-style:solid;background-color:#c1dae8;border-color:#546d8e;color:#111100;padding-top:12px;padding-left:12px;padding-right:12px;">';
		bubble += this.markupHTML(text).replace('<code>', '<code style="color:#277f19;background:#dae9f2">') + '</div>';
		bubble += '<div style="border-top-style:none;border-right-style:solid;border-bottom-style:solid;border-left-style:none;background-color:#c1dae8;border-color:#546d8e;height:12px">';
		bubble += '</div></td></tr></table>';
		return bubble;
	},

	toColor: function(target) {
		var hex = 0x000000;
		if (typeof target === "string") {
			if (/#[0-9]+/.test(target)) {
				hex = parseInt(target.substr(1), 16);
			} else {
				hex = parseInt(target, 16);
			}
		} else if (Number.isInteger(target)) {
			hex = target % 0x1000000;
		} else {
			DebugTools.error("Unrecognized argument '" + target + "' for color.");
		}
		return new Color(hex);
	}
};

// some additional function to parse the PAD json files

Data.PAD.tools = {
	getFiles: function() {
		DebugTools.info("Loading PAD files");
		var fileNames = ["active_skills", "awakenings", "events", "evolutions", "leader_skills", "materials", "monsters"];
		var files = [];
		for (var i = 0; i < fileNames.length; i++) {
			files.push(Tools.readJSONfromURL('https://www.padherder.com/api/' + fileNames[i] + '/'));
		}
		return new Promise(function (fulfill, reject) {
			Promise.all(files).then(values => {
				for (var i = 0; i < values.length; i++) {
					Data.PAD[fileNames[i]] = values[i];
				}
				DebugTools.ok("PAD files successfully loaded");
				fulfill(true);
			}).catch(e => {
				reject(e);
			});
		});
	},

	type: function(typeNum) {
		switch (typeNum) {
		case 0: return "Evo Material";
		case 1: return "Balanced";
		case 2: return "Physical";
		case 3: return "Healer";
		case 4: return "Dragon";
		case 5: return "God";
		case 6: return "Attacker";
		case 7: return "Devil";
		case 8: return "Machine";
		case 12: return "Awoken Material";
		case 14: return "Enhancement Material";
		case 15: return "Vendor";
		default: return "[" + typeNum + "]";
		}
	},

	typeImage: function(typeNum) {
		var img = "http://puzzledragonx.com/en/img/type/";
		switch (typeNum) {
		case 0: img += "7.png"; break;
		case 1: img += "2.png"; break;
		case 2: img += "3.png"; break;
		case 3: img += "4.png"; break;
		case 4: img += "1.png"; break;
		case 5: img += "6.png"; break;
		case 6: img += "5.png"; break;
		case 7: img += "9.png"; break;
		case 8: img += "12.png"; break;
		case 12: img += "11.png"; break;
		case 14: img += "8.png"; break;
		case 15: img += "13.png"; break;
		default: img = "10.png";
		}
		return img;
	},

	element: function(elementNum) {
		switch (elementNum) {
		case 0: return "Fire";
		case 1: return "Water";
		case 2: return "Wood";
		case 3: return "Light";
		case 4: return "Dark";
		default: return null;
		}
	},

	activeSkill: function(activeName) {
		for (var i = 0; i < Data.PAD.active_skills.length; i++) {
			if (Data.PAD.active_skills[i].name && Data.PAD.active_skills[i].name === activeName) {
				return Data.PAD.active_skills[i];
			}
		}
		return false;
	},

	leaderSkill: function(leaderName) {
		for (var i = 0; i < Data.PAD.leader_skills.length; i++) {
			if (Data.PAD.leader_skills[i].name && Data.PAD.leader_skills[i].name === leaderName) {
				return Data.PAD.leader_skills[i];
			}
		}
		return false;
	},

	awakening: function(awakenNum) {
		for (var i = 0; i < Data.PAD.awakenings.length; i++) {
			if (awakenNum === Data.PAD.awakenings[i].id) {
				return Data.PAD.awakenings[i];
			}
		}
		return false;
	}
}
