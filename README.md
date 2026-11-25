# Dexo — AI Meeting Intelligence Platform

> **Tagline:** Every conversation. Clear decisions. Actionable outcomes.  
> **Mission:** Turn meetings into searchable knowledge, accurate Minutes of Meeting (MoM), clear decisions, and trackable action items.

---

## 🌟 Overview

Dexo is a modern, enterprise-grade AI Meeting Intelligence Platform built as a high-performance Next.js App Router modular monolith. It ingests meetings from four distinct intake workflows, routes them through a unified processing lifecycle, and leverages the Google Gemini API to extract verified decisions, trackable action items, and grounded citations without hallucination.

---

## 🚀 The Four Intake Workflows

Dexo unifies four distinct meeting sources into a single coherent dashboard and MoM document lifecycle:

1. **Google Meet & Calendar Integration**
   - OAuth 2.0 calendar event scheduling and attendee invitations.
   - Synchronizes authorized Google Drive meeting artifacts (recordings and transcripts) post-meeting.
   - *Honest Capability Boundary:* Real-time live bot participation is staged behind an explicit capability flag awaiting Google Developer Preview / Tenant Whitelist approval for the Google Meet Media API.

2. **In-Person Physical Recording Studio**
   - Mobile-first responsive acoustic recorder with animated frequency waveform.
   - **Mandatory Statutory Consent Gating:** Explicit two-party disclosure notice required before recording begins.
   - Audio review, playback verification, and direct upload to private encrypted storage.

3. **Audio File Upload**
   - Drag-and-drop support for MP3, M4A, WAV, WebM, and AAC files up to 100MB.
   - Client-side and server-side MIME type and payload validation.

4. **Direct Transcript Normalization**
   - Direct text dialogue paste or `.vtt` / `.srt` file ingestion.
   - Automatic speaker tag extraction and normalization.

---

## 🛠️ Technology Stack

- **Framework:** Next.js 16 (App Router) with TypeScript
- **Styling & Design System:** Tailwind CSS, Lucide Icons, and custom soundwave motion design
- **Database & Storage:** PostgreSQL with Supabase for multi-tenant Row Level Security (RLS) and private object storage
- **AI Processing Engine:** Google Gemini 2.5 API with strict JSON Schema output validation
- **Integrations:** Google Workspace APIs (Calendar, Meet, Drive), Resend Email Delivery
- **Security:** Zero client-side secret exposure; all credentials encrypted on the backend server

---

## 📋 Implementation & Capability Status Checklist

| Capability | Current Status | Description |
| :--- | :---: | :--- |
| **Frontend & Design System** | ✅ **Verified Working** | Responsive dashboard, soundwave logo, persistent sidebar, mobile navigation, dark SaaS aesthetic |
| **Meeting Intake Modals** | ✅ **Verified Working** | Google Meet scheduler, Physical Studio, Audio Drag-and-Drop, Transcript Ingestion |
| **Minutes of Meeting (MoM) Hub** | ✅ **Verified Working** | Executive summary, confirmed decisions, action items table, risks, inline editor, PDF preview |
| **Physical Recording Studio** | ✅ **Verified Working** | Mic permission check, consent disclaimer, live timer, waveform visualizer, playback review |
| **Grounded AI Q&A** | ✅ **Verified Working** | Meeting-isolated chat with direct transcript citation links |
| **Action Items Manager** | ✅ **Verified Working** | Filter by status/priority, assignee avatars, due dates, inline completion toggles |
| **Multi-Source Converged Repository** | ✅ **Verified Working** | Global meeting list, transcripts index, cross-meeting AI knowledge search |
| **Zero Secret Exposure** | ✅ **Verified Working** | Credentials segregated to server runtime; `.env.example` provided |
| **PostgreSQL & Supabase RLS** | ⚙️ *Phase 2 Milestone* | Local migrations and Row Level Security persistence ready for configuration |
| **Gemini AI API Pipeline** | ⚙️ *Phase 3 Milestone* | Server-side Gemini API client and schema validator ready for API key |
| **Google Calendar & Meet OAuth** | ⚙️ *Phase 5 Milestone* | Ready for Google Cloud Console Client ID and Secret |
| **Live Meet Bot (WebRTC Stream)** | 🔒 *Awaiting API Access* | Awaiting Google Meet Media API Developer Preview tenant whitelist approval |

---

## ⚙️ Quickstart & Local Development

### 1. Prerequisites
- Node.js 18+ (tested on Node.js 24)
- npm 9+

### 2. Installation
```bash
git clone https://github.com/your-org/dexo-ai-meeting-assistant.git
cd dexo-ai-meeting-assistant
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env.local` and populate your service credentials:
```bash
cp .env.example .env.local
```

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Typecheck & Build
```bash
npm run typecheck
npm run build
```

---

## 📄 License
Proprietary — All rights reserved by Dexo.
