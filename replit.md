# Overview

WALI-OS (powered by AHTS) is a comprehensive AI-powered funding management platform designed to help organizations, nonprofits, and businesses discover, apply for, and manage various funding opportunities. The platform provides intelligent opportunity discovery, smart application generation, project management, and multi-source funding support including grants, angel investments, crowdfunding, and direct donations.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework**: Next.js 14 with App Router architecture
- **Styling**: Tailwind CSS with custom design system using emerald/amber color palette
- **State Management**: React Context API for authentication and user state
- **UI Components**: Custom component library with consistent design patterns
- **Animations**: Framer Motion for smooth interactions and transitions
- **Authentication UI**: Supabase Auth Helpers for seamless user management

## Backend Architecture

**API Structure**: Next.js API routes with hybrid AI provider system
- **Database**: Supabase PostgreSQL with real-time subscriptions
- **Authentication**: Supabase Auth with role-based access control
- **File Storage**: Supabase Storage for document uploads and analysis
- **AI Processing**: Hybrid system routing between OpenAI and Anthropic models based on task complexity

## Data Storage Solutions

**Primary Database**: Supabase PostgreSQL with comprehensive schema
- **User Profiles**: Enhanced with 36+ fields for onboarding and organization details
- **Projects**: Extended with 35+ fields for comprehensive project creation
- **Dynamic Form Structures**: JSON storage for AI-extracted form templates
- **Document Analysis**: JSONB fields for AI-powered document insights
- **Real-time Features**: Supabase subscriptions for live data updates

## Authentication and Authorization

**Multi-Role System**: Support for companies, angel investors, grant writers, and nonprofit organizations
- **Supabase Auth**: Email/password authentication with user metadata
- **Profile Management**: Automatic profile creation with role-based onboarding flows
- **Session Management**: Persistent sessions with automatic token refresh
- **Access Control**: Role-based UI rendering and API endpoint protection

## AI Integration Architecture

**Hybrid AI Provider System**: Strategic routing between multiple AI providers
- **OpenAI Integration**: GPT-4 for complex analysis and document processing
- **Anthropic Integration**: Claude models for enhanced reasoning tasks
- **Smart Routing**: Automatic provider selection based on task requirements
- **Fallback Mechanisms**: Error handling and provider switching for reliability
- **Token Management**: Optimized prompts to stay within model limits

## Key Architectural Patterns

**Component-Based Design**: Modular React components with consistent interfaces
- **Modal System**: Reusable modal shells with standardized behaviors
- **Form Management**: Multi-step forms with validation and state persistence
- **Data Services**: Centralized service layer for database operations
- **Error Handling**: Comprehensive error boundaries and user feedback

**Document Processing Pipeline**: AI-powered document analysis and form extraction
- **Upload Processing**: Multi-format document support (PDF, Word, Excel, Text)
- **Dynamic Form Analysis**: AI extraction of form fields and requirements
- **Template Generation**: Automatic application template creation from uploaded forms
- **Smart Completion**: AI-assisted form filling using project and organization data

**Opportunity Matching System**: Intelligent scoring and recommendation engine
- **Multi-Dimensional Scoring**: Project alignment, funding fit, and eligibility assessment
- **Enhanced Analytics**: Semantic analysis for better project-opportunity matching
- **Real-time Updates**: Live opportunity feeds from multiple sources (Grants.gov, SAM.gov)
- **Personalized Recommendations**: AI-driven opportunity suggestions based on user profile

# External Dependencies

## Core Infrastructure
- **Supabase**: Database, authentication, real-time subscriptions, and file storage
- **Vercel**: Hosting platform with serverless functions and edge optimization
- **Next.js**: React framework with App Router and API routes

## AI Services
- **OpenAI API**: GPT-4 models for document analysis and application generation
- **Anthropic API**: Claude models for enhanced scoring and strategic analysis

## Data Sources
- **Grants.gov**: Federal grant opportunities with automated synchronization
- **SAM.gov**: Government contracting opportunities and entity verification
- **Custom APIs**: Internal opportunity aggregation and analysis services

## Development Tools
- **React Hot Toast**: User notification system
- **Framer Motion**: Animation library for enhanced user experience
- **Lucide React**: Icon library for consistent visual elements
- **jsPDF**: Client-side PDF generation for applications and reports
- **html2canvas**: DOM-to-image conversion for document rendering

## Communication Services
- **Mailgun**: Email delivery service for notifications and communications
- **Form Data**: Multi-part form handling for file uploads

## Scheduled Operations
- **Vercel Cron**: Automated data synchronization and opportunity updates
- **Grant Sync**: Daily pulls from Grants.gov for new opportunities
- **SAM.gov Integration**: Regular updates for contracting opportunities
- **AI Agent Tasks**: Periodic analysis and opportunity matching

# Replit Environment Setup (September 14, 2025)

## Files Created for Replit Compatibility

### `next.config.js`
- Configured standalone output for reliable deployment
- Added proper headers (X-Frame-Options: SAMEORIGIN)
- Enabled development polling for hot reload in Replit environment
- Removed unsupported allowedDevOrigins to prevent config errors

### `app/ClientProviders.tsx`
- Extracted client-side providers (Supabase, Auth, Toaster) from layout
- Prevents SSR/CSR hydration mismatches
- Ensures single Supabase client instance across the application

## Files Modified for Replit Compatibility

### `app/layout.tsx`
- Converted to server component with proper metadata export
- Uses Next.js 14 font optimization (Inter from Google Fonts)
- Delegates all client-side logic to ClientProviders component
- Fixes hydration errors that were preventing app startup

### `contexts/AuthContext.js`
- **CRITICAL FIX**: Removed direct import from `lib/supabase.js`
- Now uses `useSessionContext()` and `useSupabaseClient()` from auth helpers
- Eliminates "Multiple GoTrueClient instances detected" warning
- Ensures single source of truth for Supabase client on frontend

### `package.json`
- Updated start script: `"start": "next start -H 0.0.0.0 -p ${PORT:-5000}"`
- Ensures proper host binding and port configuration for Replit deployment
- Defaults to port 5000 if PORT environment variable not set

## Required Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous/public key  
- `OPENAI_API_KEY` - OpenAI API key for GPT models
- `ANTHROPIC_API_KEY` - Anthropic API key for Claude models

## Deployment Configuration
- **Target**: Autoscale (stateless website)
- **Build**: `npm run build`
- **Run**: `npm start`
- **Port**: 5000 (configured in workflow and start script)

## Key Architectural Fixes
1. **Single Supabase Client**: Eliminated duplicate client instances causing auth issues
2. **SSR/CSR Separation**: Fixed hydration errors by proper component boundaries
3. **Replit Host Configuration**: Proper binding for proxy environment
4. **Production Deployment**: Standalone output and proper start scripts

## Status
✅ Application successfully running on port 5000
✅ No hydration errors or client instance warnings
✅ Authentication system working properly
✅ Ready for production deployment

**Last Updated**: September 14, 2025