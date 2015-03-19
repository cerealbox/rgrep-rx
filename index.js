var lazy = require("lazy")
var rx = require("rx")
var fs = require("fs")
var path = require("path")
var log = console.log.bind(console)
var Observable = rx.Observable

var readdir = Observable.fromNodeCallback(fs.readdir.bind(fs))
var stat = Observable.fromNodeCallback(fs.stat.bind(fs))
var readStream = Observable.fromNodeCallback(fs.createReadStream.bind(fs))

function lines(file) {
	return Observable.create(function(observer) {
		new lazy(fs.createReadStream(file)).lines.forEach(function(line) { 
			observer.onNext(line.toString("utf-8"))
		}).join(function() { 
			observer.onCompleted()
		})		
	})
}

function files(dir) {
	return readdir(dir).
		flatMap(Observable.fromArray.bind(Observable)).
			flatMap(function(file) {
				var newPath = path.join(dir, file)
				return stat(newPath).
					map(function(stats) {
						return {file: newPath, stats: stats}
					})
			}).
			flatMap(function(fileNstats) {
				if (fileNstats.stats.isDirectory()) {
					return files(fileNstats.file)
				} else {
					return Observable.of(fileNstats.file)
				}
			})
}

var gex = new RegExp(process.argv[2])
var maxConcurrent = process.argv[3] && parseInt(process.argv[3], 10) || 5

files("./").
	map(function(file) {
		return lines(file)
	}).
	merge(maxConcurrent).
	filter(function(line) {
		return gex.test(line)
	}).
	forEach(log, log)
