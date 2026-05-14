'use client'

import { Button } from '@/components/ui/button'
import { ArrowRight, MapPin, Zap } from 'lucide-react'
import Link from 'next/link'

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#2F5F7F] to-[#1a3a52] text-white py-20 px-4 sm:px-6 lg:px-8">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#FF9500]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#2FB095]/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Left content */}
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="inline-block">
                <div className="flex items-center gap-2 text-[#FF9500] font-semibold mb-4">
                  <Zap className="w-5 h-5" />
                  <span>Emergency Roadside Help</span>
                </div>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                Help on Wheels, Anytime, Anywhere
              </h1>
              <p className="text-xl text-gray-200 max-w-2xl">
                Get professional bike repair and roadside assistance in minutes. MOTO108 connects you with verified mechanics instantly.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="https://play.google.com/store/apps/details?id=com.moto108.emergency"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="lg" className="bg-[#FF9500] hover:bg-[#E68A00] text-white font-semibold h-12 px-8 w-full sm:w-auto">
                  Download App
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-2 border-white text-black hover:bg-white/10 font-semibold h-12 px-8"
              >
                Learn More
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center gap-6 pt-4">
              <div>
                <div className="text-2xl font-bold">5000+</div>
                <div className="text-sm text-gray-300">Rides Completed</div>
              </div>
              <div className="w-px h-12 bg-white/20" />
              <div>
                <div className="text-2xl font-bold">4.8★</div>
                <div className="text-sm text-gray-300">Customer Rating</div>
              </div>
              <div className="w-px h-12 bg-white/20" />
              <div>
                <div className="text-2xl font-bold">&lt;10min</div>
                <div className="text-sm text-gray-300">Avg. Response</div>
              </div>
            </div>
          </div>

          {/* Right side - Mobile mockup */}
          <div className="relative hidden md:flex justify-center items-center">
            <div className="relative w-64 h-96 bg-gradient-to-b from-[#1a3a52] to-[#0f2438] rounded-3xl shadow-2xl border-8 border-[#2F5F7F] overflow-hidden">
              {/* Phone screen content */}
              <div className="absolute inset-0 p-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="h-8 bg-white/10 rounded w-3/4" />
                  <div className="h-6 bg-white/5 rounded w-1/2" />
                </div>
                <div className="space-y-3">
                  <div className="h-16 bg-[#FF9500]/20 rounded-lg border border-[#FF9500]/40" />
                  <div className="h-16 bg-[#2FB095]/20 rounded-lg border border-[#2FB095]/40" />
                  <div className="h-16 bg-[#FF6B6B]/20 rounded-lg border border-[#FF6B6B]/40" />
                </div>
              </div>

              {/* Notch */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-7 bg-[#0f2438] rounded-b-2xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
