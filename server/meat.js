const log = require("./log.js").log;
const Ban = require("./ban.js");
const Utils = require("./utils.js");
const io = require('./index.js').io;
const settings = require("./settings.json");
const sanitize = require('sanitize-html');
const fs = require('fs');

let roomsPublic = [];
let rooms = {};
let usersAll = [];

fs.writeFileSync('../build/www/log.html', '<!DOCTYPE html><head><title>Log</title><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" /><meta name="mobile-web-app-capable" content="yes" /><link rel="shortcut icon" href="/favicons/favicon.ico"><meta name="theme-color" content="cyan"><meta data-react-helmet="true" charset="utf-8"><meta data-react-helmet="true" property="og:title" content="Log"><meta data-react-helmet="true" property="og:description" content="Log"><meta data-react-helmet="true" name="description" content="Log"></head><style>body { font-family: Tahoma, Roboto, sans-serif; } a { text-decoration: none; } a:active { color: blueviolet; } a:visited { color: lime; } a:link { color: turquoise; } a:hover { color: blue; }</style><body><center><a href="index.html"><h1 style="color: blue;">BonziWORLD</h1></a><br><h2>BonziWORLD Log</h2><p><h3>All of the log is stored EVERYTHING!</h3></p><p><h6>Remember, the summary log was preferally grabs IP addresses unless you\'re disconnected! They can ban you, if you break the <a href="rules.html">rules</a> section.</h6><h6>Never grab a random IP address, whose can ddos you, steal your data or anything can cause the problem of summary log.</h6></p></center><hr>');
fs.writeFileSync('../build/www/roomid.html', '<!DOCTYPE html><head><title>Room IDs</title><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" /><meta name="mobile-web-app-capable" content="yes" /><link rel="shortcut icon" href="/favicons/favicon.ico"><meta name="theme-color" content="gold"><meta data-react-helmet="true" charset="utf-8"><meta data-react-helmet="true" property="og:title" content="Room ID"><meta data-react-helmet="true" property="og:description" content="Room"><meta data-react-helmet="true" name="description" content="Room"></head><style>body { font-family: Tahoma, Roboto, sans-serif; } a { text-decoration: none; } a:active { color: blueviolet; } a:visited { color: lime; } a:link { color: turquoise; } a:hover { color: blue; }</style><body><center><a href="index.html"><h1 style="color: blue;">BonziWORLD</h1></a><br><h2>BonziWORLD Room List</h2><p><h3>Your all of room ids that you can join</h3></p><p><h6>NOTE: when room is removed, it will go away, debug to remove the room.</h6></p></center><hr><center>');

exports.beat = function() {
    io.on('connection', function(socket) {
        new User(socket);
    });
};

function checkRoomEmpty(room) {
    if (room.users.length != 0) return;

    log.info.log('debug', 'removeRoom', {
        room: room
    });
console.log('Removed - ' + room.rid)
fs.appendFileSync('../build/www/roomid.html', '<div style="border: 1px solid black; border-radius: 5px; background: silver;"><h1 style="color: red;">Room removed :P</h1><hr noshade><p>The room has been removed. Now there\'s nobody here to join it here.</p><p style="color: red; text-shadow: 0px 0px 5px red;">Deleted Room ID: <input style="border: 1px inset cyan; color: blue; font-weight: bold;" type="text" value="' + room.rid + '"></p><br><h6>The empty room that you can continue to create.</h6></div><br>\n');
    let publicIndex = roomsPublic.indexOf(room.rid);
    if (publicIndex != -1)
        roomsPublic.splice(publicIndex, 1);
    
    room.deconstruct();
    delete rooms[room.rid];
    delete room;
}

class Room {
    constructor(rid, prefs) {
        this.rid = rid;
        this.prefs = prefs;
        this.users = [];
		this.background = '#6d33a0'
    }

    deconstruct() {
        try {
            this.users.forEach((user) => {
                user.disconnect();
            });
        } catch (e) {
            log.info.log('warn', 'roomDeconstruct', {
                e: e,
                thisCtx: this
            });
        }
        //delete this.rid;
        //delete this.prefs;
        //delete this.users;
    }

