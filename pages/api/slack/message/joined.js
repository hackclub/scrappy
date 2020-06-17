/*
This posts an introductory message to the #scrapbook channel when someone shows up
*/
import { postEphemeral, t } from '../../../../lib/api-utils'

export default async (req, res) => {
  const { user, channel } = req.body.event

  await postEphemeral(channel, t('messages.join', { user }), user)

  return res.json({ ok: true })
}
