# 💬 Modern Chat App

A real-time chat application built with Next.js and Supabase, featuring modern UI, message management, and seamless user experience.

## ✨ Features

- 🔐 **User Authentication** - Secure login/signup with Supabase Auth
- 💬 **Real-time Messaging** - Instant message delivery with WebSocket
- 🏠 **Room Management** - Create, join, and manage chat rooms
- ✏️ **Message Editing** - Edit and delete your messages in real-time
- 👥 **Online Presence** - See who's currently online
- 🌙 **Modern Dark UI** - Beautiful gradient design with custom scrollbars
- 📱 **Mobile Responsive** - Works perfectly on all devices
- 🔄 **Auto-Reconnection** - Handles AFK scenarios gracefully

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/chat-app.git
cd chat-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Add your Supabase credentials to `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## 🏗️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS with custom gradients
- **Backend**: Supabase (PostgreSQL + Real-time)
- **Authentication**: Supabase Auth
- **State Management**: Zustand
- **Icons**: Lucide React

## 📱 Deploy

### Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Push your code to GitHub
2. Connect your repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Environment Variables for Production
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## 🗃️ Database Setup

Your Supabase project needs these tables:
- `profiles` - User profiles
- `rooms` - Chat rooms
- `messages` - Chat messages  
- `room_memberships` - Room membership tracking

Row Level Security (RLS) policies are configured for secure access.

## 🎯 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## 📄 License

MIT License - feel free to use this project as you wish!

---

**Built with ❤️ using Next.js and Supabase**
