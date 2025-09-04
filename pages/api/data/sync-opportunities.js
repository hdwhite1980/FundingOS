import { DataService } from '../../../lib/dataService'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  // Verify this is an authenticated admin request or scheduled job
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    const dataService = new DataService()
    const { source, filters = {} } = req.body

    console.log(`Starting data sync for source: ${source || 'all'}`)

    let results = []

    if (!source || source === 'federal') {
      console.log('Fetching federal opportunities...')
      
      // Fetch from multiple federal sources
      const federalSources = await Promise.allSettled([
        dataService.fetchGrantsGovOpportunities({
          ...filters,
          keyword: filters.keyword || 'community development housing infrastructure',
          limit: 100
        }),
        dataService.fetchSamGovListings({
          ...filters,
          keyword: filters.keyword || 'community development',
          limit: 100
        }),
        dataService.fetchSbirOpportunities({
          ...filters,
          limit: 50
        })
      ])

      federalSources.forEach((result, index) => {
        const sourceNames = ['Grants.gov', 'SAM.gov', 'SBIR.gov']
        if (result.status === 'fulfilled') {
          results.push(...result.value)
          console.log(`${sourceNames[index]}: ${result.value.length} opportunities`)
        } else {
          console.error(`${sourceNames[index]} failed:`, result.reason.message)
        }
      })
    }

    if (!source || source === 'notices') {
      console.log('Fetching federal register notices...')
      
      try {
        const notices = await dataService.fetchFederalRegisterNotices({
          ...filters,
          keyword: filters.keyword || 'grant funding opportunity',
          limit: 50
        })
        results.push(...notices)
        console.log(`Federal Register: ${notices.length} notices`)
      } catch (error) {
        console.error('Federal Register failed:', error.message)
      }
    }

    // Store all opportunities in database
    if (results.length > 0) {
      console.log(`Storing ${results.length} opportunities in database...`)
      await dataService.storeOpportunities(results)
    }

    console.log(`Data sync completed. Total opportunities processed: ${results.length}`)

    res.status(200).json({
      success: true,
      message: `Successfully synced ${results.length} opportunities`,
      summary: {
        total: results.length,
        sources: [...new Set(results.map(r => r.source))],
        deadline_distribution: {
          fixed: results.filter(r => r.deadline_type === 'fixed').length,
          rolling: results.filter(r => r.deadline_type === 'rolling').length
        }
      }
    })

  } catch (error) {
    console.error('Data sync error:', error)
    res.status(500).json({
      success: false,
      message: 'Data sync failed',
      error: error.message
    })
  }
}