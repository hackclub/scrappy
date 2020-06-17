import { accountsTable, updatesTable, displayStreaks } from '../../../lib/api-utils'

export default async (req, res) => {
  res.status(200).end()

  const users = await accountsTable.read()
  console.log(Date.now())
  users.forEach(async (user) => {
    const userId = user.fields['ID']
    const tzOffset = user.fields['Timezone offset'] * 1000
    const username = user.fields['Username']
    const localTime = tzOffset + Date.now()
    const timeString = new Date(localTime).toUTCString()

    //console.log(username, timeString)
    if (timeString.split(' ')[4].includes('00:')) {
      const latestUpdate = await updatesTable.read({
        maxRecords: 1,
        sort: [{ field: 'Post Time', direction: 'desc' }],
        filterByFormula: `FIND('${username}', {ID}) > 0`
      })
      const createdTime = Date.parse(latestUpdate[0]?.fields['Post Time'])
      if (Date.now() - createdTime > 86400000) {
        console.log(`It's midnight for ${username} and it's been 48 hours since they last posted. Resetting their streak...`)
        accountsTable.update(user.id, {
          'Streak Count': 0
        })
        displayStreaks(userId, 0)
        fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
          },
          body: JSON.stringify({
            channel: userId,
            text: `It's been 48 hours since you last posted a Scrapbook update, so I've reset your streak. No worries, though—post something else to start another streak! And the rest of your updates are still available at https://scrapbook.hackclub.com/${username} :)`
          })
        })
        //console.log(username, latestUpdate[0].fields['Post Time'], new Date(Date.now()).toUTCString(), Date.now() - createdTime)
      }
    }
  })
}