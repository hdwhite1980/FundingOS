const { SBABusinessGuideIntegrator } = require('../services/sbaBusinessGuideIntegration')

;(async () => {
  const sba = new SBABusinessGuideIntegrator()
  const sectionPath = '/fund-your-business/explore-funding-options'
  const result = await sba.scrapeSBASection(sectionPath, 'Explore Funding Options')
  console.log('Items:', result.length)
  console.log(result.slice(0, 2))

  const programs = await sba.extractSBAFundingPrograms()
  console.log('Programs found:', programs.length)
  console.log(programs.slice(0, 3).map(p => p.name))
})().catch(err => { console.error(err); process.exit(1) })
