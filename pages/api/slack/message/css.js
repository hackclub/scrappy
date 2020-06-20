import cheerio from 'cheerio'
import { getUserRecord, accountsTable, reply, t, getUrlFromString, postEphemeral, unverifiedRequest } from "../../../../lib/api-utils"

export default async (req, res) => {
  if (unverifiedRequest(req)) return res.status(400).send('Unverified Slack request!')
  const { user, text, ts, channel } = req.body.event

  const userRecord = await getUserRecord(user)

  let url = getUrlFromString(text)
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
            sendCSSMessage(channel, ts)
            await postEphemeral('C015M6U6JKU', t('messages.css.set', { url, username: userRecord.fields['Username'] }), user)
            //await reply(channel, ts, t('messages.css.set', { url: githubUrl, username }))
          } else {
            reply(channel, ts, t('messages.css.nocss'))
          }
        })
    } else {
      const username = userRecord.fields['Username']
      await accountsTable.update(userRecord.id, {
        'CSS URL': url
      })
      sendCSSMessage(channel, ts)
      await postEphemeral('C015M6U6JKU', t('messages.css.set', { url, username: userRecord.fields['Username'] }), user)
      //reply(channel, ts, t('messages.css.set', { url, username }))
    }
  }
}

const sendCSSMessage = (channel, ts) => {
  fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
    },
    body: JSON.stringify({
      channel,
      thread_ts: ts,
      reply_broadcast: true,
      blocks: [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": "Anyone can now click the button below to add this CSS style to their scrapbook!"
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
}