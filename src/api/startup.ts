import { WebClient } from '@slack/web-api'
import { t } from '../lib/api-utils'
import fetch from 'node-fetch'
const botSpam = "C0P5NE354"

export default async (client: WebClient, token: string) => {
  let latestCommitMsg = 'misc...'

  await fetch('https://api.github.com/repos/hackclub/scrappy/commits/main')
    .then((r) => r.json())
    .then((d) => (latestCommitMsg = d.commit.message))

  await client.chat.postMessage({
    token,
    channel: botSpam,
    text: t('startup.message', { latestCommitMsg }),
    mrkdwn: true,
    unfurl_links: false,
    unfurl_media: false
  })
}