import { reply, t, unverifiedRequest } from "../../../../lib/api-utils"

const wordList = [
  'fuck',
  'dumb',
  'suck',
  'stupid',
  'crap',
  'crappy'
]

const messageContainsWord = (msg) => (
  wordList.some(word => msg.includes(word))
)

export default async (req, res) => {
  if (unverifiedRequest(req)) {
    return res.status(400).send('Unverified Slack request!')
  } else {
    res.status(200).end()
  }

  const { channel, ts, user, text, thread_ts } = req.body.event

  const containsWord = await messageContainsWord(text)
  if (containsWord) {
    reply(channel, thread_ts || ts, `<@${user}> ${t('messages.mentionKeyword')}`)
  } else {
    reply(channel, thread_ts || ts, t('messages.mention'))
  }
}
