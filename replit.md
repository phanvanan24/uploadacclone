# Overview

QuestionGen AI is a Vietnamese educational question generator system that creates various types of questions (multiple choice, true/false, essay, fill-in-blank, matching, and ordering) using AI. The system supports LaTeX math formulas, provides PDF export functionality, and includes comprehensive question management features through banks and history tracking.

# Recent Changes

- Updated Vietnamese literature (Ngữ văn) question types to only include "Đọc hiểu" (Reading comprehension) and "Viết đoạn văn nghị luận" (Essay writing)
- Implemented detailed reading comprehension format for Vietnamese literature with 600-800 word passages, structured 8-question format following THPTQG standards
- Added automatic question count setting (8 questions) for Vietnamese literature with hidden UI controls
- Structured question distribution: 2 recognition questions, 2 comprehension questions, 2 low application questions, 2 high application questions

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Radix UI components with Tailwind CSS for styling
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state and React Hook Form for form management
- **Vietnamese Font Support**: Google Fonts Inter for proper Vietnamese character rendering

## Backend Architecture
- **Runtime**: Node.js with Express.js server
- **API Design**: RESTful endpoints with proper error handling
- **Data Validation**: Zod schemas for request/response validation
- **Storage**: In-memory storage (MemStorage) for development with interface for future database integration
- **AI Integration**: OpenRouter API using DeepSeek R1 model for question generation

## Core Features
- **Question Generation**: AI-powered creation of educational questions in Vietnamese
- **PDF Export**: html2pdf.js with KaTeX integration for LaTeX math formula rendering
- **LaTeX Support**: Full mathematical notation support using KaTeX library
- **Question Management**: Local storage-based history and banking system for organizing questions
- **Batch Processing**: Support for generating multiple question sets concurrently

## Data Storage Solutions
- **Development**: In-memory storage with Map-based implementation
- **Client Storage**: LocalStorage for history, question banks, and user preferences
- **Database Ready**: Drizzle ORM configured for PostgreSQL migration when needed
- **Export/Import**: JSON-based data portability for question banks and history

## PDF Generation System
- **Engine**: html2pdf.js with jsPDF backend and html2canvas for rendering
- **Vietnamese Support**: Custom font loading and Unicode handling
- **LaTeX Rendering**: KaTeX integration for mathematical formulas
- **Export Options**: Configurable paper sizes, orientations, and content inclusion

## Question Types Supported
- Multiple choice with A/B/C/D options
- True/false questions
- Essay questions
- Fill-in-blank with multiple acceptable answers
- Matching exercises with left/right item pairs
- Ordering tasks with correct sequence arrangement

# External Dependencies

## AI Services
- **OpenRouter API**: Primary AI service for question generation using DeepSeek R1 model
- **API Key Management**: Environment variable configuration for secure API access

## Font Services
- **Google Fonts**: Inter font family for Vietnamese text support
- **CDN Delivery**: Web font loading for consistent typography

## Mathematical Rendering
- **KaTeX**: LaTeX math formula rendering library
- **CDN Integration**: Auto-render extension for automatic formula detection

## PDF Generation
- **html2pdf.js**: HTML to PDF conversion with advanced options
- **jsPDF**: Underlying PDF generation engine
- **html2canvas**: HTML element to canvas conversion for high-quality rendering

## UI Components
- **Radix UI**: Comprehensive component library for accessible UI elements
- **Lucide React**: Icon library for consistent iconography
- **Tailwind CSS**: Utility-first CSS framework for styling

## Development Tools
- **Vite**: Fast build tool and development server
- **TypeScript**: Type safety and enhanced developer experience
- **ESLint/Prettier**: Code quality and formatting tools

## Database (Future)
- **Neon Database**: Serverless PostgreSQL for production deployment
- **Drizzle ORM**: Type-safe database operations and schema management