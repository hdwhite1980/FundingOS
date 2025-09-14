// components/EnhancedUnifiedAIAgentInterface.js
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

const EnhancedUnifiedAIAgentInterface = () => {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState('stopped');
  const [position, setPosition] = useState({ x: 300, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const messagesEndRef = useRef(null);
  const interfaceRef = useRef(null);

  // Initialize agent when component mounts
  useEffect(() => {
    if (user?.id) {
      initializeAgent();
      loadNotifications();
      // Show the assistant after a short delay
      setTimeout(() => setIsVisible(true), 1000);
    }
  }, [user]);

  // Set proper initial position (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPosition({ x: window.innerWidth - 320, y: 100 });
    }
  }, []);

  // Auto-scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + Shift + A to toggle assistant
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setIsExpanded(!isExpanded);
      }
      // Escape to close
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  const initializeAgent = async () => {
    try {
      const response = await fetch('/api/ai/unified-agent/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      const data = await response.json();
      if (data.success) {
        setAgentStatus('running');
        setMessages([{
          role: 'assistant',
          content: "👋 Hi! I'm your AI assistant. I can help you find funding opportunities, generate applications, and manage compliance. How can I help you today?",
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Failed to initialize agent:', error);
      setAgentStatus('error');
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await fetch(`/api/ai/agent-notifications?userId=${user.id}`);
      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = { role: 'user', content: inputMessage, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/unified-agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          message: inputMessage,
          context: { 
            currentPage: typeof window !== 'undefined' ? window.location.pathname : '/',
            timestamp: new Date().toISOString()
          }
        })
      });

      const data = await response.json();
      
      if (data.success) {
        const assistantMessage = {
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
          metadata: data.metadata
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = {
        role: 'assistant',
        content: "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment.",
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Dragging functionality
  const handleMouseDown = (e) => {
    if (e.target.closest('.drag-handle')) {
      setIsDragging(true);
      const rect = interfaceRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && typeof window !== 'undefined') {
      const newX = Math.max(0, Math.min(window.innerWidth - 320, e.clientX - dragOffset.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 400, e.clientY - dragOffset.y));
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  const getStatusColor = () => {
    switch (agentStatus) {
      case 'running': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'starting': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getClippyAnimation = () => {
    if (isLoading) return 'animate-bounce';
    if (notifications.length > 0) return 'animate-pulse';
    return '';
  };

  const formatMessage = (message) => {
    if (!message.content) return '';
    
    // Simple markdown-like formatting
    return message.content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>');
  };

  if (!isVisible || !user) return null;

  return (
    <div 
      ref={interfaceRef}
      className={`fixed z-50 transition-all duration-300 ${isDragging ? 'cursor-move' : ''}`}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onMouseDown={handleMouseDown}
    >
      {/* Minimized State - Clippy-style floating assistant */}
      {!isExpanded && (
        <div 
          className={`relative cursor-pointer transform transition-all duration-300 hover:scale-110 ${getClippyAnimation()}`}
          onClick={() => setIsExpanded(true)}
          title="Click to open AI Assistant (Ctrl+Shift+A)"
        >
          {/* Main Clippy Character */}
          <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full shadow-lg border-4 border-white flex items-center justify-center">
            <div className="text-white text-2xl">🤖</div>
          </div>
          
          {/* Status Indicator */}
          <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${getStatusColor()} border-2 border-white`} />
          
          {/* Notification Badge */}
          {notifications.length > 0 && (
            <div className="absolute -top-2 -left-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold animate-pulse">
              {notifications.length}
            </div>
          )}
          
          {/* Speech Bubble */}
          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-white rounded-lg px-3 py-1 shadow-lg border opacity-0 hover:opacity-100 transition-opacity duration-200">
            <div className="text-sm text-gray-700">Hi! Need help? 👋</div>
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white"></div>
          </div>
        </div>
      )}

      {/* Expanded State - Full Chat Interface */}
      {isExpanded && (
        <div className="bg-white rounded-lg shadow-2xl border w-80 h-96 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="drag-handle bg-gradient-to-r from-blue-500 to-purple-600 text-white p-3 cursor-move">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="text-lg">🤖</div>
                <div>
                  <div className="font-semibold">AI Assistant</div>
                  <div className="text-xs opacity-75 capitalize">{agentStatus}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Notifications Button */}
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-1 hover:bg-white hover:bg-opacity-20 rounded"
                  title="Notifications"
                >
                  🔔
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center">
                      {notifications.length}
                    </span>
                  )}
                </button>
                
                {/* Minimize Button */}
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
                  title="Minimize"
                >
                  ➖
                </button>
              </div>
            </div>
          </div>

          {/* Notifications Panel */}
          {showNotifications && (
            <div className="bg-yellow-50 border-b max-h-32 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.slice(0, 3).map((notification, index) => (
                  <div key={index} className="p-2 border-b border-yellow-200 text-sm">
                    <div className="font-medium text-yellow-800">{notification.title}</div>
                    <div className="text-yellow-700 text-xs">{notification.message}</div>
                  </div>
                ))
              ) : (
                <div className="p-2 text-sm text-gray-500">No notifications</div>
              )}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs rounded-lg p-2 ${
                  message.role === 'user' 
                    ? 'bg-blue-500 text-white' 
                    : message.isError 
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : 'bg-gray-100 text-gray-800'
                }`}>
                  <div 
                    className="text-sm"
                    dangerouslySetInnerHTML={{ __html: formatMessage(message) }}
                  />
                  <div className="text-xs opacity-75 mt-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-3">
            <div className="flex space-x-2">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me about funding, applications, compliance..."
                className="flex-1 resize-none border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="1"
                disabled={isLoading || agentStatus !== 'running'}
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading || agentStatus !== 'running'}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                Send
              </button>
            </div>
            
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-1 mt-2">
              {[
                'Find opportunities',
                'Check compliance',
                'Generate application',
                'Help'
              ].map((action) => (
                <button
                  key={action}
                  onClick={() => setInputMessage(action)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-700"
                  disabled={isLoading}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Global Styles for Dragging */}
      <style jsx>{`
        .drag-handle {
          user-select: none;
        }
      `}</style>
    </div>
  );
};

export default EnhancedUnifiedAIAgentInterface;