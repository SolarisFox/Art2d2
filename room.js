global.Rooms = {};

global.getRoom = function (name) {
	if (!name) return getRoom("Lobby");
	if (Rooms[Tools.toRoomId(name)]) return Rooms[Tools.toRoomId(name)];
	var newRoom = new Room(name);
	Rooms[newRoom.id] = newRoom;
	return newRoom;
};

var ranks = " +%@*#&~";

// constructor for user object

exports.room = function (name) {
	this.name = name;
	this.id = Tools.toRoomId(name);
	this.isPrivate = false;
	this.pm = null;
	this.users = [];
	this.auth = {};
	this.ownRank = " ";
	this.lastRP = 0;

	this.canBroadcast = function() {
		return ranks.indexOf(this.ownRank) > 0;
	};
	this.canAnnounce = function() {
		return ranks.indexOf(this.ownRank) > 1;
	}
	this.canHTML = function() {
		if (this.pm) return this.pm.canHTML();
		return this.ownRank === "*";
	};
	this.canRP = function(user) {
		if (!user.hasRank("+", this) && Date.now() - this.lastRP < exports.rpCooldown * 1000) return false;
		this.lastRP = Date.now();
		return true;
	};
	// Room#say
	this.say = function(text) {
		if (!text) return;
		if (this.pm) return this.pm.say(text);

		if (text.charAt(0) === "!" && !this.canBroadcast()) text = "Unable to broadcast";
		if (text.substr(0, 8) === "!htmlbox" || text.substr(0, 11) === "/addhtmlbox") {
			if (!this.canHTML()) {
				text = "Unable to use html";
			} else {
				text = Tools.markupHTML(text);
			}
		}

		var str = (this.id !== 'lobby' ? this.id : '') + '|';
		if (text.charAt(0) === "/" || text.substr(0, 8) === "!htmlbox") {
			str += text;
		} else {
			if (text.length > 1200) {
				DebugTools.error("Attempted to say in " + this.name + ": " + text);
				str = "Text limit exceeded. Report to bot owner.";
			} else if (text.length > 300) {
				if (this.canHTML()) {
					str += "!htmlbox " + Tools.markupHTML(text);
				} else {
					str = str.splice(300, 0, "\n");
				}
			} else {
				str += text;
			}
		}
		send(str);
	};
};
