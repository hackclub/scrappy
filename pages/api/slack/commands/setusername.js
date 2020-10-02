import {
  unverifiedRequest,
  getUserRecord,
  t,
  accountsTable,
  sendCommandResponse,
  rebuildScrapbookFor
} from '../../../../lib/api-utils'

export default async (req, res) => {
  if (unverifiedRequest(req))
    return res.status(400).send('Unverified Slack request!')
  else res.status(200).end()

  const { text, user_id, response_url } = req.body
  const args = text.split(' ')
  let username = args[0] === 'setusername' ? args[1] : args[0]
  username = username?.replace(' ', '_')

  const userRecord = await getUserRecord(user_id)

  if (
    userRecord.fields['Last Username Updated Time'] >
    new Date(Date.now() - 86400 * 1000).toISOString()
  ) {
    sendCommandResponse(response_url, t('messages.username.time'))
  } else if (!username) {
    sendCommandResponse(response_url, t('messages.username.noargs'))
  } else {
    // update the account with the new audio
    await accountsTable.update(userRecord.id, {
      Username: username,
      'Last Username Updated Time': Date.now()
    })

    // force a rebuild of their site
    await rebuildScrapbookFor(userRecord)

    // hang tight while the rebuild happens before giving out the new link
    await sendCommandResponse(
      response_url,
      t('messages.username.set', { url: `https://scrapbook.hackclub.com/${username}` })
    )
  }
  res.status(200).end()
}
