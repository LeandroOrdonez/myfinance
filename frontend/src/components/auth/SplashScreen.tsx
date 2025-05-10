"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { BarChartIcon, DollarSign, PiggyBank, TrendingUp } from "lucide-react"

interface SplashScreenProps {
  onComplete: (name: string) => void
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Check if user has already visited
    const userName = localStorage.getItem("myfinance_user_name")

    if (userName) {
      // User has already visited, skip splash screen
      onComplete(userName)
    } else {
      // First visit, show splash screen with animation
      setIsVisible(true)
      // Focus the input field after animation completes
      setTimeout(() => {
        inputRef.current?.focus()
      }, 600)
    }
  }, [onComplete])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError("Please enter your name to continue")
      return
    }

    // Start exit animation
    setIsExiting(true)

    // Wait for exit animation to complete before storing and completing
    setTimeout(() => {
      localStorage.setItem("myfinance_user_name", name.trim())
      onComplete(name.trim())
    }, 500)
  }

  if (!isVisible) {
    return null
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-slate-900 transition-opacity duration-500 ease-in-out ${
        isVisible && !isExiting ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className={`w-full max-w-md p-8 mx-4 rounded-xl bg-gradient-to-br from-teal-50 to-blue-50 dark:from-slate-800 dark:to-slate-900 shadow-xl transition-all duration-500 ease-in-out ${
          isVisible && !isExiting ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}
      >
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-teal-400 to-blue-500 opacity-75 blur"></div>
            <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-white dark:bg-slate-800">
              <DollarSign className="w-8 h-8 text-teal-500" />
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-slate-800 dark:text-white mb-2">Welcome to MyFinance</h1>

        <p className="text-center text-slate-600 dark:text-slate-300 mb-8">
          Your personal finance tracker for smarter money management
        </p>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="flex flex-col items-center p-3 rounded-lg bg-white/80 dark:bg-slate-800/80 shadow-sm">
            <BarChartIcon className="w-6 h-6 text-blue-500 mb-2" />
            <span className="text-xs text-center text-slate-600 dark:text-slate-300">Track Expenses</span>
          </div>
          <div className="flex flex-col items-center p-3 rounded-lg bg-white/80 dark:bg-slate-800/80 shadow-sm">
            <PiggyBank className="w-6 h-6 text-teal-500 mb-2" />
            <span className="text-xs text-center text-slate-600 dark:text-slate-300">Save Money</span>
          </div>
          <div className="flex flex-col items-center p-3 rounded-lg bg-white/80 dark:bg-slate-800/80 shadow-sm">
            <TrendingUp className="w-6 h-6 text-emerald-500 mb-2" />
            <span className="text-xs text-center text-slate-600 dark:text-slate-300">Grow Wealth</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              What should we call you?
            </label>
            <input
              ref={inputRef}
              id="name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (error) setError("")
              }}
              placeholder="Enter your name"
              className="w-full px-3 py-2 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full px-4 py-2 rounded-md bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 text-white font-medium transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Get Started
          </button>
        </form>
      </div>
    </div>
  )
}
