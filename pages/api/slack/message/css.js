import cheerio from 'cheerio'
import { getUserRecord, accountsTable, reply, t } from "../../../../lib/api-utils"

export default async (req, res) => {
  const { user, text, ts, channel } = req.body.event
  const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig

  const userRecord = await getUserRecord(user)
  console.log('record', userRecord)
  console.log('user', user)

  let url = text.match(urlRegex)[0]
  console.log(url)

  if (url) {
    if (url.includes('gist.github.com')) {
      url = await fetch(url)
        .then(r => r.text())
        .then(async html => {
          const $ = cheerio.load(html)
          let raw = $('.file .file-actions a').attr('href')
          if (Array.isArray(raw)) raw = raw[0]
          if (raw.endsWith('.css')) {
            const githubUrl = 'https://gist.githubusercontent.com' + raw
            await accountsTable.update(userRecord.id, {
              'CSS URL': githubUrl
            })
            const username = userRecord.fields['Username']
            await reply(channel, ts, t('messages.css.set', { url: githubUrl, username }))
          } else {
            reply(channel, ts, t('messages.css.nocss'))
          }
        })
    } else {
      const username = userRecord.fields['Username']
      await accountsTable.update(userRecord.id, {
        'CSS URL': url
      })
      fetch('https://slack.com/api/chat.postMessage', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
        },
        body: JSON.stringify({
          channel,
          thread_ts: ts,
          blocks: [
            {
              "type": "section",
              "text": {
                "type": "mrkdwn",
                "text": "That's a nice looking CSS file! Click the button below to add this style to your scrapbook."
              }
            },
            {
              "type": "actions",
              "elements": [
                {
                  "type": "button",
                  "text": {
                    "type": "plain_text",
                    "emoji": true,
                    "text": "Set CSS"
                  },
                  "value": "css"
                }
              ]
            }
          ]
        })
      })
      //reply(channel, ts, t('messages.css.set', { url, username }))
    }
  }
}