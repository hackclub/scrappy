export default async (req, res) => {
  await res.status(200).end()
  console.log(JSON.parse(req.body.payload).actions)
  console.log(req.body.payload.actions)
  const actionValue = req.body.payload.actions[0].value

  let method
  if (actionValue === 'css') {
    method = 'css'
  }

  const protocol = (req.headers['x-forwarded-proto'] || 'http') + '://'
  const backendUrl = protocol + req.headers.host + '/api/slack/message/' + method

  await fetch(backendUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Passthrough': 'TRUE - Working around slack, see message.js for source'
    },
    body: JSON.stringify(req.body.payload)
  })
}