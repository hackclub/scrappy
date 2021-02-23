const cheerio = require('cheerio')
const fetch = require('node-fetch')

const {
  sendCommandResponse,
  accountsTable,
  getUserRecord,
  updatesTable,
  t,
  unverifiedRequest
} = require('../../../lib/api-utils')

module.exports = async (req, res) => {
  if (unverifiedRequest(req)) {
    return res.status(400).send('Unverified Slack request!')
  }

  const command = req.body
  console.log(command)
  const args = command.text.split(' ')
  let url = args[0] === 'setcss' ? args[1] : args[0]
  url = url?.substring(0, url.length)
  console.log('url', url)

  if (!url) {
    const userRecord = await getUserRecord(command.user_id)
    if (userRecord.fields['CSS URL'] != null) {
      updatesTable.update(userRecord.id, {
        'CSS URL': ''
      })
      sendCommandResponse(command.response_url, t('messages.css.removed'))
    } else {
      sendCommandResponse(command.response_url, t('messages.css.noargs'))
    }
  } else if (url.includes('gist.github.com')) {
    url = await fetch(url)
      .then((r) => r.text())
      .then(async (html) => {
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
            t('messages.css.set', { url: githubUrl, username })
          )
        } else {
          sendCommandResponse(command.response_url, t('messages.css.nocss'))
        }
      })
  } else {
    const user = await getUserRecord(command.user_id)
    const username = user.fields['Username']
    if (url === 'delete' || url === 'remove') {
      accountsTable.update(user.id, {
        'CSS URL': ''
      })
      sendCommandResponse(command.response_url, t('messages.css.removed'))
    } else {
      if (!url.includes('http')) {
        url = url
      }
      await accountsTable.update(user.id, {
        'CSS URL': url
      })
      await sendCommandResponse(
        command.response_url,
        t('messages.css.set', { url, username })
      )
    }
  }
  res.status(200).end()
}
