// Slack expects a very quick response to all webhooks it sends out. This
// function returns quickly back to Slack with status OK and then passes off

// the data sent to us to another serverless function for longer processing.
export default async (req, res) => {
  const { challenge, event } = req.body

  // pass URL setup challenge Slack sends us
  if (challenge) {
    return await res.json({ challenge })
  }

  res.status(200).json({ ok: true })

  if (event.channel != process.env.CHANNEL && event.type !== 'user_change') {
    // console.log('Ignoring event in', event.channel, 'because I only listen in on', process.env.CHANNEL)
    return
  }

  let method
  if (event.type === 'member_joined_channel') {
    method = 'joined'
  } else if (event.type === 'user_change') {
    console.log(event)
  } else if (event?.message?.subtype === 'tombstone') {
    method = 'deleted'
  } else if (event.subtype === 'file_share') {
    method = 'created'
  } else if (event.subtype === 'message_changed') {
    method = 'updated'
  } else if (event?.message?.text === 'forget scrapbook') {
    method = 'forgotten'
  } else {
    return
  }

  //                v- should be http or https, fallback to http just in case
  const protocol = (req.headers['x-forwarded-proto'] || 'http') + '://'
  const backendUrl = protocol + req.headers.host + '/api/slack/message/' + method

  await fetch(backendUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Passthrough': 'TRUE - Working around slack, see message.js for source'
    },
    body: JSON.stringify(req.body)
  })
}
