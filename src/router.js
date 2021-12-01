import { resolve, relative, extname, join }  from 'path'
import { readdir } from "fs/promises"

async function getFiles(dir) {
  const dirents = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(dirents.map((dirent) => {
    const res = resolve(dir, dirent.name)
    return dirent.isDirectory() ? getFiles(res) : res
  }))
  return Array.prototype.concat(...files)
}

export default async function(app)  {
  const files = await getFiles("./src/api")
  files.forEach(async file => {
    if (extname(file) != '.js') {
      // skip loading non-js files
      return
    }

    const routePath = relative(join(process.cwd(), 'api'), file).replace(/\.js$/, "")
    const route = await import(file)

    app.all(`/api/${routePath}`, async (req, res) => {
      try {
        await route.default(req, res)
      } catch (e) {
        console.log(e);
      }
    })
  });
}
