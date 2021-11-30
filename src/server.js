import 'dotenv/config'
import fetch from 'node-fetch'
import express from "express"
const app = express()


import router from './router.js'

router(app)

app.use(express.json())
app.use(express.urlencoded({extended: true}))

const dev = process.env.NODE_ENV !== 'production'

app.get('/ping', (req, res) => {
  res.send('pong!')
})

const port = process.env.PORT || 3000
 app.listen(port, (err) => {
  if (err) throw err
  console.log(`> Listening on port ${port}`)

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

export default app
