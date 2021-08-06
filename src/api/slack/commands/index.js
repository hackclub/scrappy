import { unverifiedRequest } from '../../../lib/api-utils'
import fetch from 'node-fetch'

export default async (req, res) => {
  if (unverifiedRequest(req))
    return res.status(400).send('Unverified Slack request!')
  else res.status(200).end()

  let { text } = req.body
  text = text.split(' ')[1] ? text.split(' ')[0] : text
  console.log(text)
  let method
  switch (text) {
    case 'setcss':
      method = 'setcss'
      break
    case 'streaksdev':
    case 'displaystreaks':
      method = 'displaystreaks'
      break
    case 'setdomain':
      method = 'setdomain'
      break
    case 'webring':
    case 'webrings':
      method = 'webrings'
      break
    case 'setaudio':
    case 'setsound':
      method = 'setaudio'
      break
    case 'open':
      method = 'open'
      break
    case 'stealcss':
      method = 'steal-css'
      break
    case 'setwebhook':
      method = 'setwebhook'
      break
    case 'help':
    case '':
      method = 'help'
      break
  }

  //                v- should be http or https, fallback to http just in case
  const protocol = (req.headers['x-forwarded-proto'] || 'http') + '://'
  const backendUrl =
    protocol + req.headers.host + '/api/slack/commands/' + method

  await fetch(backendUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Passthrough': 'TRUE - Working around slack, see message.js for source'
    },
    body: JSON.stringify(req.body)
  })
}
