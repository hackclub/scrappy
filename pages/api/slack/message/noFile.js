import { postEphemeral, t } from "../../../../lib/api-utils"

export default async (req, res) => {
  const { channel, ts, user } = req.body.event

  await Promise.all([
    deleteMessage(channel, ts),
    postEphemeral(channel, t('messages.delete'), user)
  ])
}

const deleteMessage = async (channel, ts) => {
  const dl = await fetch('https://slack.com/api/chat.delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SLACK_USER_TOKEN}`
    },
    body: JSON.stringify({
      channel,
      ts
    })
  }).then(r => r.json())
  console.log(dl)
}