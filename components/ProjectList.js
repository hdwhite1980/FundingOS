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
    <div className="space-y-2">
      {projects.map((project, index) => (
        <div
          key={project.id}
          className={`
            group relative p-3 rounded-lg border cursor-pointer transition-all duration-200
            ${selectedProject?.id === project.id
              ? 'border-blue-300 bg-blue-50 shadow-sm'
              : 'border-neutral-200 hover:border-blue-300 hover:bg-blue-25 hover:shadow-sm'
            }
          `}
          onClick={() => handleProjectClick(project)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className={`font-semibold text-sm truncate ${
                  selectedProject?.id === project.id ? 'text-blue-900' : 'text-neutral-900'
                }`}>
                  {project.name}
                </h3>
                
                {/* Actions Menu */}
                <div className="flex items-center space-x-1 ml-2 relative">
                  <button
                    type="button"
                    onClick={(e) => handleActionClick(e, project.id)}
                    className="p-1 text-neutral-400 hover:text-neutral-600 rounded transition-colors"
                  >
                    <MoreVertical className="w-3 h-3" />
                  </button>
                  
                  {/* Actions Dropdown */}
                  {showActionsFor === project.id && (
                    <div className="absolute right-0 top-6 z-50 bg-white rounded-lg shadow-lg border border-neutral-200 min-w-[120px]">
                      <button
                        type="button"
                        onClick={(e) => handleEdit(e, project)}
                        className="w-full text-left px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 flex items-center"
                      >
                        <Edit3 className="w-3 h-3 mr-2" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, project)}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                      >
                        <Trash2 className="w-3 h-3 mr-2" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span className="flex items-center">
                  <DollarSign className="w-3 h-3 mr-1" />
                  ${project.funding_needed?.toLocaleString()}
                </span>
                <span className="capitalize text-xs px-2 py-0.5 bg-neutral-100 rounded-md">
                  {project.project_type?.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}