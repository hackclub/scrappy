import { t } from '../lib/api-utils'

module.exports = async (req, res) => {
  res.json({ ping: t('ping') })
}
