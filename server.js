const express = require('express')
const app = express()
const fetch = require('node-fetch')

app.use(express.json())
app.use(express.urlencoded({extended: true}))

const dev = process.env.NODE_ENV !== 'production'

app.get('/ping', (req, res) => {
  res.send('pong!')
})

require('./router')(app)

const port = process.env.PORT || 3000
const listener = app.listen(port, (err) => {
  if (err) throw err
  console.log(`> Listening on port ${listener.address().port}`)

    // if (dev) {
    //   fetch(`http://localhost:${port}/api/regenerate-all`, {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify({
    //       token: process.env.SLACK_VERIFICATION_TOKEN
    //     })
    //   })
    // }
    // trigger own startup message in production
    if (!dev) {
      fetch(`http://localhost:${port}/api/startup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: process.env.SLACK_VERIFICATION_TOKEN
        })
      })
    }
})

module.exports = app