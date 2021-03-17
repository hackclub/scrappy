import {
  sendCommandResponse,
  accountsTable,
  getUserRecord,
  t,
  unverifiedRequest
} from '@lib/api-utils'
import fetch from 'node-fetch'

export default async (req, res) => {
  if (unverifiedRequest(req)) {
    return res.status(400).send('Unverified Slack request!')
  }

  const command = req.body
  const args = command.text.split(' ')
  const arg = args[0] === 'setdomain' ? args[1] : args[0]
  if (!arg) {
    sendCommandResponse(command.response_url, t('messages.domain.noargs'))
  } else {
    const updates = await accountsTable.read({
      filterByFormula: `{Custom Domain} != ''`
    })
    const domainCount = updates.length

    if (domainCount > 50) {
      sendCommandResponse(command.response_url, t('messages.domain.overlimit'))
    } else {
      const user = await getUserRecord(command.user_id)
      if (user.fields['Custom Domain'] != null) {
        console.log('DOMAIN ALREADY SET')
        const prevDomain = user.fields['Custom Domain']
        await fetch(
          `https://api.vercel.com/v1/projects/QmbACrEv2xvaVA3J5GWKzfQ5tYSiHTVX2DqTYfcAxRzvHj/alias?domain=${prevDomain}&teamId=team_gUyibHqOWrQfv3PDfEUpB45J`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${process.env.VC_SCRAPBOOK_TOKEN}`
            }
          }
        )
      }
      await accountsTable.update(user.id, {
        'Custom Domain': arg
      })

      const vercelFetch = await fetch(
        `https://api.vercel.com/v1/projects/QmbACrEv2xvaVA3J5GWKzfQ5tYSiHTVX2DqTYfcAxRzvHj/alias?teamId=team_gUyibHqOWrQfv3PDfEUpB45J`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.VC_SCRAPBOOK_TOKEN}`
          },
          body: JSON.stringify({
            domain: arg
          })
        }
      )
        .then((r) => r.json())
        .catch((err) => {
          console.log(`Error while setting custom domain ${arg}: ${err}`)
        })
      console.log(vercelFetch)
      if (vercelFetch.error) {
        sendCommandResponse(
          command.response_url,
          t('messages.domain.domainexists', { text: arg })
        )
      } else {
        const domainsLeft = 50 - domainCount
        sendCommandResponse(
          command.response_url,
          t('messages.domain.domainset', { text: arg, domainsLeft })
        )
      }
    }
  }

  res.status(200).end()
}
