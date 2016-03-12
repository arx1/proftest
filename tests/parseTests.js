let fs = require('fs'),
	path = require('path');

function getDirectories(srcpath) {
	return fs.readdirSync(srcpath).filter(function(file) {
		return fs.statSync(path.join(srcpath, file)).isDirectory();
	});
}

function parseTest(test) {
	return Object.assign({}, test, { func: test.func.toString()});
}

export default function parseTests() {
	return getDirectories(__dirname).map(dir =>
		parseTest(require(`${__dirname}/${dir}/test`))
	);
}
