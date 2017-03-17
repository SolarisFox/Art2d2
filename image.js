exports.image = function(url, size) {
	this.src = url;
	this.height = size.height;
	this.width = size.width;
	this.display = {
		height: this.height,
		width: this.width,
		res: 1
	};
	this.type = size.type;
	this.created = Date.now();

	this.fullSize = function() {
		this.display = {
			height: this.height,
			width: this.width,
			res: 1
		};
		return this;
	};
	this.setHeight = function(h) {
		this.display.res = h / this.height;
		this.display.height = Math.floor(h);
		this.display.width = Math.floor(this.width * this.display.res);
		return this;
	};
	this.setWidth = function(w) {
		this.display.res = w / this.width;
		this.display.height = Math.floor(this.height * this.display.res);
		this.display.width = Math.floor(w);
		return this;
	};
	this.setRes = function(r) {
		this.display.res = r;
		this.display.height = Math.floor(this.height * this.display.res);
		this.display.width = Math.floor(this.width * this.display.res);
		return this;
	};
	this.maxSize = function(maxWidth, maxHeight) {
		this.fullSize();
		if (this.display.width > maxWidth) {
			this.display.res = maxWidth / this.width;
			this.display.width = Math.floor(maxWidth);
			this.display.height = Math.floor(this.height * this.display.res);
		}
		if (this.display.height > maxHeight) {
			this.display.res = maxHeight / this.height;
			this.display.width = Math.floor(this.width * this.display.res);
			this.display.height = Math.floor(maxHeight);
		}
		return this;
	};
	this.tag = function() {
		return '<img src="' + this.src + '" ' +
			'height=' + this.display.height + ' ' +
			'width=' + this.display.width + '>';
	};
	this.html = function() {
		return '<span title="click for full res: ' +
			this.height + '/' + this.width + '">' +
			'<a href="' + this.src + '">' +
			this.tag() + '</a></span>';
	};
};