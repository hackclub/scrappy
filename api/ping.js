const { t } = require('../lib/api-utils')

module.exports = async (req, res) => {
  res.json({ ping: t('ping') })
}
