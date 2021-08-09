const AirtablePlus = require('airtable-plus')
const { PrismaClient } = require('@prisma/client')
require('dotenv').config()

let prisma = new PrismaClient()

const airtable = new AirtablePlus({
  baseID: 'appRxhF9qVMLbxAXR',
  apiKey: process.env.AIRTABLE_KEY,
  tableName: 'Updates'
})

;(async () => {
  console.log('running!')
  const read = await airtable.read()
  console.log('read!')
  const toMake = read.map((x) => ({
    accountsSlackID: x.fields['Poster ID']
      ? x.fields['Poster ID'][0]
      : 'U015B2729C3',
    postTime: new Date(x.fields['Post Time']),
    text: x.fields['Text'] ? x.fields['Text'] : null,
    attachments: x.fields['CDN Link'] ? x.fields['CDN Link'].split(',') : [],
    muxAssetIDs: x.fields['Mux Asset IDs']
      ? x.fields['Mux Asset IDs'].split(',')
      : [],
    muxPlaybackIDs: x.fields['Mux Playback IDs']
      ? x.fields['Mux Playback IDs'].split(',')
      : [],
    muxAssetStatuses: x.fields['Mux Asset Statuses']
      ? x.fields['Mux Asset Statuses']
      : null,
    messageTimestamp: x.fields['Message Timestamp']
      ? parseFloat(x.fields['Message Timestamp'])
      : 0,
    backupAssetID: x.fields['Backup Asset ID']
      ? x.fields['Backup Asset ID']
      : null,
    backupPlaybackID: x.fields['Backup Playback ID']
      ? x.fields['Backup Playback ID']
      : null,
    isLargeVideo: x.fields['Is Large Video']
      ? x.fields['Is Large Video']
      : false,
    channel: x.fields['Channel'] ? x.fields['Channel'] : 'C01504DCLVD'
  }))
  await Promise.all(
    toMake.map(async (update) => {
      try{
        await prisma.updates.create({
          data: update,
        })
      }
      catch(e){
        console.log(e)
        console.log(update)
      }   
    })
  )
  console.log('written!')
})()
