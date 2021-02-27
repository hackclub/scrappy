import { t } from '../../lib/api-utils'

export default async (req, res) => {
  res.json({ ping: t('ping') })
}
