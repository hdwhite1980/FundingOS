import { useState, useEffect, useCallback } from 'react'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'

export function useAngelInvestor() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const supabase = useSupabaseClient()
  const user = useUser()

  const fetchDashboardData = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/angel/dashboard?userId=${user.id}`)
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error)
      }
      
      setData(result)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const makeInvestment = async (companyId, amount) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/angel/invest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          companyId,
          investmentAmount: amount
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error)
      }

      // Refresh dashboard data
      await fetchDashboardData()
      
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const searchOpportunities = async (filters) => {
    try {
      const params = new URLSearchParams(filters)
      const response = await fetch(`/api/angel/opportunities?${params}`)
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error)
      }
      
      return result.opportunities
    } catch (err) {
      setError(err.message)
      return []
    }
  }

  const updateInvestorProfile = async (updateData) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/angel/dashboard', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          ...updateData
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error)
      }

      // Update local data
      setData(prev => ({
        ...prev,
        investor: result.investor
      }))
      
      return result.investor
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const getPortfolioStats = () => {
    if (!data?.portfolio) return null

    const portfolio = data.portfolio
    const totalInvested = portfolio.reduce((sum, inv) => sum + (inv.investment_amount || 0), 0)
    const totalValue = portfolio.reduce((sum, inv) => sum + (inv.current_value || 0), 0)
    const totalROI = totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0

    return {
      totalInvested,
      totalValue,
      totalROI,
      activeInvestments: portfolio.filter(inv => inv.status === 'active').length,
      bestPerformer: portfolio.reduce((best, inv) => 
        (inv.roi_percentage || 0) > (best?.roi_percentage || 0) ? inv : best, null),
      worstPerformer: portfolio.reduce((worst, inv) => 
        (inv.roi_percentage || 0) < (worst?.roi_percentage || 0) ? inv : worst, null)
    }
  }

  return {
    data,
    loading,
    error,
    makeInvestment,
    searchOpportunities,
    updateInvestorProfile,
    getPortfolioStats,
    refetch: fetchDashboardData
  }
}