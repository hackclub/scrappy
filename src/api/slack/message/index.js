import { unverifiedRequest } from '../../../lib/api-utils'
import fetch from 'node-fetch'

// the data sent to us to another serverless function for longer processing.
module.exports = async (req, res) => {
  const { challenge, event } = req.body

  console.log(req.body)

  // console.log('event 1', event.type)

  // pass URL setup challenge Slack sends us
  if (challenge) {
    return await res.json({ challenge })
  }

  if (unverifiedRequest(req))
    return res.status(400).send('Unverified Slack request!')
  console.log('event 2', event.type)
  res.sendStatus(200)

  console.log('event 3', event.type)

  let method
  if (
    event.type === 'member_joined_channel' &&
    (event.channel == process.env.CHANNEL || event.channel == 'C015M6U6JKU')
  ) {
    method = 'joined'
  } else if (event.type === 'user_change') {
    method = 'userChanged'
  } else if (
    event.subtype === 'file_share' &&
    !event.thread_ts &&
    event.channel == 'C015M6U6JKU'
  ) {
    method = 'cssFile'
  } else if (
    event.type === 'message' &&
    !event.thread_ts &&
    event.channel === 'C015M6U6JKU'
  ) {
    method = 'css'
  } else if (
    event?.message?.subtype === 'tombstone'
  ) {
    method = 'deleted'
  } else if (
    event.subtype === 'file_share' &&
    !event.thread_ts &&
    event.channel == process.env.CHANNEL
  ) {
    method = 'created'
  } else if (
    event.subtype === 'file_share' &&
    !event.thread_ts &&
    event.channel === 'C016QNX2SJ1'
  ) {
    method = 'audio'
  } else if (
    event.type === 'message' &&
    !event.subtype &&
    !event.thread_ts &&
    event.channel == process.env.CHANNEL
  ) {
    method = 'noFile'
  } else if (
    event.subtype === 'message_changed'
  ) {
    method = 'updated'
  } else if (
    event?.message?.text === 'forget scrapbook' &&
    event.channel == process.env.CHANNEL
  ) {
    method = 'forgotten'
  } else if (event.type === 'reaction_added') {
    method = 'reactionAdded'
  } else if (
    event.type === 'reaction_removed' &&
    event.item.channel == process.env.CHANNEL
  ) {
    method = 'reactionRemoved'
  } else if (event.text?.includes('<@U015D6A36AG>') && event.text?.includes('<@U015D6N8X7C>')) {
    console.log('scrappy has been mentioned!')
    method = 'mention'
  } else {
    return
  }

  console.log(`Routing to method ${method}`)
  //                v- should be http or https, fallback to http just in case
  const protocol = (req.headers['x-forwarded-proto'] || 'http') + '://'
  const backendUrl =
    protocol + req.headers.host + '/api/slack/message/' + method

  await fetch(backendUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Passthrough': 'TRUE - Working around slack, see message.js for source',
      'x-slack-signature': req.headers['x-slack-signature'],
      'x-slack-request-timestamp': req.headers['x-slack-request-timestamp']
    },
    body: JSON.stringify(req.body)
  })
}
