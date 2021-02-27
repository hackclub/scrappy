import { updatesTable, reply, t } from '../lib/api-utils'

// Only runs when a user uploads a large video, to notify them when Mux processes the video
export default async (req, res) => {
  console.log(req.body)
  if (req.body.type === 'video.asset.ready') {
    const assetId = req.body.object.id
    const videoUpdate = (
      await updatesTable.read({
        maxRecords: 1,
        filterByFormula: `FIND('${assetId}', {Mux Asset IDs}) > 0`
      })
    )[0]
    const largeVideo = videoUpdate.fields['Is Large Video']
    if (largeVideo) {
      const ts = videoUpdate.fields['Message Timestamp']
      const user = videoUpdate.fields['Poster ID']
      reply(process.env.CHANNEL, ts, t('messages.assetReady', { user }))
    }
  }
  res.status(200).end()
}
