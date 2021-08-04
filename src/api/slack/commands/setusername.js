import {
  unverifiedRequest,
  getUserRecord,
  t,
  
  sendCommandResponse,
  rebuildScrapbookFor
} from '../../../lib/api-utils'
import prisma from '../../../lib/prisma'

export default async (req, res) => {
  if (unverifiedRequest(req)) {
    return res.status(400).send('Unverified Slack request!')
  }

  const { text, user_id, response_url } = req.body
  const args = text.split(' ')
  let username = args[0] === 'setusername' ? args[1] : args[0]
  username = username?.replace(' ', '_')

  const userRecord = await getUserRecord(user_id)

  const exists = await prisma.accounts.findMany({
    where: {
      username
    }
  })

  console.log(exists.length)

  if (
    userRecord.fields.lastUsernameUpdatedTime >
    new Date(Date.now() - 86400 * 1000)
  ) {
    sendCommandResponse(response_url, t('messages.username.time'))
  } else if (!username) {
    sendCommandResponse(response_url, t('messages.username.noargs'))
  } else if (username.length < 2) {
    sendCommandResponse(response_url, t('messages.username.short'))
  } else if (exists.length > 0) {
    sendCommandResponse(response_url, t('messages.username.exists'))
  } else {
    // update the account with the new username
    await prisma.accounts.update({
      where: { slackID: userRecord.slackID },
      data: { username: username, lastUsernameUpdatedTime:Date.now()  }
    })

    // force a rebuild of their site
    await rebuildScrapbookFor(user_id)

    // hang tight while the rebuild happens before giving out the new link
    await sendCommandResponse(
      response_url,
      t('messages.username.set', {
        url: `https://scrapbook.hackclub.com/${username}`
      })
    )
  }
  res.status(200).end()
}
