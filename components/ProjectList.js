'use client'
import { useState, useEffect } from 'react'
import { Building, MapPin, DollarSign, Calendar, ChevronRight, Target, Edit3, MoreVertical, Trash2 } from 'lucide-react'

export default function ProjectList({ projects, selectedProject, onProjectSelect, onProjectEdit, onProjectDelete }) {
  const [showActionsFor, setShowActionsFor] = useState(null)

  const handleActionClick = (e, projectId) => {
    e.preventDefault()
    e.stopPropagation()
    setShowActionsFor(showActionsFor === projectId ? null : projectId)
  }

  const handleEdit = (e, project) => {
    e.preventDefault()
    e.stopPropagation()
    setShowActionsFor(null)
    
    if (typeof onProjectEdit === 'function') {
      onProjectEdit(project)
    }
  }

  const handleDelete = (e, project) => {
    e.preventDefault()
    e.stopPropagation()
    setShowActionsFor(null)
    
    if (typeof onProjectDelete === 'function') {
      const confirmed = window.confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)
      
      if (confirmed) {
        onProjectDelete(project.id)
      }
    }
  }

  const handleProjectClick = (project) => {
    if (typeof onProjectSelect === 'function') {
      onProjectSelect(project)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showActionsFor) {
        setShowActionsFor(null)
      }
    }

    if (showActionsFor) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showActionsFor])

  if (projects.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <Target />
        </div>
        <h3 className="empty-state-title">No projects yet</h3>
        <p className="empty-state-description">
          Create your first project to start finding funding opportunities.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {projects.map((project, index) => (
        <div
          key={project.id}
          className={`
            group relative p-4 sm:p-5 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-md
            ${selectedProject?.id === project.id
              ? 'border-green-300 bg-green-50 shadow-sm ring-1 ring-green-200'
              : 'border-neutral-200 hover:border-green-300 hover:bg-green-25 bg-white'
            }
          `}
          onClick={() => handleProjectClick(project)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-3">
                <h3 className={`font-bold text-lg ${
                  selectedProject?.id === project.id ? 'text-green-900' : 'text-neutral-900'
                }`}>
                  {project.name}
                </h3>
                
                {/* Actions Menu */}
                <div className="flex items-center space-x-2 ml-4 relative flex-shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleActionClick(e, project.id)}
                    className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  
                  {/* Actions Dropdown */}
                  {showActionsFor === project.id && (
                    <div className="absolute right-0 top-10 z-50 bg-white rounded-xl shadow-xl border border-neutral-200 min-w-[140px] overflow-hidden">
                      <button
                        type="button"
                        onClick={(e) => handleEdit(e, project)}
                        className="w-full text-left px-4 py-3 text-sm text-neutral-700 hover:bg-green-50 hover:text-green-700 flex items-center transition-colors"
                      >
                        <Edit3 className="w-4 h-4 mr-3" />
                        Edit Project
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, project)}
                        className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors border-t border-neutral-100"
                      >
                        <Trash2 className="w-4 h-4 mr-3" />
                        Delete Project
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center text-neutral-600">
                  <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                  <span className="font-semibold">${project.funding_needed?.toLocaleString()}</span>
                </div>
                <div className="flex items-center px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  <Target className="w-3 h-3 mr-1" />
                  {project.project_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}