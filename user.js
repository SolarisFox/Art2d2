global.Users = {};

global.getUser = function(username) {
	if (Users[toId(username)]) {
		var user = Users[toId(username)];
		while (typeof user === "string") {
			user = Users[user];
		}
		if (!user) {
			username = "Error: Dummy Username";
			DebugTools.error("No username parsed from message:");
			console.log(Parser.lastMessage);
			return new User(username);
		}
		user.newAlt(username);
		return user;
	}
	var newUser = new User(username);
	Users[newUser.id] = newUser;
	return newUser;
};

var ranks = " +%@*#&~";

var checkGolbalAuth = function(username) {
	if (username.charAt(0) !== " ") {
		send('|/cmd userdetails ' + username);
		// This function is async and handled mostly in the parser.
		// While waiting for callback from the server rank is set to
		// whatever the symbol shown by the name is. This can potentially
		// show rank being higher than it actually is in some rooms, but
		// shouldn't create any long-term problems.
		return username.charAt(0);
	}
	return " ";
}

// constructor for user object

exports.user = function (name) {
	this.name = name;
	this.id = toId(name);
	this.currentId = this.id;
	this.rank = checkGolbalAuth(this.name);
	this.paw = (Data.settings.roompaw[this.id]) ? true : false;
	this.alts = [];
	this.gallery = Data.galleries[this.id] || "";
	this.lastSeen = Date.now();

	this.hasRank = function (rank, room) {
		if (this.isSysOp() || this.isSelf()) return true;
		var needed = ranks.indexOf(rank);
		if (needed <= ranks.indexOf(this.rank)) return true;
		if (room && room.auth) {
			if (needed <= ranks.indexOf(room.auth[this.id])) return true;
			for (var i = 0; i < this.alts.length; i++) {
				if (needed <= ranks.indexOf(room.auth[this.alts[i]])) return true;
			}
		}
		return false;
	};
	this.canUse = function(command, room) {
		var needed = config.defaultrank;
		if (Data.settings.commands[command] && Data.settings.commands[command][room.id]) needed = Data.settings.commands[command][room.id];
		if (needed === "roompaw") {
			if (this.paw) return true;
			needed = "+";
		}
		return this.hasRank(needed, room);
	};
	this.update = function() {
		this.lastSeen = Date.now();
		//Send pending mail
		if (Data.messages[this.id]) {
			for (var msgNumber in Data.messages[this.id]) {
				if (msgNumber === 'timestamp') continue;
				this.say(Data.messages[this.id][msgNumber]);
			}
			delete Data.messages[this.id];
		}
		for (var i = 0; i < this.alts.length; i++) {
			if (Data.messages[this.alts[i]]) {
				for (var msgNumber in Data.messages[this.alts[i]]) {
					if (msgNumber === 'timestamp') continue;
					this.say(Data.messages[this.alts[i]][msgNumber]);
				}
				delete Data.messages[this.alts[i]];
			}
		}
		Tools.writeJSON('messages', Data.messages);
	};
	this.newAlt = function(newName) {
		var newId = toId(newName);
		if (this.id === newId) return;

		if (this.alts.indexOf(this.id) === -1) this.alts.push(this.id);
		if (!Users[newId]) Users[newId] = this.id;
		this.name = newName;
		this.id = newId;
		if (ranks.indexOf(this.rank) < ranks.indexOf(this.name.charAt(0))) checkGolbalAuth(this.name);
		if (this.alts.indexOf(this.id) > -1) this.alts.splice(this.alts.indexOf(this.id), 1);

		if (!this.paw) this.paw = (Data.settings.roompaw[this.id]) ? true : false;
		if (!this.gallery) this.gallery = Data.galleries[this.id] || "";
	};
	this.isSelf = function() {
		return this.id === toId(config.nick);
	};
	this.isSysOp = function() {
		return config.excepts.indexOf(this.id) !== -1;
	};
	this.getRPdata = function() {
		if (!Data.rpdata[this.id]) {
			for (var i = 0; i < this.alts.length; i++) {
				if (Data.rpdata[this.alts[i]]) return Data.rpdata[this.alts[i]];
			}
			Data.rpdata[this.id] = {
				happy: 50,
				lewd: 0,
				usedKeywords: [],
				lastRP: Date.now(),
				lastResponce: ""
			};
		}
		return Data.rpdata[this.id];
	};
	this.canHTML = function() {
		for (var i in Rooms) {
			var room = Rooms[i];
			if (room.pm) continue;
			if (!room.canHTML()) continue;
			if (room.users.indexOf(this.id) > -1) return room.id;
		}
		return false;
	};
	// User#say
	this.say = function(text) {
		if (!text) return;
		var str = "|/pm " + this.currentId+ ", ";
		if (text.substr(0, 8) === "!htmlbox" || text.substr(0, 11) === "/addhtmlbox") {
			if (!this.canHTML()) {
				str += "Currently unable to pm you HTML. Please join a room where I have bot rank:";
				for (var i in Rooms) {
					var room = Rooms[i];
					if (!room.isPrivate && !room.pm && room.canHTML()) str += " <<" + room.id + ">>";
				}
			} else {
				str = this.canHTML() + "|/pminfobox " + this.currentId + ", " + text.substr(text.indexOf(" "));
			}
		} else if (text.charAt(0) === "/") {
			str += text;
		} else {
			if (text.length > 300 && text.length < 1201 && this.canHTML()) {
				str = this.canHTML() + "|/pminfobox " + this.currentId + ", " + Tools.markupHTML(text);
			} else if (text.length > 300) {
				return Tools.uploadToHastebin(this, text);
			} else {
				str += text;
			}
		}
		send(str);
	};
};
