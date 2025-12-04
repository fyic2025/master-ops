"use client"

import { signIn } from "next-auth/react"

export default function LoginPage() {
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Full-screen jungle background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1440342359743-84fcb8c21f21?w=1920&q=80)',
        }}
      />

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />

      {/* Main content */}
      <div className="relative z-10 text-center px-6 max-w-2xl">
        {/* Title */}
        <h1 className="text-6xl md:text-7xl font-black mb-4 tracking-tight"
          style={{
            background: 'linear-gradient(180deg, #90EE90 0%, #32CD32 50%, #228B22 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 40px rgba(50, 205, 50, 0.5)',
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
          }}
        >
          WELCOME TO THE JUNGLE
        </h1>

        {/* Subtitle */}
        <p className="text-2xl md:text-3xl font-bold text-yellow-400 mb-6 italic"
          style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
        >
          Only the place where we rumble anyway!
        </p>

        {/* Access notice */}
        <p className="text-xl text-emerald-200 mb-12 font-semibold tracking-wide"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
        >
          Access strictly limited to the Businessmen of the Surrey.
        </p>

        {/* Google Sign In Button */}
        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="group relative inline-flex items-center justify-center gap-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-4 px-8 rounded-xl text-xl hover:from-green-500 hover:to-emerald-500 transition-all duration-300 transform hover:scale-105 shadow-2xl"
          style={{ boxShadow: '0 10px 40px rgba(34, 139, 34, 0.4)' }}
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24">
            <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Enter the Jungle
          <span className="ml-2">🦁</span>
        </button>

        {/* Footer */}
        <p className="mt-8 text-emerald-400/60 text-sm">
          Guns N&apos; Roses would approve
        </p>
      </div>

      {/* Bottom vignette */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
    </div>
  )
}
