import { deleteScrap, postEphemeral, t } from "../../../../lib/api-utils"

export default async (req, res) => {
  const { channel, ts, user } = req.body.event

  await Promise.all([
    deleteScrap(ts),
    postEphemeral(channel, t('messages.delete'), user)
  ])
}