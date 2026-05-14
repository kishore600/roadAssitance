'use client'

import { MapPin, Shield, TrendingUp, Clock } from 'lucide-react'

const features = [
  {
    icon: MapPin,
    title: 'Real-time Tracking',
    description: 'Track your mechanic in real-time with live GPS updates',
    highlight: true
  },
  {
    icon: Shield,
    title: 'Verified Experts',
    description: 'All mechanics are verified and background checked',
    highlight: true
  },
  {
    icon: Clock,
    title: 'No Waiting',
    description: 'Get help within minutes of booking',
    highlight: true
  },
  {
    icon: TrendingUp,
    title: 'Fair Pricing',
    description: 'Transparent pricing with no hidden charges',
    highlight: true
  }
]

export function FeaturesSection() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Why Choose MOTO108?
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Experience the difference with our innovative platform
          </p>
        </div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={index}
                className="flex gap-6 p-8 bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-shadow"
              >
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-14 w-14 rounded-lg bg-[#2F5F7F]/10">
                    <Icon className="h-7 w-7 text-[#2F5F7F]" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
