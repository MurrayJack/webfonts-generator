var fs = require('fs')
var crypto = require('crypto')
var _ = require('underscore')
var urlJoin = require('url-join')

/** Caclulates hash based on options and source SVG files */
var calcHash = function(options) {
	var hash = crypto.createHash('md5')
	options.files.forEach(function(file) {
		hash.update(fs.readFileSync(file, 'utf8'))
	})
	hash.update(JSON.stringify(options))
	return hash.digest('hex')
}

var makeUrls = function(options) {
	var hash = calcHash(options)
	var baseUrl = options.cssFontsUrl && options.cssFontsUrl.replace(/\\/g, '/')
	var urls = _.map(options.types, function(type) {
		var fontName = options.fontName + '.' + type + '?' + hash
		return baseUrl ? urlJoin(baseUrl, fontName) : fontName
	})
	return _.object(options.types, urls)
}

var makeCtx = function(options, urls) {
	// Transform codepoints to hex strings
	var codepoints = _.object(_.map(options.codepoints, function(codepoint, name) {
		return [name, codepoint.toString(16)]
	}))

	return _.extend({
		fontName: options.fontName,
		codepoints: codepoints
	}, options.templateOptions)
}

var renderLess = function(options, urls) {
	if (typeof urls === 'undefined') urls = makeUrls(options)
	var ctx = makeCtx(options, urls)
	var data = "";

	for (var item in ctx.codepoints) {
		data = data + "@srf-var-" + item + ": \"\\" + ctx.codepoints[item] + "\";\n";
	}

 	return data;
}

module.exports = renderLess
