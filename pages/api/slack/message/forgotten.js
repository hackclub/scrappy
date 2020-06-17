import { postEphemeral, forgetUser, react, t } from "../../../../lib/api-utils"

export default async (req, res) => {
  const { user, channel } = req.body.event

  await Promise.all([
    react('add', channel, ts, 'beachball'),
    forgetUser(user)
  ])

  await Promise.all([
    react('remove', channel, ts, 'beachball'),
    react('add', channel, ts, 'confusedparrot'),
    postEphemeral(channel, t('messages.forget'), user)
  ])

  return res.json({ ok: true })
}