global.Users = {};

global.getUser = function(username, recursive) {
	if (Users[toId(username)]) {
		var user = Users[toId(username)];
		if (typeof user === "string") {
			if (recursive) {
				DebugTools.error("Circular user alias: " + username);
				console.log(Parser.lastMessage);
				return new User(" Dummy Username");
			}
			return getUser(user, true);
		} else if (typeof user === "undefined") {
			DebugTools.error("Missing alt pointer for: " + username);
			console.log(Parser.lastMessage);
			return new User(" Dummy Username");
		}
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

	this.destroy = function() {
		for (var i = 0; i < this.alts.length; i++) {
			delete Data.rpdata[this.alts[i]];
			delete Users[this.alts[i]];
		}
		delete Data.rpdata[this.id];
		delete Users[this.id];
	};

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
		if (this.name === newName) return;
		this.currentId = toId(newName);
		this.name = newName;

		if (this.currentId !== this.id && this.alts.indexOf(this.currentId) === -1) {
			// the alt hasn't been seen before so combine them
			this.alts.push(this.currentId);
			if (Users[this.currentId]) {
				if (typeof Users[this.currentId] === "object") { // merge the user objects 
					var oldObj = Users[this.currentId];
					for (var i = 0; i < oldObj.alts.length; i++) {
						if (oldObj.alts[i] !== this.id && this.alts.indexOf(oldObj.alts[i]) === -1) this.alts.push(oldObj.alts[i]);
						Users[oldObj.alts[i]] = this.id;
					}
					if (ranks.indexOf(this.rank) < ranks.indexOf(oldObj.rank)) this.rank = oldObj.rank;
					if (!this.paw) this.paw = oldObj.paw;
					if (!this.gallery) this.gallery = oldObj.gallery;
					
					Users[oldObj.id] = this.id;
				} else { // string pointer to another user object
					// yikes, getting here is possible but probably means users
					// are sharing accounts, so lets ignore it.
					DebugTools.info("user '" + this.id + "' attempting to merge with '" + Users[this.currentId] + "'");
				}
			} else { // username hasn't been seen before
				Users[this.currentId] = this.id;
				if (ranks.indexOf(this.rank) < ranks.indexOf(this.name.charAt(0))) checkGolbalAuth(this.name);
				if (!this.paw) this.paw = (Data.settings.roompaw[this.currentId]) ? true : false;
				if (!this.gallery) this.gallery = Data.galleries[this.currentId] || "";
			}
		}
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
			if (room.users.indexOf(this.currentId) > -1) return room.id;
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
