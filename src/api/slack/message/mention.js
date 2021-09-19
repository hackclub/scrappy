import { reply, t, unverifiedRequest } from '../../../lib/api-utils'

const wordList = [
  'dumb',
  'suck',
  'stupid',
  'trash',
  'trashy'
]

const cursesList = [
  'fuck',
  'bitch',
  'shit',
  'fudge',
  'crap',
  'crappy'
]

const messageContainsWord = (list, msg) => (
  list.some(word => msg.includes(word))
)
export default async (req, res) => {
  if (unverifiedRequest(req)) {
    return res.status(400).send('Unverified Slack request!')
  } else {
    res.sendStatus(200)
  }

  const { channel, ts, user, text, thread_ts } = req.body.event

  const containsWord = await messageContainsWord(wordList, text)
  const containsCurse = await messageContainsWord(cursesList, text)
  if (containsCurse) {  
    reply(channel, thread_ts || ts, t('messages.mentionCurse', {user}))
  } else if (containsWord) {
    reply(channel, thread_ts || ts, t('messages.mentionKeyword', {user}))
  } else {
    reply(channel, thread_ts || ts, t('messages.mention', {user}))
  }
}