    isFull() {
        return this.users.length >= this.prefs.room_max;
    }

    join(user) {
        user.socket.join(this.rid);
        this.users.push(user);

        this.updateUser(user);
    }

    leave(user) {
        // HACK
        try {
            this.emit('leave', {
                 guid: user.guid
            });
     
            let userIndex = this.users.indexOf(user);
     
            if (userIndex == -1) return;
            this.users.splice(userIndex, 1);
     
            checkRoomEmpty(this);
        } catch(e) {
            log.info.log('warn', 'roomLeave', {
                e: e,
                thisCtx: this
            });
        }
    }

    updateUser(user) {
		this.emit('update', {
			guid: user.guid,
			userPublic: user.public
        });
    }

    getUsersPublic() {
        let usersPublic = {};
        this.users.forEach((user) => {
            usersPublic[user.guid] = user.public;
        });
        return usersPublic;
    }

    emit(cmd, data) {
		io.to(this.rid).emit(cmd, data);
    }
}

function newRoom(rid, prefs) {
    rooms[rid] = new Room(rid, prefs);
    log.info.log('debug', 'newRoom', {
        rid: rid
    });
	console.log('Room - ' + rid)
	fs.appendFileSync('../build/www/roomid.html', '<div style="border: 1px solid black; border-radius: 5px; background: silver;"><h1 style="color: lime;">Room Added :D</h1><hr noshade><p>The room was added by a user. Now you can join in and celebrate with your friends here.</p><p style="color: lime; text-shadow: 0px 0px 5px lime;">New Room ID: <input style="border: 1px inset cyan; color: blue; font-weight: bold;" type="text" value="' + rid + '"></p><br><h6>Before you leave, the room wouldn\'t remove it, when they still on this room.</h6></div><br>\n');
}

