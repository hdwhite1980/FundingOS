import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  User, 
  Building, 
  FileText,
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react'

export default function MissingInfoCollector({ 
  analysisResult, 
  onInfoCollected, 
  onCancel,
  userProfile,
  projectData 
}) {
  const [collectedInfo, setCollectedInfo] = useState({})
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const questions = analysisResult?.questionsForUser || []
  const missingInfo = analysisResult?.missingInformation || {}
  const autoFillSuggestions = analysisResult?.autoFillSuggestions || {}

  // Categorize questions by priority
  const criticalQuestions = questions.filter(q => q.priority === 'critical')
  const importantQuestions = questions.filter(q => q.priority === 'important')
  const optionalQuestions = questions.filter(q => q.priority === 'optional')

  const handleAnswerChange = (questionIndex, answer) => {
    const question = questions[questionIndex]
    setCollectedInfo(prev => ({
      ...prev,
      [question.fieldName]: {
        question: question.question,
        answer,
        priority: question.priority
      }
    }))
  }

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    setIsSubmitting(true)
    
    try {
      // Combine collected info with auto-fill suggestions
      const completedData = {
        collectedInfo,
        autoFillSuggestions,
        analysisResult,
        completionTimestamp: new Date().toISOString()
      }
      
      onInfoCollected(completedData)
    } catch (error) {
      console.error('Error completing info collection:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'critical': return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'important': return <Clock className="w-4 h-4 text-amber-500" />
      case 'optional': return <Info className="w-4 h-4 text-blue-500" />
      default: return <Info className="w-4 h-4 text-slate-500" />
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'border-red-200 bg-red-50'
      case 'important': return 'border-amber-200 bg-amber-50'
      case 'optional': return 'border-blue-200 bg-blue-50'
      default: return 'border-slate-200 bg-slate-50'
    }
  }

  if (!questions.length) {
    return (
      <div className="text-center p-8">
        <Sparkles className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          Great! We have everything we need
        </h3>
        <p className="text-slate-600 mb-6">
          Your application can be auto-filled using your existing profile and project data.
        </p>
        <button
          onClick={handleComplete}
          className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Proceed with Auto-Fill
        </button>
      </div>
    )
  }

  const currentQuestion = questions[currentStep]

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              AI Application Assistant
            </h2>
            <p className="text-slate-600">
              Let's collect some additional information to complete your application
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 rounded-full h-2 mb-4">
          <div 
            className="bg-gradient-to-r from-emerald-500 to-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-sm text-slate-600">
          <span>Question {currentStep + 1} of {questions.length}</span>
          <span>{Math.round(((currentStep + 1) / questions.length) * 100)}% Complete</span>
        </div>
      </div>

      {/* Current Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className={`p-6 rounded-xl border-2 ${getPriorityColor(currentQuestion?.priority)} mb-6`}
        >
          <div className="flex items-start space-x-3 mb-4">
            {getPriorityIcon(currentQuestion?.priority)}
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="text-lg font-medium text-slate-900">
                  {currentQuestion?.question}
                </h3>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                This information is needed for: {currentQuestion?.fieldName}
              </p>
            </div>
          </div>

          {/* Answer Input */}
          <div className="space-y-4">
            {currentQuestion?.suggestedAnswers?.length > 0 ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select an option:
                </label>
                <div className="space-y-2">
                  {currentQuestion.suggestedAnswers.map((option, idx) => (
                    <label key={idx} className="flex items-center space-x-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <input
                        type="radio"
                        name={`question-${currentStep}`}
                        value={option}
                        onChange={(e) => handleAnswerChange(currentStep, e.target.value)}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-slate-900">{option}</span>
                    </label>
                  ))}
                </div>
                
                {/* Custom Answer Option */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Or provide a custom answer:
                  </label>
                  <textarea
                    placeholder="Enter your custom answer..."
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    rows="3"
                    onChange={(e) => handleAnswerChange(currentStep, e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Your answer:
                </label>
                <textarea
                  placeholder="Please provide your answer..."
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  rows="4"
                  onChange={(e) => handleAnswerChange(currentStep, e.target.value)}
                />
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={currentStep > 0 ? handlePrevious : onCancel}
          className="text-slate-600 hover:text-slate-900 px-4 py-2 font-medium"
        >
          {currentStep > 0 ? 'Previous' : 'Cancel'}
        </button>

        <div className="flex items-center space-x-4">
          {/* Skip if Optional */}
          {currentQuestion?.priority === 'optional' && (
            <button
              onClick={handleNext}
              className="text-slate-500 hover:text-slate-700 px-4 py-2 font-medium"
            >
              Skip
            </button>
          )}

          <button
            onClick={handleNext}
            disabled={!collectedInfo[currentQuestion?.fieldName]?.answer && currentQuestion?.priority === 'critical'}
            className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white px-6 py-2.5 rounded-lg hover:from-emerald-600 hover:to-blue-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <span>{currentStep === questions.length - 1 ? 'Complete' : 'Next'}</span>
            {!isSubmitting && <ChevronRight className="w-4 h-4" />}
            {isSubmitting && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
          </button>
        </div>
      </div>

      {/* Summary Sidebar */}
      <div className="mt-8 p-6 bg-slate-50 rounded-lg">
        <h4 className="font-medium text-slate-900 mb-4">Information Summary</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span>Critical Info</span>
            </span>
            <span className="font-medium">{criticalQuestions.length}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Important Info</span>
            </span>
            <span className="font-medium">{importantQuestions.length}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center space-x-2">
              <Info className="w-4 h-4 text-blue-500" />
              <span>Optional Info</span>
            </span>
            <span className="font-medium">{optionalQuestions.length}</span>
          </div>
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-sm">
            <span className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>Auto-Fill Ready</span>
            </span>
            <span className="font-medium">{Object.keys(autoFillSuggestions).length}</span>
          </div>
        </div>
      </div>
    </div>
  )
}