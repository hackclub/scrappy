const { resolve, relative, extname, basename, dirname } = require('path')
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

    let routePath = relative(__dirname, dirname(file)).substr(1)
    console.log(routePath)
    if (basename(file, extname(file)) != 'index') {
      routePath = `${routePath}/${basename(file, extname(file))}`
      console.log('loading file', routePath)
    }

    app.all(routePath, async (req, res) => {
      try {
        let route = require(file)
        await route(req, res)
      } catch (err) {
        console.error(err)
      }
    })
  })).then(_ => {
    console.log(`Finished loading in ${Date.now() - startTS}ms`)
  })
}