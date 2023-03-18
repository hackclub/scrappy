export const displayStreaks = async (userId, streakCount) => {
  const userRecord = await getUserRecord(userId)
  const user = await fetch(
    `https://slack.com/api/users.profile.get?user=${userId}`, {
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`
      }
    }
  ).then((r) => r.json())

  if (!userRecord.streaksToggledOff) {
    if (streakCount == 0 || !userRecord.displayStreak) {
      setStatus(userId, '', '')
    } else {
      const statusText = 'day streak in #scrapbook'
      const statusEmoji = `:som-${streakCount > 7 ? '7+' : streakCount}:`
      setStatus(userId, statusText, statusEmoji)
    }
  }
}

export const shouldUpdateStreak = async (userId, increment) => {
  const userRecord = await getUserRecord(userId)
  const now = getNow(userRecord.timezone)
  const latestUpdates = await prisma.updates.findMany({
    orderBy: [
      {
        postTime: 'desc'
      }
    ],
    where: {
      accountsSlackID: userRecord.slackID
    }
  })
  const createdTime = increment
    ? latestUpdates[1]?.postTime
    : latestUpdates[0]?.postTime
  const nowDay = getDayFromISOString(now)
  const createdTimeDay = getDayFromISOString(createdTime)
  return (
    nowDay != createdTimeDay ||
    (increment ? !latestUpdates[1] : !latestUpdates[0])
  )
}