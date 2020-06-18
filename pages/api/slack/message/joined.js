/*
This posts an introductory message to the #scrapbook channel when someone shows up
*/
import { postEphemeral, t, timeout } from '../../../../lib/api-utils'

export default async (req, res) => {
  const { user, channel } = req.body.event

  await timeout(1000)
  postEphemeral(channel, t(channel == process.env.CHANNEL ? 'messages.join.scrapbook' : 'messages.join.css', { user }), user)

  return res.json({ ok: true })
}
