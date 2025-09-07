import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Verifies if a user is a valid angel investor
 * @param {string} userId - The user's ID
 * @returns {Object} Angel investor data
 * @throws {Error} If investor not found or not accredited
 */
export async function verifyAngelInvestor(userId) {
  if (!userId) {
    throw new Error('User ID is required')
  }

  const { data: investor, error } = await supabase
    .from('angel_investors')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !investor) {
    throw new Error('Angel investor profile not found')
  }

  return investor
}

/**
 * Checks if an investor meets accreditation requirements
 * @param {string} userId - The user's ID
 * @returns {boolean} Whether the investor is accredited
 */
export async function checkAccreditation(userId) {
  try {
    const investor = await verifyAngelInvestor(userId)
    return investor.accredited_status === true
  } catch (error) {
    return false
  }
}

/**
 * Middleware to protect angel investor routes
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
export async function requireAngelInvestor(req, res, next) {
  try {
    const userId = req.query.userId || req.body.userId
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const investor = await verifyAngelInvestor(userId)
    
    // Add investor data to request for use in handlers
    req.investor = investor
    
    next()
  } catch (error) {
    return res.status(403).json({ error: error.message })
  }
}

/**
 * Middleware to require accredited investor status
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
export async function requireAccreditedInvestor(req, res, next) {
  try {
    await requireAngelInvestor(req, res, () => {})
    
    if (!req.investor.accredited_status) {
      return res.status(403).json({ 
        error: 'Accredited investor status required for this action' 
      })
    }
    
    next()
  } catch (error) {
    return res.status(403).json({ error: error.message })
  }
}

/**
 * Creates or updates an angel investor profile
 * @param {string} userId - The user's ID
 * @param {Object} profileData - Investor profile data
 * @returns {Object} Created or updated investor profile
 */
export async function createOrUpdateInvestorProfile(userId, profileData) {
  const { data: existingInvestor } = await supabase
    .from('angel_investors')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (existingInvestor) {
    // Update existing profile
    const { data: updatedInvestor, error } = await supabase
      .from('angel_investors')
      .update({
        ...profileData,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return updatedInvestor
  } else {
    // Create new profile
    const { data: newInvestor, error } = await supabase
      .from('angel_investors')
      .insert({
        user_id: userId,
        ...profileData
      })
      .select()
      .single()

    if (error) throw error
    return newInvestor
  }
}

/**
 * Validates investment limits based on investor accreditation
 * @param {Object} investor - Investor data
 * @param {number} investmentAmount - Proposed investment amount
 * @returns {boolean} Whether investment is allowed
 */
export function validateInvestmentLimits(investor, investmentAmount) {
  // Non-accredited investors have regulatory limits
  if (!investor.accredited_status) {
    const maxAnnualInvestment = 100000 // Example limit
    const currentYearInvestments = 0 // You'd calculate this from the database
    
    if (currentYearInvestments + investmentAmount > maxAnnualInvestment) {
      throw new Error(`Investment would exceed annual limit of $${maxAnnualInvestment.toLocaleString()}`)
    }
  }
  
  return true
}

/**
 * Logs investment activity for compliance and analytics
 * @param {string} investorId - Investor ID
 * @param {string} action - Action type (invest, withdraw, etc.)
 * @param {Object} metadata - Additional data
 */
export async function logInvestorActivity(investorId, action, metadata = {}) {
  try {
    await supabase
      .from('investor_activity_log')
      .insert({
        investor_id: investorId,
        action,
        metadata,
        timestamp: new Date().toISOString()
      })
  } catch (error) {
    console.error('Failed to log investor activity:', error)
    // Don't throw error as logging shouldn't break the main flow
  }
}