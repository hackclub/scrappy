import { resolve, relative, extname, basename, dirname } from 'path'
import fs from 'fs'
const { readdir } = require('fs').promises

async function getFiles(dir) {
  const dirents = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(dirents.map((dirent) => {
    const res = resolve(dir, dirent.name)
    return dirent.isDirectory() ? getFiles(res) : res
  }))
  return Array.prototype.concat(...files)
}

module.exports = async (app) => {
  const startTS = Date.now()
  await getFiles('./api').then(files => files.forEach(file => {
    if (extname(file) != '.js') {
      // skip loading non-js files
      return
    }
    console.log('file', file)

    let routePath = relative(__dirname, dirname(file)).substr(3)
    if (basename(file, extname(file)) != 'index') {
      routePath = `${routePath}/${basename(file, extname(file))}`
    }
    console.log('loading file', routePath)

    fs.readFile(file, (err, data) => {
      if (err) console.log('error', error)
      console.log('data', data.toString('utf-8'))
    })

    let route = require(file)
    app.use('/api' + routePath, route)

    app.all('/api' + routePath, async (req, res) => {
      console.log('hey')
      try {
        let route = require(file)
        await route(req, res)
        console.log('routed', route)
      } catch (err) {
        console.error(err)
      }
    })
  })).then(_ => {
    console.log(`Finished loading in ${Date.now() - startTS}ms`)
  })
}