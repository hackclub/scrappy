import {
  unverifiedRequest,
  getUserRecord,
  t,
  accountsTable,
  sendCommandResponse,
  rebuildScrapbookFor
} from '../../../lib/api-utils'

module.exports = async (req, res) => {
  if (unverifiedRequest(req)) {
    return res.status(400).send('Unverified Slack request!')
  }

  const { text, user_id, response_url } = req.body
  const args = text.split(' ')
  let url = args[0] === 'setaudio' ? args[1] : args[0]
  url = url?.substring(1, url.length - 1)

  const userRecord = await getUserRecord(user_id)
  if (!url) {
    if (userRecord.fields['Custom Audio URL'] != null) {
      sendCommandResponse(
        response_url,
        t('messages.audio.removed', { previous: userRecord.fields['Custom Audio URL'] })
      )
      // update the account with the new audioless 
      await accountsTable.update(userRecord.id, {
        'Custom Audio URL': null,
        'Audio File': null
      })
    } 
    
    else if (userRecord.fields['Audio File'] != null) {
      sendCommandResponse(
        response_url,
        t('messages.audio.removed', { previous: userRecord.fields['Audio URL'] })
      )
      // update the account with the new audioless 
      await accountsTable.update(userRecord.id, {
        'Custom Audio URL': null,
        'Audio File': null
      })
    }
    else {
      sendCommandResponse(response_url, t('messages.audio.noargs'))
    }
  } else {
    if (!url.includes('http')) {
      url = 'https://' + url
    }

    // update the account with the new audio
    await accountsTable.update(userRecord.id, {
      'Custom Audio URL': url,
      'Audio File': [
        {
          url: ''
        }
      ]
    })

    // force a rebuild of their site
    await rebuildScrapbookFor(userRecord)

    // hang tight while the rebuild happens before giving out the new link
    await sendCommandResponse(
      response_url,
      t('messages.audio.set', { url: userRecord.fields['Scrapbook URL'] })
    )
  }
  res.status(200).end()
}
