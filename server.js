const next = require('next')
const express = require('express')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = express()

  server.all('*', (req, res) => handle(req, res))

  const port = process.env.PORT || 3000
  server.listen(port, err => {
    if (err) throw err
    console.log('> Ready on http://localhost:' + port)
  })
})