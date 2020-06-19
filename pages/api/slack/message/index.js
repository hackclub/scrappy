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

  // if ((event.channel != process.env.CHANNEL || event.channel !== 'C015M6U6JKU')) {
  //   // console.log('Ignoring event in', event.channel, 'because I only listen in on', process.env.CHANNEL)
  //   return
  // }

  //if (event.subtype === 'message_changed') console.log('CHANGED', event)

  let method
  if (event.type === 'member_joined_channel' && (event.channel == process.env.CHANNEL || event.channel == 'C015M6U6JKU')) {
    method = 'joined'
  } else if (event.type === 'user_change') {
    method = 'userChanged'
  } else if (event.subtype === 'file_share' && !event.thread_ts && event.channel == 'C015M6U6JKU') {
    method = 'cssFile'
  } else if (event.type === 'message' && !event.thread_ts && event.channel === 'C015M6U6JKU') {
    method = 'css'
  } else if (event?.message?.subtype === 'tombstone' && event.channel == process.env.CHANNEL) {
    method = 'deleted'
  } else if (event.subtype === 'file_share' && !event.thread_ts && event.channel == process.env.CHANNEL) {
    method = 'created'
  } else if (event.type === 'message' && !event.subtype && !event.thread_ts && event.channel == process.env.CHANNEL) {
    method = 'noFile'
  } else if (event.subtype === 'message_changed' && event.channel == process.env.CHANNEL) {
    method = 'updated'
  } else if (event?.message?.text === 'forget scrapbook' && event.channel == process.env.CHANNEL) {
    method = 'forgotten'
  } else {
    return
  }
  
  console.log(`Routing to method ${method}`)
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
