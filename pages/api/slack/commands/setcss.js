import cheerio from 'cheerio'

import {
  sendCommandResponse,
  accountsTable,
  getUserRecord,
  updatesTable
} from '../../../../lib/api-utils'

export default async (req, res) => {
  const command = req.body
  let url = command.text

  if (url === '') {
    const userRecord = await getUserRecord(command.user_id)
    if (userRecord.fields['CSS URL'] != null) {
      updatesTable.update(userRecord.id, {
        'CSS URL': ''
      })
      sendCommandResponse(command.response_url, `Your CSS file has been removed from your profile.
      If you would like to re-add it, type \`/setcss <link to css file>\`.`)
    } else {
      sendCommandResponse(
        command.response_url,
        `You must give a URL to a GitHub Gist or CSS file somewhere on the web.
        \n\nTry this one, which sets your background to hot pink! \`/setcss https://gist.github.com/MatthewStanciu/a0c10a8d4264b737fcc3c1724591c232\``
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
          sendCommandResponse(
            command.response_url,
            `Your CSS file, ${githubUrl} has been linked to your profile! Check it out: \`https://scrapbook.hackclub.com/${user.fields['Username']}\``
          )
        } else {
          sendCommandResponse(
            command.response_url,
            'You linked a Gist, but there isn’t a .css file on your Gist. Try again with the raw URL to the CSS.'
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
