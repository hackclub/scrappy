const {
  postEphemeral,
  forgetUser,
  react,
  t,
  unverifiedRequest
} = require('../../../lib/api-utils')

module.exports = async (req, res) => {
  if (unverifiedRequest(req))
    return res.status(400).send('Unverified Slack request!')
  else res.status(200).end()

  const { user, channel } = req.body.event

  await Promise.all([react('add', channel, ts, 'beachball'), forgetUser(user)])

  await Promise.all([
    react('remove', channel, ts, 'beachball'),
    react('add', channel, ts, 'confusedparrot'),
    postEphemeral(channel, t('messages.forget'), user)
  ])

  return res.json({ ok: true })
}
