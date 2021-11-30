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
  let url = args[0] === 'setaudio' ? args[1] : args[0]
  url = url?.substring(1, url.length - 1)

  const userRecord = await getUserRecord(user_id)
  if (!url) {
    if (userRecord.customAudioURL != null) {
      sendCommandResponse(
        response_url,
        t('messages.audio.removed', { previous: userRecord.customAudioURL })
      )
      // update the account with the new audioless
      await prisma.accounts.update({
        where: { slackID: userRecord.slackID },
        data: { customAudioURL: null }
      })
    } else {
      sendCommandResponse(response_url, t('messages.audio.noargs'))
    }
  } else {
    if (!url.includes('http')) {
      url = 'https://' + url
    }

    // update the account with the new audio
    await prisma.accounts.update({
      where: { slackID: userRecord.slackID },
      data: { customAudioURL: url }
    })

    // force a rebuild of their site
    await rebuildScrapbookFor(userRecord)

    // hang tight while the rebuild happens before giving out the new link
    await sendCommandResponse(
      response_url,
      t('messages.audio.set', {
        url: `https://scrapbook.hackclub.com/${userRecord.username}`
      })
    )
  }
  res.status(200).end()
}
