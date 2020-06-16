import { react, deleteScrap } from '../../../../lib/api-utils'

const deleteThreadedMessages = async (ts, channel) => {
  const result = await fetch(
    `https://slack.com/api/conversations.replies?channel=${channel}&ts=${ts}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`
      }
    }
  ).then((r) => r.json())

  await Promise.all(
    result.messages.map(async (msg) => {
      // If the msg ts & thread_ts are the same, it's a top level comment
      if (msg.ts == msg.thread_ts) {
        return null
      }
      console.log('trying to delete', msg)
      return await fetch(
        `https://slack.com/api/chat.delete`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ channel, ts: msg.ts })
        }
      ).then((r) => r.json())
    })
  )
}

export default async (req, res) => {
  const { channel, message, thread_ts } = req.body.event

  const ts = thread_ts || message.thread_ts
  if (ts) {
    await Promise.all([
      react('add', channel, ts, 'beachball'),
      deleteScrap(ts),
      deleteThreadedMessages(ts, channel)
    ])
    await Promise.all([
      await react('remove', channel, ts, 'beachball'),
      await react('add', channel, ts, 'boom')
    ])
  } else {
    console.log('SHIT')
  }

  return res.json({ ok: true })
}
