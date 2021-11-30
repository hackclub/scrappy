import AirtablePlus from "airtable-plus"
import { PrismaClient } from "@prisma/client"

let prisma = new PrismaClient()

const airtable = new AirtablePlus({
  baseID: 'appRxhF9qVMLbxAXR',
  apiKey: process.env.AIRTABLE_KEY,
  tableName: 'Slack Accounts'
})

;(async () => {
  console.log('running!')
  const read = await airtable.read()
  console.log('read!')
  const createMany = await prisma.accounts.createMany({
    data: read.map((x) => ({
      slackID: x.fields['ID'],
      username: x.fields['Username'] ?x.fields['Username'] :  x.fields['ID'],
      streakCount: x.fields['Streak Count'] ? x.fields['Streak Count'] : 0,
      maxStreaks: x.fields['Max Streaks'] ? x.fields['Max Streaks'] : 0,
      displayStreak: x.fields['Display Streak'] ? x.fields['Display Streak'] : true,
      streaksToggledOff: x.fields['Streaks Toggled Off'] ? x.fields['Streaks Toggled Off'] : false,
      customDomain: x.fields['Custom Domain'] ? x.fields['Custom Domain'] : null,
      cssURL: x.fields['CSS URL'] ? x.fields['CSS URL'] : null,
      website: x.fields['Website'] ?  x.fields['Website'] : null,
      github: x.fields['GitHub'] ? x.fields['GitHub'] : null,
      fullSlackMember: x.fields['Full Slack Member?'] ? x.fields['Full Slack Member?'] : false,
      avatar: x.fields['Avatar'] ? x.fields['Avatar'][0].url : 'https://cloud-pwcbafyg3-hack-club-bot.vercel.app/0mel.png',
      webring: x.fields['Webring Slack Usernames'] ? x.fields['Webring Slack Usernames'] : [],
      newMember: x.fields['New Member'] ? x.fields['New Member'] : true,
      timezoneOffset: x.fields['Timezone offset'] ? x.fields['Timezone offset'] : 0,
      timezone: x.fields['Timezone'] ? x.fields['Timezone'] : null,
      pronouns: x.fields['Pronouns'] ?  x.fields['Pronouns'] : null,
      customAudioURL: x.fields['Audio URL'] ? x.fields['Audio URL'] : null
    })),
    skipDuplicates: true
  })
  console.log('written!')
})()
