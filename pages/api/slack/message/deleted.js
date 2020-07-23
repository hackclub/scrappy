import { react, deleteScrap, postEphemeral, getUserRecord, fetchProfile, setStatus, accountsTable, displayStreaks, shouldUpdateStreak, unverifiedRequest } from '../../../../lib/api-utils'

const deleteThreadedMessages = async (ts, channel, user) => {
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
  const userRecord = await getUserRecord(user)
  const shouldUpdate = await shouldUpdateStreak(user, false)
  if (shouldUpdate) {
    const updatedStreakCount = userRecord.fields['Streak Count'] - 1
    accountsTable.update(userRecord.id, {
      'Streak Count': updatedStreakCount
    })
    displayStreaks(user, updatedStreakCount)
  }
  fetchProfile(userRecord.fields['Username'])
  postEphemeral(channel, `Your scrapbook update has been deleted :boom:`, user)
}

export default async (req, res) => {
  if (unverifiedRequest(req)) return res.status(400).send('Unverified Slack request!')
  else res.status(200).end()

  const { channel, message, previous_message, thread_ts } = req.body.event

  const ts = thread_ts || message.thread_ts
  if (ts) {
    await Promise.all([
      react('add', channel, ts, 'beachball'),
      deleteScrap(ts),
      deleteThreadedMessages(ts, channel, previous_message.user)
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
