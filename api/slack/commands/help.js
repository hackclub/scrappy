import { sendCommandResponse, t } from '../../../lib/api-utils'

module.exports = async (req, res) => {
  const command = req.body
  console.log(command)

  await sendCommandResponse(command.response_url, t('messages.help'))
}
