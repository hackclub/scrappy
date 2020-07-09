import { unverifiedRequest, t } from "../../lib/api-utils"

export default async (req, res) => {
  if (unverifiedRequest(req)) return res.status(400).send('Unverified Slack request!')


  let latestCommitMsg = 'misc...'
  await fetch('https://api.github.com/repos/hackclub/scrappy/commits/main').then(r => r.json()).then(d => latestCommitMsg = d.commit.message)
  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`
    },
    body: JSON.stringify({
      channel: 'C0P5NE354',
      text: t('startup.message', {latestCommitMsg}),
      parse: 'mrkdwn',
      unfurl_links: false,
      unfurl_media: false
    })
  })

  res.status(200)
}