import cheerio from 'cheerio'

import {
  sendCommandResponse,
  accountsTable,
  getUserRecord,
  updatesTable,
  t
} from '../../../../lib/api-utils'

export default async (req, res) => {
  const command = req.body
  console.log(command)
  let url = command.text.split(' ')[1]
  console.log('url', url)

  if (url === '') {
    const userRecord = await getUserRecord(command.user_id)
    if (userRecord.fields['CSS URL'] != null) {
      updatesTable.update(userRecord.id, {
        'CSS URL': ''
      })
      sendCommandResponse(command.response_url, t('messages.css.removed'))
    } else {
      sendCommandResponse(
        command.response_url,
        t('messages.css.noargs')
      )
    }
  } else if (url.includes('gist.github.com')) {
    url = await fetch(url)
      .then(r => r.text())
      .then(async html => {
        console.log(html)
        const $ = cheerio.load(html)
        let raw = $('.file .file-actions a').attr('href')
        if (Array.isArray(raw)) raw = raw[0]
        console.log(raw)
        if (raw.endsWith('.css')) {
          const user = await getUserRecord(command.user_id)
          const githubUrl = 'https://gist.githubusercontent.com' + raw
          await accountsTable.update(user.id, {
            'CSS URL': githubUrl
          })
          const username = user.fields['Username']
          // githubUrl, user.fields['Username']
          sendCommandResponse(
            command.response_url,
            t('messages.css.set', { githubUrl, username })
          )
        } else {
          sendCommandResponse(
            command.response_url,
            t('messages.css.nocss')
          )
        }
      })
  } else {
    const user = await getUserRecord(command.user_id)
    if (!url.includes('http')) {
      url = 'https://' + url
    }
    await accountsTable.update(user.id, {
      'CSS URL': url
    })
    await sendCommandResponse(
      command.response_url,
      `Your CSS file, ${url} has been linked to your profile!`
    )
  }
  res.status(200).end()
}
