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
      <div className="text-center py-6">
        <div className="mx-auto w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center mb-4">
          <Target className="w-6 h-6 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No projects yet</h3>
        <p className="text-sm text-slate-600">
          Create your first project to start finding funding opportunities.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {projects.map((project, index) => (
        <div
          key={project.id}
          className={`
            group relative p-6 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-md
            ${selectedProject?.id === project.id
              ? 'border-emerald-300 bg-emerald-50 shadow-sm ring-2 ring-emerald-100'
              : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50 bg-white'
            }
          `}
          onClick={() => handleProjectClick(project)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-4">
                <h3 className={`text-lg font-semibold ${
                  selectedProject?.id === project.id ? 'text-emerald-900' : 'text-slate-900'
                }`}>
                  {project.name}
                </h3>
                
                {/* Actions Menu */}
                <div className="flex items-center space-x-2 ml-4 relative flex-shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleActionClick(e, project.id)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-md transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  
                  {/* Actions Dropdown */}
                  {showActionsFor === project.id && (
                    <div className="absolute right-0 top-10 z-50 bg-white rounded-lg shadow-xl border border-slate-200 min-w-[140px] overflow-hidden">
                      <button
                        type="button"
                        onClick={(e) => handleEdit(e, project)}
                        className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center"
                      >
                        <Edit3 className="w-4 h-4 mr-3" />
                        Edit Project
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, project)}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors border-t border-slate-100"
                      >
                        <Trash2 className="w-4 h-4 mr-3" />
                        Delete Project
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Project Details */}
              <div className="space-y-3">
                {/* Funding Amount */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-slate-600">
                    <DollarSign className="w-4 h-4 mr-2 text-emerald-600" />
                    <span className="text-sm font-medium">
                      ${project.funding_needed?.toLocaleString() || '0'} needed
                    </span>
                  </div>
                  
                  {/* Project Type Badge */}
                  {project.project_type && (
                    <div className="inline-flex items-center px-2.5 py-1 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md text-xs font-medium">
                      <Target className="w-3 h-3 mr-1" />
                      {project.project_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                  )}
                </div>

                {/* Project Description */}
                {project.description && (
                  <p className="text-sm text-slate-600 line-clamp-2">
                    {project.description}
                  </p>
                )}

                {/* Additional Details */}
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center space-x-4">
                    {project.location && (
                      <div className="flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        <span>{project.location}</span>
                      </div>
                    )}
                    {project.created_at && (
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Selection Indicator */}
                  {selectedProject?.id === project.id && (
                    <div className="flex items-center text-emerald-600">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}