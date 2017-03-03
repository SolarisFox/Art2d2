exports.color = function (hex) {
	this.hex = hex || 0x000000;
	this.hexString = hex.toString(16);
	while (this.hexString.length < 6) {
		this.hexString = "0" + this.hexString;
	}
	var setHex = function(color) {
		var string = "";
		for (var i = 0; i < 3; i++) {
			var buffer = color.rgb[i].toString(16);
			if (buffer.length < 2) buffer = "0" + buffer;
			string += buffer;
		}
		color.hex = parseInt(string, 16);
		color.hexString = string;
	};
	this.rgb = [
		parseInt(this.hexString.substr(0, 2), 16), // red
		parseInt(this.hexString.substr(2, 2), 16), // green
		parseInt(this.hexString.substr(4, 2), 16)  // blue
	];
	this.hsv = [0, 0, 0]; // [hue, saturation, value]
	var setHSV = function(color) {
		var rPrime = color.rgb[0] / 255;
		var gPrime = color.rgb[1] / 255;
		var bPrime = color.rgb[2] / 255;
		var cMax = Math.max(rPrime, gPrime, bPrime);
		var cMin = Math.min(rPrime, gPrime, bPrime);
		var deltaC = cMax - cMin;
		
		// hue
		if (deltaC === 0) {
			color.hsv[0] = 0;
		} else if (cMax === rPrime) {
			color.hsv[0] = Math.floor(60 * (((gPrime - bPrime) / deltaC) % 6));
		} else if (cMax === gPrime) {
			color.hsv[0] = Math.floor(60 * (((bPrime - rPrime) / deltaC) + 2));
		} else { //cMax === bPrime
			color.hsv[0] = Math.floor(60 * (((rPrime - gPrime) / deltaC) + 4));
		}
		if (color.hsv[0] < 0) color.hsv[0] += 360;
		
		// saturation
		if (cMax === 0) {
			color.hsv[1] = 0;
		} else {
			color.hsv[1] = deltaC / cMax;
		}
		
		// value
		color.hsv[2] = cMax;
	};
	var setRGB = function(color) {
		var c = color.hsv[2] * color.hsv[1];
		var x = c * (1 - Math.abs(((color.hsv[0] / 60) % 2) - 1));
		var m = color.hsv[2] - c;
		
		var primes; // [R', G', B']
		switch(Math.floor(color.hsv[0] / 60)) {
		case 0: primes = [c, x, 0]; break;
		case 1: primes = [x, c, 0]; break;
		case 2: primes = [0, c, x]; break;
		case 3: primes = [0, x, c]; break;
		case 4: primes = [x, 0, c]; break;
		case 5: primes = [c, 0, x]; break;
		default:
			primes = [0, 0, 0]; 
			DebugTools.error("Invalid hue angle for:");
			console.log(color);
		}
		
		color.rgb[0] = Math.floor((primes[0] + m) * 255);
		color.rgb[1] = Math.floor((primes[1] + m) * 255);
		color.rgb[2] = Math.floor((primes[2] + m) * 255);
		
		setHex(color);
	};
	
	// setters
	this.setRed = function(r) {
		this.rgb[0] = Math.abs(Math.floor(r)) % 0x100;
		setHSV(this);
		setHex(this);
		return this;
	};
	this.setGreen = function(g) {
		this.rgb[1] = Math.abs(Math.floor(g)) % 0x100;
		setHSV(this);
		setHex(this);
		return this;
	};
	this.setBlue = function(b) {
		this.rgb[2] = Math.abs(Math.floor(b)) % 0x100;
		setHSV(this);
		setHex(this);
		return this;
	};
	this.setHue = function(h) {
		this.hsv[0] = h % 360;
		if (this.hsv[0] < 0) this.hsv[0] += 360;
		setRGB(this);
		return this;
	};
	this.setSaturation = function(s) {
		if (s < 0) {
			this.hsv[1] = 0;
		} else if (s > 1) {
			this.hsv[1] = 1;
		} else {
			this.hsv[1] = s;
		}
		setRGB(this);
		return this;
	};
	this.setValue = function(v) {
		if (v < 0) {
			this.hsv[2] = 0;
		} else if (v > 1) {
			this.hsv[2] = 1;
		} else {
			this.hsv[2] = v;
		}
		setRGB(this);
		return this;
	};

	this.toString = function() {
		return this.hexString
	};
	this.toHTML = function() {
		return '#' + this.hexString;
	};
	this.hsvToString = function() {
		return '[' + Math.floor(this.hsv[0]) + ', ' +
			Math.floor(100 * this.hsv[1]) + '%, ' +
			Math.floor(100 * this.hsv[2]) + '%]';
	}
	setHSV(this);
};