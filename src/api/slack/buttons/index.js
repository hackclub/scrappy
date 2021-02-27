import { unverifiedRequest } from '../../../lib/api-utils'

export default async (req, res) => {
  console.log(req.body)
  if (unverifiedRequest(req))
    return res.status(400).send('Unverified Slack request!')
  const data = JSON.parse(req.body.payload)
  console.log(data)
  const actionValue = data.actions[0].value

  let method
  if (actionValue === 'css') {
    method = 'css'
  }

  const protocol = (req.headers['x-forwarded-proto'] || 'http') + '://'
  const backendUrl =
    protocol + req.headers.host + '/api/slack/buttons/' + method

  await fetch(backendUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Passthrough': 'TRUE - Working around slack, see message.js for source'
    },
    body: JSON.stringify(req.body)
  })
  res.status(200).end()
}
