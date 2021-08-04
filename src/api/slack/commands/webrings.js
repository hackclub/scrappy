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
  const args = text.split(' ')
  const webringUser = args[args[0] === 'webring' ? 1 : 0]
    ?.split('@')[1]
    ?.split('|')[0]
  console.log('webring user', webringUser)

  if (!webringUser) {
    return sendCommandResponse(response_url, t('messages.webring.noargs'))
  }
  if (webringUser && !text.includes('<@')) {
    return sendCommandResponse(response_url, t('messages.open.invaliduser'))
  }
  if (user_id === webringUser) {
    return sendCommandResponse(response_url, t('messages.webring.yourself'))
  }

  const userRecord = await getUserRecord(user_id)
  const webringUserRecord = await getUserRecord(webringUser)
  const scrapbookLink = `https://scrapbook.hackclub.com/${userRecord.username}`
  let currentWebring = userRecord.webring
  console.log('current webrings', currentWebring)
  if (!currentWebring) {
    currentWebring = [webringUserRecord.id]
  } else if (!currentWebring.includes(webringUserRecord.id)) {
    if (currentWebring.length >= 8)
      return sendCommandResponse(response_url, t('messages.webring.toolong'))
    currentWebring.push(webringUserRecord.id)
    sendCommandResponse(
      response_url,
      t(`messages.webring.add`, { webringUser, scrapbookLink })
    )
  } else {
    currentWebring = currentWebring.filter((rec) => rec != webringUserRecord.id)
    sendCommandResponse(
      response_url,
      t(`messages.webring.remove`, { webringUser, scrapbookLink })
    )
  }
  await prisma.accounts.update({
    where: { slackID: userRecord.slackID },
    data: { webring: currentWebring }
  })
  await fetchProfile(userRecord.username)
}
