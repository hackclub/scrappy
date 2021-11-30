import { t } from '../lib/api-utils.js'

export default async (req, res) => {
  res.json({ ping: t('ping') })
}
