/*
This posts an introductory message to the #scrapbook channel when someone shows up
*/
import { postEphemeral, t, timeout, unverifiedRequest } from '../../../../lib/api-utils'

export default async (req, res) => {
  if (unverifiedRequest(req)) return res.status(400).send('Unverified Slack request!')
  else res.status(200).end()

  const { user, channel } = req.body.event

  await timeout(1000)
  postEphemeral(channel, t(channel == process.env.CHANNEL ? 'messages.join.scrapbook' : 'messages.join.css', { user }), user)

  return res.json({ ok: true })
}
