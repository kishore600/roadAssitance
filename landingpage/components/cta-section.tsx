'use client'

import { Button } from '@/components/ui/button'
import { Download, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export function CTASection() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[#2F5F7F] to-[#1a3a52] text-white">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-6">
          Ready for Roadside Help?
        </h2>
        <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
          Download MOTO108 now and get professional bike repair assistance anytime, anywhere. We&apos;re available in your city 24/7.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="https://play.google.com/store/apps/details?id=com.moto108.emergency"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="lg" className="bg-[#FF9500] hover:bg-[#E68A00] text-white font-semibold h-12 px-8 w-full sm:w-auto">
              <Download className="mr-2 w-5 h-5" />
              Download from Play Store
            </Button>
          </Link>
          <Button 
            size="lg" 
            variant="outline" 
            className="border-2 border-white text-white hover:bg-white/10 font-semibold h-12 px-8 w-full sm:w-auto"
          >
            Contact Support
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>

        {/* Trust section */}
        <div className="mt-12 pt-8 border-t border-white/20">
          <p className="text-gray-300 mb-6">Trusted by thousands of riders</p>
          <div className="flex flex-wrap gap-8 justify-center items-center text-sm">
            <div>
              <div className="text-2xl font-bold">4.8★</div>
              <div className="text-gray-300">Rating</div>
            </div>
            <div className="w-px h-12 bg-white/20" />
            <div>
              <div className="text-2xl font-bold">5000+</div>
              <div className="text-gray-300">Happy Customers</div>
            </div>
            <div className="w-px h-12 bg-white/20" />
            <div>
              <div className="text-2xl font-bold">500+</div>
              <div className="text-gray-300">Verified Mechanics</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
