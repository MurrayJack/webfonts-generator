var fs = require('fs')
var path = require('path')
var mkdirp = require('mkdirp')
var _ = require('underscore')

var generateFonts = require('./generateFonts')
var renderCss = require('./renderCss')
var renderHtml = require('./renderHtml')
var renderLess = require('./renderLess')

var TEMPLATES_DIR = path.join(__dirname, '..', 'templates')
var TEMPLATES = {
	css: path.join(TEMPLATES_DIR, 'css.hbs'),
	scss: path.join(TEMPLATES_DIR, 'scss.hbs'),
	html: path.join(TEMPLATES_DIR, 'html.hbs')
}

var DEFAULT_TEMPLATE_OPTIONS = {
	baseSelector: '.icon',
	classPrefix: 'icon-'
}

var DEFAULT_OPTIONS = {
	writeFiles: true,
	fontName: 'iconfont',
	css: true,
	less: true,
	cssTemplate: TEMPLATES.css,
	html: false,
	htmlTemplate: TEMPLATES.html,
	types: ['eot', 'woff', 'woff2'],
	order: ['eot', 'woff2', 'woff', 'ttf', 'svg'],
	rename: function(file) {
		return path.basename(file, path.extname(file))
	},
	formatOptions: {},
	/**
	 * Unicode Private Use Area start.
	 * http://en.wikipedia.org/wiki/Private_Use_(Unicode)
	 */
	startCodepoint: 0xF101,
	normalize: true
}

var webfont = function(options, done) {
	if (options.cssFontsPath) {
		console.log('Option "cssFontsPath" is deprecated. Use "cssFontsUrl" instead.')
		options.cssFontsUrl = options.cssFontsPath
	}

	options = _.extend({}, DEFAULT_OPTIONS, options)

	if (options.dest === undefined) return done(new Error('"options.dest" is undefined.'))
	if (options.files === undefined) return done(new Error('"options.files" is undefined.'))
	if (!options.files.length) return done(new Error('"options.files" is empty.'))

	// We modify codepoints later, so we can't use same object from default options.
	if (options.codepoints === undefined) options.codepoints = {}

	options.names = _.map(options.files, options.rename)
	if (options.cssDest === undefined) {
		options.cssDest = path.join(options.dest, options.fontName + '.css')
	}
	if (options.htmlDest === undefined) {
		options.htmlDest = path.join(options.dest, options.fontName + '.html')
	}
	if (options.lessDest === undefined) {
		options.lessDest = path.join(options.dest, options.fontName + '.less')
	}
	
	// Warn about using deprecated template options.
	for(var key in options.templateOptions) {
		var value = options.templateOptions[key];
		if(key === "baseClass") {
			console.warn("[webfont-generator] Using deprecated templateOptions 'baseClass'. Use 'baseSelector' instead.");
			options.templateOptions.baseSelector = "." + value;
			delete options.templateOptions.baseClass;
			break;
		}
	}

	options.templateOptions = _.extend({}, DEFAULT_TEMPLATE_OPTIONS, options.templateOptions)

	// Generates codepoints starting from `options.startCodepoint`,
	// skipping codepoints explicitly specified in `options.codepoints`
	var currentCodepoint = options.startCodepoint
	var codepointsValues = _.values(options.codepoints)
	function getNextCodepoint() {
		while (_.contains(codepointsValues, currentCodepoint)) {
			currentCodepoint++
		}
		var res = currentCodepoint
		currentCodepoint++
		return res
	}
	_.each(options.names, function(name) {
		if (!options.codepoints[name]) {
			options.codepoints[name] = getNextCodepoint()
		}
	})

	// TODO output
	generateFonts(options)
		.then(function(result) {
			if (options.writeFiles) writeResult(result, options)

			result.generateCss = function(urls) {
				return renderCss(options, urls)
			}
			done(null, result)
		})
		.catch(function(err) { done(err) })
}

function writeFile(content, dest) {
	mkdirp.sync(path.dirname(dest))
	fs.writeFileSync(dest, content)
}

function writeResult(fonts, options) {
	_.each(fonts, function(content, type) {
		var filepath = path.join(options.dest, options.fontName + '.' + type)
		writeFile(content, filepath)
	})
	if (options.css) {
		var css = renderCss(options)
		writeFile(css, options.cssDest)
	}
	if (options.html) {
		var html = renderHtml(options)
		writeFile(html, options.htmlDest)
	}
	if (options.less) {
		var less = renderLess(options)
		writeFile(less, options.lessDest)
	}
	if (options.plugInFunc) {
		options.plugInFunc.map(function (item) {
			var result = item(options, makeCTX(options))
			var file = path.join(options.dest, result.fileName)
			writeFile(result.data, file);
		});
	}
}

function makeCTX(options) {
	var codepoints = _.object(_.map(options.codepoints, function(codepoint, name) {
		return [name, codepoint.toString(16)]
	}))

	return _.extend({
		fontName: options.fontName,
		codepoints: codepoints
	}, options.templateOptions)
}

webfont.templates = TEMPLATES

module.exports = webfont
