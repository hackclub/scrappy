export const getRawUsers = () =>
  fetch(
    'https://airbridge.hackclub.com/v0.1/Summer%20of%20Making%20Streaks/Slack%20Accounts'
  ).then(r => r.json())

export const transformUser = (user = {}) => ({
  id: user?.id,
  username: user?.fields['Username'] || null,
  avatar: user?.fields['Avatar']?.[0]?.thumbnails?.large?.url || null,
  css: user?.fields['CSS URL'] || null,
  streakDisplay: user?.fields['Display Streak'] || false,
  streakCount: user?.fields['Streak Count'] || 1,
  github: user?.fields['GitHub'] || null,
  website: user?.fields['Website'] || null
})

export const getProfiles = () =>
  getRawUsers().then(users => users.map(transformUser))

export default async (req, res) => getProfiles().then(u => res.json(u || []))
