// pages/api/scrape/opportunity-details.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { url, opportunityId } = req.body

    if (!url) {
      return res.status(400).json({ message: 'URL is required' })
    }

    // Add headers to mimic a browser request
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const html = await response.text()

    // Extract detailed information from the HTML
    const extractedData = extractOpportunityDetails(html, url)

    res.status(200).json({
      success: true,
      data: extractedData
    })

  } catch (error) {
    console.error('Scraping error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch opportunity details',
      error: error.message
    })
  }
}

function extractOpportunityDetails(html, url) {
  const extractedData = {
    synopsis: '',
    eligibility: '',
    requirements: '',
    applicationProcess: '',
    fundingDetails: '',
    deadline: '',
    contactInfo: '',
    additionalInfo: ''
  }

  try {
    // Extract synopsis/description
    const synopsisPatterns = [
      /<div[^>]*class="[^"]*synopsis[^"]*"[^>]*>(.*?)<\/div>/is,
      /<div[^>]*class="[^"]*description[^"]*"[^>]*>(.*?)<\/div>/is,
      /<section[^>]*class="[^"]*opportunity-synopsis[^"]*"[^>]*>(.*?)<\/section>/is,
      /<p[^>]*class="[^"]*synopsis[^"]*"[^>]*>(.*?)<\/p>/is
    ]

    for (const pattern of synopsisPatterns) {
      const match = html.match(pattern)
      if (match) {
        extractedData.synopsis = cleanHtml(match[1])
        break
      }
    }

    // Extract eligibility information
    const eligibilityPatterns = [
      /<div[^>]*class="[^"]*eligibility[^"]*"[^>]*>(.*?)<\/div>/is,
      /<section[^>]*class="[^"]*eligibility[^"]*"[^>]*>(.*?)<\/section>/is,
      /<h[2-6][^>]*>.*?eligibility.*?<\/h[2-6]>(.*?)<(?:h[2-6]|div|section)/is
    ]

    for (const pattern of eligibilityPatterns) {
      const match = html.match(pattern)
      if (match) {
        extractedData.eligibility = cleanHtml(match[1])
        break
      }
    }

    // Extract requirements
    const requirementPatterns = [
      /<div[^>]*class="[^"]*requirements?[^"]*"[^>]*>(.*?)<\/div>/is,
      /<section[^>]*class="[^"]*requirements?[^"]*"[^>]*>(.*?)<\/section>/is,
      /<h[2-6][^>]*>.*?requirements?.*?<\/h[2-6]>(.*?)<(?:h[2-6]|div|section)/is
    ]

    for (const pattern of requirementPatterns) {
      const match = html.match(pattern)
      if (match) {
        extractedData.requirements = cleanHtml(match[1])
        break
      }
    }

    // Extract application process
    const processPatterns = [
      /<div[^>]*class="[^"]*application[^"]*"[^>]*>(.*?)<\/div>/is,
      /<section[^>]*class="[^"]*application[^"]*"[^>]*>(.*?)<\/section>/is,
      /<h[2-6][^>]*>.*?application.*?<\/h[2-6]>(.*?)<(?:h[2-6]|div|section)/is
    ]

    for (const pattern of processPatterns) {
      const match = html.match(pattern)
      if (match) {
        extractedData.applicationProcess = cleanHtml(match[1])
        break
      }
    }

    // Extract funding details
    const fundingPatterns = [
      /<div[^>]*class="[^"]*funding[^"]*"[^>]*>(.*?)<\/div>/is,
      /<section[^>]*class="[^"]*funding[^"]*"[^>]*>(.*?)<\/section>/is,
      /<div[^>]*class="[^"]*award[^"]*"[^>]*>(.*?)<\/div>/is,
      /\$[\d,]+ ?(?:to|-)? ?\$?[\d,]+/g
    ]

    for (const pattern of fundingPatterns) {
      const match = html.match(pattern)
      if (match) {
        extractedData.fundingDetails = cleanHtml(match[1] || match[0])
        break
      }
    }

    // Extract deadline information
    const deadlinePatterns = [
      /<div[^>]*class="[^"]*deadline[^"]*"[^>]*>(.*?)<\/div>/is,
      /<div[^>]*class="[^"]*due[^"]*"[^>]*>(.*?)<\/div>/is,
      /(?:due|deadline|closes?)[^:]*:?\s*([^<\n]{10,50})/i,
      /\d{1,2}\/\d{1,2}\/\d{4}/g
    ]

    for (const pattern of deadlinePatterns) {
      const match = html.match(pattern)
      if (match) {
        extractedData.deadline = cleanHtml(match[1] || match[0])
        break
      }
    }

    // Extract contact information
    const contactPatterns = [
      /<div[^>]*class="[^"]*contact[^"]*"[^>]*>(.*?)<\/div>/is,
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g
    ]

    for (const pattern of contactPatterns) {
      const matches = html.match(pattern)
      if (matches) {
        extractedData.contactInfo = Array.isArray(matches) ? matches.join(', ') : cleanHtml(matches[1] || matches[0])
        break
      }
    }

    // Extract any additional important information
    const additionalPatterns = [
      /<div[^>]*class="[^"]*additional[^"]*"[^>]*>(.*?)<\/div>/is,
      /<div[^>]*class="[^"]*notes?[^"]*"[^>]*>(.*?)<\/div>/is,
      /<div[^>]*class="[^"]*important[^"]*"[^>]*>(.*?)<\/div>/is
    ]

    for (const pattern of additionalPatterns) {
      const match = html.match(pattern)
      if (match) {
        extractedData.additionalInfo = cleanHtml(match[1])
        break
      }
    }

  } catch (error) {
    console.error('Error extracting data:', error)
  }

  return extractedData
}

function cleanHtml(text) {
  if (!text) return ''
  
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove styles
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&') // Replace &amp; with &
    .replace(/&lt;/g, '<') // Replace &lt; with <
    .replace(/&gt;/g, '>') // Replace &gt; with >
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .replace(/&#x27;/g, "'") // Replace &#x27; with '
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim()
}

// Export the extraction function for use in other parts of the application
export { extractOpportunityDetails, cleanHtml }