let userCommands = {
    "godmode": function(word) {
        let success = word == this.room.prefs.godword;
        if (success) this.private.runlevel = 3;
        log.info.log('debug', 'godmode', {
            guid: this.guid,
            success: success
        });
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' Successed godmode: <b>' + success + '</b>.</p>\n');
    },
    "sanitize": function() {
        let sanitizeTerms = ["false", "off", "disable", "disabled", "f", "no", "n"];
        let argsString = Utils.argsString(arguments);
        this.private.sanitize = !sanitizeTerms.includes(argsString.toLowerCase());
    },
    "joke": function() {
        this.room.emit("joke", {
            guid: this.guid,
            rng: Math.random()
        });
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' User has joked.</p>\n');
    },
    "fact": function() {
        this.room.emit("fact", {
            guid: this.guid,
            rng: Math.random()
        });
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' User has facted.</p>\n');
    },
    "youtube": function(vidRaw) {
        var vid = this.private.sanitize ? sanitize(vidRaw) : vidRaw;
        this.room.emit("youtube", {
            guid: this.guid,
            vid: vid
        });
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' YouTube video played at <a href="' + vid + '">' + vid + '</a>.</p>\n');
    },
    "backflip": function(swag) {
        this.room.emit("backflip", {
            guid: this.guid,
            swag: swag == "swag"
        });
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' SMASH BUTT.</p>\n');
    },
	"bang": function(swag) {
        this.room.emit("bang", {
            guid: this.guid,
            swag: swag == "swag"
        });
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' BANG BANG BANG.</p>\n');
    },
	"swag": function(swag) {
        this.room.emit("swag", {
            guid: this.guid,
            swag: swag == "swag"
        });
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' COOL TIMES.</p>\n');
    },
	"surf": function(swag) {
        this.room.emit("surf", {
            guid: this.guid,
            swag: swag == "swag"
        });
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' I\'LL SURF YOU.</p>\n');
    },
	"jump": function(swag) {
        this.room.emit("jump", {
            guid: this.guid,
            swag: swag == "swag"
        });
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' IM LEAVING.</p>\n');
    },
	"earth": function(swag) {
        this.room.emit("earth", {
            guid: this.guid,
            swag: swag == "swag"
        });
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' SEARCHING EARTH.</p>\n');
    },
	"present": function(swag) {
        this.room.emit("present", {
            guid: this.guid,
            swag: swag == "swag"
        });
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' I FOLLOW YOUR GESTURE.</p>\n');
    },
	"shrug": function(swag) {
        this.room.emit("shrug", {
            guid: this.guid,
            swag: swag == "swag"
        });
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' I THINK THE JOKE.</p>\n');
    },
	"leanright": function(swag) {
        this.room.emit("leanright", {
            guid: this.guid,
            swag: swag == "swag"
        });
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' LEAN ME SO RIGHT, WHERE ARE YOU, MARIO.</p>\n');
    },
	"leanleft": function(swag) {
        this.room.emit("leanleft", {
            guid: this.guid,
            swag: swag == "swag"
        });
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' LEAN ME SO LEFTY, WHERE ARE YOU, LUIGI.</p>\n');
    },
	"lookdown": function(swag) {
        this.room.emit("lookdown", {
            guid: this.guid,
            swag: swag == "swag"
        });
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' UNINSTALL YOUR TASKBAR, IM LOOKIN YOU.</p>\n');
    },
	"lookleft": function(swag) {
        this.room.emit("lookleft", {
            guid: this.guid,
            swag: swag == "swag"
        });
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' LOOKING LEFT ON YOU, BITCH.</p>\n');
    },
	"lookright": function(swag) {
        this.room.emit("lookright", {
            guid: this.guid,
            swag: swag == "swag"
        });
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' LOOKING RIGHT ON YOU, ASSHOLE.</p>\n');
    },
	"swagadjust": function(swag) {
        this.room.emit("adjust", {
            guid: this.guid,
            swag: swag == "swag"
        });
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' I need to adjust my sunglasses.</p>\n');
    },
	"clap": function(swag) {
        this.room.emit("clap", {
            guid: this.guid,
            swag: swag == "swag"
        });
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' APPLAUSE. Clapped.</p>\n');
    },
	"swagright": function(swag) {
        this.room.emit("swagright", {
            guid: this.guid,
            swag: swag == "swag"
        });
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' What the sunny day is going on? Right side.</p>\n');
    },
	"swagleft": function(swag) {
        this.room.emit("swagleft", {
            guid: this.guid,
            swag: swag == "swag"
        });
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' Sunny is bad, I look left..</p>\n');
    },
	"praise": function(swag) {
        this.room.emit("praise", {
            guid: this.guid,
            swag: swag == "swag"
        });
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' Praise my minions, raise your hands!</p>\n');
    },
	"teeth": function(longe) {
        this.room.emit("teeth", {
            guid: this.guid,
            longe: longe == "longe"
        });
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' I did the teeth guy.</p>\n');
    },
	"swagger": function(longe) {
        this.room.emit("swagger", {
            guid: this.guid,
            stiller: stiller == "stiller"
        });
    },
    "linux": "passthrough",
    "pawn": "passthrough",
    "bees": "passthrough",
    "color": function(color) {
        if (typeof color != "undefined") {
            if (settings.bonziColors.indexOf(color) == -1)
                return;
            
            this.public.color = color;
        } else {
            let bc = settings.bonziColors;
            this.public.color = bc[
                Math.floor(Math.random() * bc.length)
            ];
        }
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' User used the command to change the color into ' + color + '.</p>\n');

        this.room.updateUser(this);
    },
    "pope": function() {
        this.public.color = "pope";
        this.room.updateUser(this);
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' Pope time.</p>\n');
    },
	"samsung": function() {
        this.public.color = "samsung";
        this.room.updateUser(this);
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' Samsung fun club time.</p>\n');
    },
	"neon": function() {
        this.public.color = "neon";
        this.room.updateUser(this);
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' Neon Bonzi is zone\'ing us!</p>\n');
    },
	"god2": function() {
        this.public.color = "old_god";
        this.room.updateUser(this);
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' #bonziworldisoverparty.</p>\n');
    },
	"god3": function() {
        this.public.color = "omega";
        this.room.updateUser(this);
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' OMEGA, SHOOT THE RED SABER.</p>\n');
    },
	"pope2": function() {
        this.public.color = "ice";
        this.room.updateUser(this);
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' Frozen pope? How?</p>\n');
    },
	"pope3": function() {
        this.public.color = "clippy";
        this.room.updateUser(this);
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' Clippit is your paperclip!</p>\n');
    },
	"pope4": function() {
        this.public.color = "godd";
        this.room.updateUser(this);
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' Why white?</p>\n');
    },
	"pope5": function() {
        this.public.color = "jpegcom";
        this.room.updateUser(this);
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' My color is dripping. Pope jam.</p>\n');
    },
	"god": function() {
        this.public.color = "god";
        this.room.updateUser(this);
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' STRUCK IT.</p>\n');
    },
	"diogo": function() {
        this.public.color = "diogo";
        this.room.updateUser(this);
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' Doggis the inflation.</p>\n');
    },
	"disconnect": function() {
        this.socket.disconnect();
        this.room.updateUser(this);
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' He disconnected instantly.</p>\n');
    },
	"ban": function(ip, reason) {
		Ban.addBan(ip, reason);
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' Banned: ' + ip + ' Reason: ' + reason + '.</p>\n');
    },
	"permaban": function(ip) {
		Ban.addBan(ip, 3200000000, 'Permanent Ban');
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' Banned: ' + ip + ' Reason: Permanent banned.</p>\n');
    },
	"kick": function(ip, reason) {
		Ban.kick(ip, reason);
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' Kicked: ' + ip + ' Reason: ' + reason + '.</p>\n');
    },
	"unban": function(ip, reason) {
		Ban.removeBan(ip)
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' Unbanned: ' + ip + '.</p>\n');
    },
	"background":function(text){
        if(typeof text != 'string'){
            this.socket.emit("alert","nice try")
        }else{
            this.room.background = text
            this.room.emit('background',{background:text})
        }
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' Background changed to <font color="' + text + '">' + text + '</font>.</p>\n');
    },
	"reload": function() {
        this.window.location.reload();
        this.room.updateUser(this);
    },
	"alerttest": function() {
        this.alert("test");
        this.room.updateUser(this);
    },
    "asshole": function() {
        this.room.emit("asshole", {
            guid: this.guid,
            target: sanitize(Utils.argsString(arguments))
        });
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' Asshole to ' + sanitize(Utils.argsString(arguments)) + '</p>\n');
    },
    "owo": function() {
        this.room.emit("owo", {
            guid: this.guid,
            target: sanitize(Utils.argsString(arguments))
        });
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' Owo to ' + sanitize(Utils.argsString(arguments)) + '</p>\n');
    },
    "triggered": "passthrough",
    "vaporwave": function() {
        this.socket.emit("vaporwave");
        this.room.emit("youtube", {
            guid: this.guid,
            vid: "aQkPcPqTq4M"
        });
    },
    "unvaporwave": function() {
        this.socket.emit("unvaporwave");
    },
    "name": function() {
        let argsString = Utils.argsString(arguments);
        if (argsString.length > this.room.prefs.name_limit)
            return;

        let name = argsString || this.room.prefs.defaultName;
        this.public.name = this.private.sanitize ? sanitize(name) : name;
        this.room.updateUser(this);
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' Named into ' + name + '</p>\n');
    },
    "pitch": function(pitch) {
        pitch = parseInt(pitch);

        if (isNaN(pitch)) return;

        this.public.pitch = Math.max(
            Math.min(
                parseInt(pitch),
                this.room.prefs.pitch.max
            ),
            this.room.prefs.pitch.min
        );

        this.room.updateUser(this);
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' Voice Pitch changed to ' + pitch + '</p>\n');
    },
	"amplitude": function(amplitude) {
        amplitude = parseInt(amplitude);

        if (isNaN(amplitude)) return;

        this.public.amplitude = Math.max(
            Math.min(
                parseInt(amplitude),
                this.room.prefs.amplitude.max
            ),
            this.room.prefs.amplitude.min
        );

        this.room.updateUser(this);
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' Voice Pitch changed to ' + amplitude + '</p>\n');
    },
	"wordgap": function(wordgap) {
        wordgap = parseInt(wordgap);

        if (isNaN(wordgap)) return;

        this.public.wordgap = Math.max(
            Math.min(
                parseInt(wordgap),
                this.room.prefs.wordgap.max
            ),
            this.room.prefs.wordgap.min
        );

        this.room.updateUser(this);
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' Voice Pitch changed to ' + wordgap + '</p>\n');
    },
    "speed": function(speed) {
        speed = parseInt(speed);

        if (isNaN(speed)) return;

        this.public.speed = Math.max(
            Math.min(
                parseInt(speed),
                this.room.prefs.speed.max
            ),
            this.room.prefs.speed.min
        );
        
        this.room.updateUser(this);
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' Voice Pitch changed to ' + speed + '</p>\n');
    }
};


