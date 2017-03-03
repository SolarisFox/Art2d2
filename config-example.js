// The WEBSOCKET server and port the bot should connect to.
// Most of the time this isn't the same as the URL, check the `Request URL` of
// the websocket.
// If you really don't know how to do this... Run `node getserver.js URL`.
// Fill in the URL of the client where `URL` is.
// For example: `node getserver.js http://example-server.psim.us/`
exports.server = '';
exports.port = 8000;

// This is the server id.
// To know this one, you should check where the AJAX call 'goes' to when you
// log in.
// For example, on the Smogon server, it will say somewhere in the URL
// ~~showdown, meaning that the server id is 'showdown'.
// If you really don't know how to check this... run the said script above.
exports.serverid = '';

// The nick and password to log in with
// If no password is required, leave pass empty
exports.nick = '';
exports.pass = '';

// Here, you can specify the avatar you want the bot to use.
exports.avatarNumber = 0;

// The rooms that should be joined.
exports.rooms = [''];

// The character text should start with to be seen as a command.
// Note that using / and ! might be 'dangerous' since these are used in
// Showdown itself.
// Using only alphanumeric characters and spaces is not allowed.
exports.commandcharacter = '';

// The default rank is the minimum rank that can use a command in a room when
// no rank is specified in settings.json
exports.defaultrank = '#';

// Whether this file should be watched for changes or not.
// If you change this option, the server has to be restarted in order for it to
// take effect.
exports.watchconfig = false;

// Secondary websocket protocols should be defined here, however, Showdown
// doesn't support that yet, so it's best to leave this empty.
exports.secprotocols = [];

// Time in minutes the bot can go without receiving a chat message before resetting.
// Used refresh the websocket connection in case it drops without a closing handshake.
// Leave blank or 0 if you do not wish for the bot to refresh it's own connection.
exports.resetduration = 0;

// What should be logged?
// 0 = error, ok, info, debug, recv, send
// 1 = error, ok, info, debug, cmdr, send
// 2 = error, ok, info, debug (recommended for development)
// 3 = error, ok, info (recommended for production)
// 4 = error, ok
// 5 = error
exports.debuglevel = 2;

// Users who can use all commands regardless of their rank. Be very cautious
// with this, especially on servers other than main.
exports.excepts = [];

// Add a link to the help for the bot here. When there is a link here, .help and .guide
// will link to it.
exports.botguide = '';

// Cooldown on how frequency (in seconds) the bot responds to RP messages in rooms.
exports.rpCooldown = 0;
