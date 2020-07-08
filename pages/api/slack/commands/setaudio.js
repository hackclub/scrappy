import { unverifiedRequest, getUserRecord, t, accountsTable, sendCommandResponse, rebuildScrapbookFor } from "../../../../lib/api-utils"

export default async (req, res) => {
  if (unverifiedRequest(req)) return res.status(400).send('Unverified Slack request!')
  else res.status(200).end()

  const { text, user_id, response_url } = req.body
  let url = text.split(' ')[1]
  url = url?.substring(1, url.length - 1)

  const userRecord = await getUserRecord(user_id)
  if (!url) {
    if (userRecord.fields['CSS URL'] != null) {
      sendCommandResponse(response_url, t('messages.audio.removed', { previous: userRecord.fields['CSS URL'] }))
    } else {
      sendCommandResponse(response_url, t('messages.audio.noargs'))
    }
  } else {
    if (!url.includes('http')) {
      url = 'https://' + url
    }

    // update the account with the new audio
    await accountsTable.update(userRecord.id, {
      'Custom Audio URL': url,
      'Attachments': [
        {
          'url': ''
        }
      ]
    })

    // force a rebuild of their site
    await rebuildScrapbookFor(userRecord)

    // hang tight while the rebuild happens before giving out the new link
    await sendCommandResponse(
      response_url, t('messages.audio.set', { url: userRecord.fields['Scrapbook URL'] })
    )
  }
  res.status(200).end()
}