'use client'
import { Building, MapPin, DollarSign, Calendar, ChevronRight, Target } from 'lucide-react'

export default function ProjectList({ projects, selectedProject, onProjectSelect }) {
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
          onClick={() => onProjectSelect(project)}
          className={`
            group p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 animate-fade-in
            ${selectedProject?.id === project.id
              ? 'border-pink-300 bg-gradient-to-r from-pink-50 to-purple-50 shadow-md'
              : 'border-slate-200 hover:border-pink-300 hover:bg-gradient-to-r hover:from-pink-25 hover:to-purple-25 hover:shadow-sm'
            }
          `}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${
                  selectedProject?.id === project.id ? 'bg-pink-500' : 'bg-slate-300 group-hover:bg-pink-400'
                }`}></div>
                <h3 className={`font-medium text-sm truncate ${
                  selectedProject?.id === project.id ? 'text-pink-900' : 'text-slate-900'
                }`}>
                  {project.name}
                </h3>
              </div>
              
              <div className="space-y-1.5">
                <div className="flex items-center text-xs text-slate-600">
                  <MapPin className="w-3 h-3 mr-1.5 flex-shrink-0" />
                  <span className="truncate">{project.location}</span>
                </div>
                
                <div className="flex items-center text-xs text-slate-600">
                  <DollarSign className="w-3 h-3 mr-1.5 flex-shrink-0" />
                  <span>${project.funding_needed?.toLocaleString()}</span>
                </div>
                
                {project.timeline && (
                  <div className="flex items-center text-xs text-slate-600">
                    <Calendar className="w-3 h-3 mr-1.5 flex-shrink-0" />
                    <span className="truncate">{project.timeline}</span>
                  </div>
                )}
              </div>

              <div className="mt-3">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${
                  selectedProject?.id === project.id 
                    ? 'bg-pink-100 text-pink-800 border border-pink-200' 
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  {project.project_type?.replace('_', ' ')}
                </span>
              </div>
            </div>
            
            <ChevronRight className={`w-4 h-4 transition-all duration-200 flex-shrink-0 ml-2 ${
              selectedProject?.id === project.id 
                ? 'text-pink-600 transform rotate-90' 
                : 'text-slate-400 group-hover:text-pink-500 group-hover:transform group-hover:translate-x-1'
            }`} />
          </div>

          {/* Progress indicator */}
          <div className="mt-3 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                selectedProject?.id === project.id
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500'
                  : 'bg-slate-300 group-hover:bg-gradient-to-r group-hover:from-pink-400 group-hover:to-purple-400'
              }`}
              style={{ width: '45%' }} // This could be dynamic based on project progress
            ></div>
          </div>
        </div>
      ))}
    </div>
  )
}