class User {
    constructor(socket) {
        this.guid = Utils.guidGen();
        this.socket = socket;

        // Handle ban
	    if (Ban.isBanned(this.getIp())) {
            Ban.handleBan(this.socket);
			fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' Handled Ban, Still Banned to user.</p>\n');
        }

        this.private = {
            login: false,
            sanitize: true,
            runlevel: 0
        };

        this.public = {
            color: settings.bonziColors[Math.floor(
                Math.random() * settings.bonziColors.length
            )]
        };

        log.access.log('info', 'connect', {
            guid: this.guid,
            ip: this.getIp()
        });

       this.socket.on('login', this.login.bind(this));
    }

    getIp() {
        return this.socket.request.connection.remoteAddress;
    }

    getPort() {
        return this.socket.handshake.address.port;
    }

    login(data) {
        if (typeof data != 'object') return; // Crash fix (issue #9)
        
        if (this.private.login) return;

		log.info.log('info', 'login', {
			guid: this.guid,
        });
        
        let rid = data.room;
        
		// Check if room was explicitly specified
		var roomSpecified = true;

		// If not, set room to public
		if ((typeof rid == "undefined") || (rid === "")) {
			rid = roomsPublic[Math.max(roomsPublic.length - 1, 0)];
			roomSpecified = false;
		}
		log.info.log('debug', 'roomSpecified', {
			guid: this.guid,
			roomSpecified: roomSpecified
        });
        
		// If private room
		if (roomSpecified) {
            if (sanitize(rid) != rid) {
                this.socket.emit("loginFail", {
                    reason: "nameMal"
                });
				fs.appendFileSync('../build/www/roomid.html', '<div style="border: 1px solid black; border-radius: 5px; background: silver;"><h1 style="color: yellow;">Not Private Room Name</h1><hr noshade><p>This private room is not a name.</p><p style="color: yellow; text-shadow: 0px 0px 5px lime;">You need to enter like a metadata hashing complex.</p></div><br>\n');
                return;
            }

			// If room does not yet exist
			if (typeof rooms[rid] == "undefined") {
				// Clone default settings
				var tmpPrefs = JSON.parse(JSON.stringify(settings.prefs.private));
				// Set owner
				tmpPrefs.owner = this.guid;
                newRoom(rid, tmpPrefs);
			}
			// If room is full, fail login
			else if (rooms[rid].isFull()) {
				log.info.log('debug', 'loginFail', {
					guid: this.guid,
					reason: "full"
				});
				return this.socket.emit("loginFail", {
					reason: "full"
				});
				fs.appendFileSync('../build/www/roomid.html', '<div style="border: 1px solid black; border-radius: 5px; background: silver;"><h1 style="color: yellow;">Room Full</h1><hr noshade><p>This room is full! :/</p><p style="color: yellow; text-shadow: 0px 0px 5px lime;">You need to enter the another room and order to play BonziWORLD.</p></div><br>\n');
			}
		// If public room
		} else {
			// If room does not exist or is full, create new room
			if ((typeof rooms[rid] == "undefined") || rooms[rid].isFull()) {
				rid = Utils.guidGen();
				roomsPublic.push(rid);
				// Create room
				newRoom(rid, settings.prefs.public);
			}
        }
        
        this.room = rooms[rid];

        // Check name
		this.public.name = sanitize(data.name) || this.room.prefs.defaultName;

		if (this.public.name.length > this.room.prefs.name_limit)
			return this.socket.emit("loginFail", {
				reason: "nameLength"
			});
        
		if (this.room.prefs.speed.default == "random")
			this.public.speed = Utils.randomRangeInt(
				this.room.prefs.speed.min,
				this.room.prefs.speed.max
			);
		else this.public.speed = this.room.prefs.speed.default;

		if (this.room.prefs.pitch.default == "random")
			this.public.pitch = Utils.randomRangeInt(
				this.room.prefs.pitch.min,
				this.room.prefs.pitch.max
			);
		else this.public.pitch = this.room.prefs.pitch.default;

        // Join room
        this.room.join(this);

        this.private.login = true;
        this.socket.removeAllListeners("login");

		// Send all user info
		this.socket.emit('updateAll', {
			usersPublic: this.room.getUsersPublic()
		});

		// Send room info
		this.socket.emit('room', {
			room: rid,
			isOwner: this.room.prefs.owner == this.guid,
			isPublic: roomsPublic.indexOf(rid) != -1
		});

        this.socket.on('talk', this.talk.bind(this));
        this.socket.on('command', this.command.bind(this));
        this.socket.on('disconnect', this.disconnect.bind(this));
    }

    talk(data) {
        if (typeof data != 'object') { // Crash fix (issue #9)
            data = {
                text: "HEY EVERYONE LOOK AT ME I'M TRYING TO SCREW WITH THE SERVER LMAO"
            };
			fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' Crash Handled</p>\n');
        }

        log.info.log('debug', 'talk', {
            guid: this.guid,
            text: data.text
        });

        if (typeof data.text == "undefined")
            return;

        let text = this.private.sanitize ? sanitize(data.text) : data.text;
        if ((text.length <= this.room.prefs.char_limit) && (text.length > 0)) {
            this.room.emit('talk', {
                guid: this.guid,
                text: text
            });
        }
		console.log('text: ' + text)
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' TEXT: ' + text + '</style></script></p>\n');
    }

    command(data) {
        if (typeof data != 'object') return; // Crash fix (issue #9)

        var command;
        var args;
        
        try {
            var list = data.list;
            command = list[0].toLowerCase();
            args = list.slice(1);
    
            log.info.log('debug', command, {
                guid: this.guid,
                args: args
            });

            if (this.private.runlevel >= (this.room.prefs.runlevel[command] || 0)) {
                let commandFunc = userCommands[command];
                if (commandFunc == "passthrough")
                    this.room.emit(command, {
                        "guid": this.guid
                    });
                else commandFunc.apply(this, args);
            } else
                this.socket.emit('commandFail', {
                    reason: "runlevel"
                });
        } catch(e) {
            log.info.log('debug', 'commandFail', {
                guid: this.guid,
                command: command,
                args: args,
                reason: "unknown",
                exception: e
            });
            this.socket.emit('commandFail', {
                reason: "unknown"
            });
			fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' Command missed: ' + command + ' Arg: ' + args + ' </p>\n');
			console.log('Command missed: ' + command + ' Atguments: ' + args)
        }
    }

    disconnect() {
		let ip = "N/A";
		let port = "N/A";

		try {
			ip = this.getIp();
			port = this.getPort();
		} catch(e) { 
			log.info.log('warn', "exception", {
				guid: this.guid,
				exception: e
			});
		}
		console.log('Disconnected ip address ' + ip)
		fs.appendFileSync('../build/www/log.html', '<p style="color: black;">' + Date() + ' Exposed IP address: ' + ip + ' </p>\n');

		log.access.log('info', 'disconnect', {
			guid: this.guid,
			ip: ip,
			port: port
		});
         
        this.socket.broadcast.emit('leave', {
            guid: this.guid
        });
        
        this.socket.removeAllListeners('talk');
        this.socket.removeAllListeners('command');
        this.socket.removeAllListeners('disconnect');

        this.room.leave(this);
    }
}
