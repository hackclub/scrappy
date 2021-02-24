// This API route is pinged by a Zap every hour

import {
  accountsTable,
  updatesTable,
  getNow,
  setStatus,
  unverifiedRequest,
  timeout
} from '../../lib/api-utils'
import fetch from '../../src/lib/node_modules/node-fetch'

module.exports = async (req, res) => {
  res.status(200).end()
  const users = await accountsTable.read({
    filterByFormula: `{Streak Count} != 0`
  })
  users.forEach(async (user) => {
    await timeout(500)
    const userId = user.fields['ID']
    const timezone = user.fields['Timezone']
    const username = user.fields['Username']
    let now = new Date(getNow(timezone))
    now.setHours(now.getHours() - 4)

    const latestUpdate = await updatesTable.read({
      maxRecords: 1,
      sort: [{ field: 'Post Time', direction: 'desc' }],
      filterByFormula: `{Poster ID} = '${userId}'`
    })
    const createdTime = latestUpdate[0]?.fields['Post Time']
    const createdDate = new Date(createdTime).getDate()
    console.log(username, now.getDate(), new Date(createdTime).getDate())

    if (shouldReset(now, createdDate) && user.fields['Streak Count'] != 0) {
      console.log(
        `It's been more than a day since ${username} last posted. Resetting their streak...`
      )
      accountsTable.update(user.id, {
        'Streak Count': 0
      })
      if (user.fields['Display Streak']) {
        await setStatus(userId, '', '')
        await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`
          },
          body: JSON.stringify({
            channel: userId, //userId
            text: `<@${userId}> It's been more than 24 hours since you last posted a Scrapbook update, so I've reset your streak. No worries, though—post something else to start another streak! And the rest of your updates are still available at https://scrapbook.hackclub.com/${username} :)`
          })
        })
      }
    }
  })
}

const shouldReset = (now, createdDate) => {
  if (createdDate === 30 && (now.getDate() === 1 || now.getDate() === 2)) {
    return now.getDate() - createdDate > -29
  } else if (createdDate === 31 && (now.getDate() === 1 || now.getDate() === 2)) {
    return now.getDate() - createdDate > -30
  } else if (createdDate === 1 && (now.getDate() === 30 || now.getDate() === 31)) {
    return false
  } else {
    return now.getDate() - createdDate > 1
  }
}
