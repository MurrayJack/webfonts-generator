var _ = require('underscore')

var makeCtx = function(options) {
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
	var ctx = makeCtx(options, urls)
	var data = '';

	for (var item in ctx.codepoints) {
		data = data + '@srf-var-' + item.toLowerCase() + ': \"\\' + ctx.codepoints[item] + '\";\n';
	}

	data = data + '\n\n';
	for (var item in ctx.codepoints) {
		data = data + '.srf-' + item.toLowerCase() + ':before { \n';
		data = data + '\tcontent: \"\\' + ctx.codepoints[item] + '\"; \n';
		data = data + '}\n\n';
	}

 	return data;
}

module.exports = renderLess
