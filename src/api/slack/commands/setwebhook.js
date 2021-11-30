import {
  unverifiedRequest,
  getUserRecord,
  t,
  sendCommandResponse,
  rebuildScrapbookFor
} from '../../../lib/api-utils.js'
import prisma from '../../../lib/prisma.js'

export default async (req, res) => {
  if (unverifiedRequest(req)) {
    return res.status(400).send('Unverified Slack request!')
  }

  const { text, user_id, response_url } = req.body
  const args = text.split(' ')
  let webhook = args[0] === 'setwebhook' ? args[1] : args[0]
  webhook =
    webhook[webhook.length - 1] === '>'
      ? webhook?.substring(1, webhook.length - 1)
      : webhook?.substring(1, webhook.length)

  if (!webhook) {
    sendCommandResponse(response_url, t('messages.webhook.noargs'))
  } else {
    const userRecord = await getUserRecord(user_id)

    await prisma.accounts.update({
      where: { slackID: userRecord.slackID },
      data: { webhookURL: webhook }
    })

    // hang tight while the rebuild happens before giving out the new link
    await sendCommandResponse(response_url, t('messages.webhook.set'))
  }
  res.status(200).end()
}
