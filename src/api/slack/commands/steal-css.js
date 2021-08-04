import {
  unverifiedRequest,
  getUserRecord,
  
  sendCommandResponse,
  t,
  fetchProfile
} from '../../../lib/api-utils'
import prisma from '../../../lib/prisma'

export default async (req, res) => {
  if (unverifiedRequest(req))
    return res.status(400).send('Unverified Slack request!')
  else res.status(200).end()

  const { user_id, response_url, text } = req.body
  console.log('victim text', text)
  const args = text.split(' ')
  const victimUser = args[args[0] === 'stealcss' ? 1 : 0]
    ?.split('@')[1]
    ?.split('|')[0]
  console.log('victim user', victimUser)

  if (!victimUser) {
    return sendCommandResponse(response_url, t('messages.steal.noargs'))
  }
  const userRecord = await getUserRecord(user_id)
  const scrapbookLink = `https://scrapbook.hackclub.com/${userRecord.username}`
  let victimUserRecord
  try {
    victimUserRecord = await getUserRecord(victimUser)
  } catch {
    return sendCommandResponse(response_url, t('messages.steal.invaliduser'))
  }

  const newCSS = victimUserRecord.cssURL
  if (!newCSS)
    return sendCommandResponse(
      response_url,
      t(`messages.steal.empty`, { victimUser })
    )

  await Promise.all([
    await prisma.accounts.update({
      where: { slackID: userRecord.slackID },
      data: { cssURL: newCSS }
    }),
    sendCommandResponse(
      response_url,
      t(`messages.steal.done`, { victimUser, scrapbookLink })
    )
  ])
  await fetchProfile(userRecord.username)
}
