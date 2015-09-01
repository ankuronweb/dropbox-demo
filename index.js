let express = require('express')
let morgan = require('morgan')
let nodeify = require('bluebird-nodeify')
let fs = require('fs')
let path = require('path')
let mime = require('mime-types')
let rimraf = require('rimraf')
let mkdirp = require('mkdirp')
let archiver = require('archiver')

require('songbird')

const NODE_ENV = process.env.NODE_ENV
const PORT = process.env.PORT || 8000
const ROOT_DIR = path.resolve(process.cwd())

let app = express()

if (NODE_ENV === 'development') {
	app.use(morgan('dev'))
}

app.listen(PORT, ()=> console.log(`LISTENING @ http://localhost:${PORT}`))

app.get('*', setFileMeta, sendHeaders, (req, res) => {
	res.set('Accept', 'application/zip')
	res.set('Content-disposition', 'attachment;')
	res.set('Content-type', 'application/zip')
	if(res.body) {
		res.json(res.body)
		return
	}
	let archive = archiver('zip')
	archive.append(fs.createReadStream(req.filePath), {name: "file"})
	archive.pipe(res);
    archive.finalize()
})

app.head('*', setFileMeta, sendHeaders, (req, res) => res.end())

app.delete('*', setFileMeta, (req, res, next) => {
	async ()=> {
		if(!req.stat) return res.send(400, 'Invalid path')
		if(req.stat && req.stat.isDirectory()) {
			await rimraf.promise(req.filePath)
		}
		else {
			await fs.promise.unlink(req.filePath)
		}
		res.end()
	}().catch(next)
})

app.put('*', setFileMeta, setDirDetails, (req, res, next) => {
	async ()=> {
		if(req.stat) return res.send(405, 'File exists')
		await mkdirp.promise(req.dirPath)

		if(!req.isDir) req.pipe(fs.createWriteStream(req.filePath))
		res.end();

	}().catch(next)
})

app.post('*', setFileMeta, setDirDetails, (req, res, next) => {
	async ()=> {
		if(!req.stat) return res.send(405, 'File does not exist')
		if(req.isDir) return res.send(405, 'Path is a directory')

		await fs.promise.truncate(req.filePath, 0)
		req.pipe(fs.createWriteStream(req.filePath))
		res.end();
	}().catch(next)
})

function setDirDetails(req, res, next) {
	
	let filePath = req.filePath
	let endsWithSlash = filePath.charAt(filePath.length-1) === path.sep
	let hasExt = path.extname(filePath) !== ''
	req.isDir = endsWithSlash || !hasExt
	req.dirPath = req.isDir ? filePath : path.dirname(filePath)
	next()
}

function setFileMeta(req, res, next) {
	req.filePath = path.resolve(path.join(ROOT_DIR, req.url))
	if(req.filePath.indexOf(ROOT_DIR) !== 0) {
		res.send(400, 'Invalid path')
		return
	}
	fs.promise.stat(req.filePath)
		.then(stat => req.stat = stat, ()=> req.stat = null)
		.nodeify(next)
}

function sendHeaders(req, res, next) {
	nodeify(async ()=> {
		if(req.stat.isDirectory()) {
			let files = await fs.promise.readdir(req.filePath)
			res.body = JSON.stringify(files)
			res.setHeader('Content-Length', res.body.length)
			res.setHeader('Content-Type', 'application/json')
			return
		}

		res.setHeader('Content-Length', req.stat.size)
		let contentType = mime.contentType(path.extname(req.filePath))
		res.setHeader('Content-Type', contentType)
		return
	}(), next)
}
