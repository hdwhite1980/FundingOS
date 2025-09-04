'use client'
import { motion } from 'framer-motion'
import { Building, MapPin, DollarSign, Calendar, ChevronRight } from 'lucide-react'

export default function ProjectList({ projects, selectedProject, onProjectSelect }) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-8">
        <Building className="mx-auto h-12 w-12 text-gray-300" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No projects yet</h3>
        <p className="mt-1 text-sm text-gray-500">
          Create your first project to start finding funding opportunities.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {projects.map((project, index) => (
        <motion.div
          key={project.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          onClick={() => onProjectSelect(project)}
          className={`
            p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
            ${selectedProject?.id === project.id
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-blue-300 hover:bg-blue-25'
            }
          `}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className={`
                font-medium text-sm mb-2 
                ${selectedProject?.id === project.id ? 'text-blue-900' : 'text-gray-900'}
              `}>
                {project.name}
              </h3>
              
              <div className="space-y-1">
                <div className="flex items-center text-xs text-gray-600">
                  <MapPin className="w-3 h-3 mr-1" />
                  {project.location}
                </div>
                
                <div className="flex items-center text-xs text-gray-600">
                  <DollarSign className="w-3 h-3 mr-1" />
                  ${project.funding_needed?.toLocaleString()}
                </div>
                
                {project.timeline && (
                  <div className="flex items-center text-xs text-gray-600">
                    <Calendar className="w-3 h-3 mr-1" />
                    {project.timeline}
                  </div>
                )}
              </div>

              <div className="mt-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                  {project.project_type?.replace('_', ' ')}
                </span>
              </div>
            </div>
            
            <ChevronRight className={`
              w-4 h-4 transition-colors
              ${selectedProject?.id === project.id ? 'text-blue-600' : 'text-gray-400'}
            `} />
          </div>
        </motion.div>
      ))}
    </div>
  )
}