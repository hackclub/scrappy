const { postEphemeral, t, unverifiedRequest } = require('../../../../lib/api-utils')
const fetch = require('node-fetch')

module.exports = async (req, res) => {
  if (unverifiedRequest(req))
    return res.status(400).send('Unverified Slack request!')
  else res.status(200).end()

  const { channel, ts, user, text } = req.body.event

  await Promise.all([
    deleteMessage(channel, ts),
    postEphemeral(channel, t('messages.delete', { text }), user)
  ])
}

const deleteMessage = async (channel, ts) =>
  fetch('https://slack.com/api/chat.delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.SLACK_USER_TOKEN}`
    },
    body: JSON.stringify({
      channel,
      ts
    })
  }).then((r) => r.json())
