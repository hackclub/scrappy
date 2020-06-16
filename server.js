const next = require('next')
const express = require('express')
const bodyParser = require('body-parser')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = express();
  server.use(bodyParser.urlencoded({ extended: true }))
  server.use(bodyParser.json())

  server.all('*', (req, res) => {
    return handle(req, res)
  })
  server.listen(process.env.PORT || 3000, err => {
    if (err) throw err
    console.log('> Ready on http://localhost:3000')
  })
})