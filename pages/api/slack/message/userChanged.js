import { getUserRecord, setStatus } from '../../../../lib/api-utils'

export default async (req, res) => {
  const user = req.body.event.user
  const statusEmoji = user.profile.status_emoji

  if (statusEmoji.includes('ghost-')) {
    const statusEmojiCount = statusEmoji.split('-')[1].split(':')[0]
    console.log('count', statusEmojiCount)
    const userRecord = await getUserRecord(user.id)
    console.log('user record count', userRecord.fields['Streak Count'])
    if (userRecord.fields['Streak Count'] !== statusEmojiCount) {
      setStatus(user.id, `I tried to cheat in Summer of Making because I'm a clown`, ':clown_face:')
    }
  }
}