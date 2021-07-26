import {
  getUserRecord,
  accountsTable,
  getUrlFromString,
  sendCommandResponse,
  t,
  postEphemeral,
  processGist,
  unverifiedRequest
} from '../../../lib/api-utils'
import prisma from './prisma'

export default async (req, res) => {
  if (unverifiedRequest(req))
    return res.status(400).send('Unverified Slack request!')
  res.status(200).end()
  const data = JSON.parse(req.body.payload)
  const userId = data.user.id

  const parentMessage = await fetch(
    `https://slack.com/api/conversations.history?token=${process.env.SLACK_BOT_TOKEN}&channel=${data.channel.id}&latest=${data.message.thread_ts}&limit=1&inclusive=true`
  ).then((r) => r.json())
  const text = parentMessage.messages[0].text
  let url = getUrlFromString(text)
  if (url.includes('gist.github.com')) {
    url = await processGist(url)
  }

  const userRecord = await getUserRecord(userId)
  await prisma.accountsTable.update({
    where: {
      slackID: userRecord.slackID
    },
    data: {
      cssURL: url
    }
  })
  await postEphemeral(
    'C015M6U6JKU',
    t('messages.css.set', { url, username: userRecord.username }),
    userId
  )
}
