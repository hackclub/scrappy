import {
  sendCommandResponse,
  accountsTable,
  getUserRecord,
  t
} from '../../../../lib/api-utils'

export default async (req, res) => {
  const command = req.body
  if (command.text === '') {
    sendCommandResponse(
      command.response_url,
      t('messages.domain.noargs')
    )
  } else {
    const user = await getUserRecord(command.user_id)
    await accountsTable.update(user.id, {
      'Custom Domain': command.text
    })

    const updates = await accountsTable.read({
      filterByFormula: `{Custom Domain} != ''`
    })
    const domainCount = updates.length

    if (domainCount > 50) {
      sendCommandResponse(
        command.response_url,
        t('messages.domain.overlimit')
      )
    }
    else {
      const vercelFetch = await fetch(
        `https://api.vercel.com/v1/projects/QmbACrEv2xvaVA3J5GWKzfQ5tYSiHTVX2DqTYfcAxRzvHj/alias?teamId=team_gUyibHqOWrQfv3PDfEUpB45J`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.VC_SCRAPBOOK_TOKEN}`
          },
          body: JSON.stringify({
            domain: command.text
          })
        }
      )
        .then(r => r.json())
        .catch(err => {
          console.log(`Error while setting custom domain ${command.text}: ${err}`)
        })
      console.log(vercelFetch)
      if (vercelFetch.error) {
        const text = command.text
        sendCommandResponse(
          command.response_url,
          t('messages.domain.domainexists', { text })
        )
      }
      else {
        const domainsLeft = 50 - domainCount
        sendCommandResponse(
          command.response_url,
          t('messages.domain.domainset', { text: command.text, domainsLeft })
        )
      }
    }
  }

  res.status(200).end()
}
