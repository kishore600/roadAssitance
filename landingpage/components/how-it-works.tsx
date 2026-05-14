'use client'

import { Smartphone, MapPin, Users, CheckCircle } from 'lucide-react'

const steps = [
  {
    number: '1',
    icon: Smartphone,
    title: 'Open App',
    description: 'Launch MOTO108 and request help'
  },
  {
    number: '2',
    icon: MapPin,
    title: 'Share Location',
    description: 'Let us know where you are'
  },
  {
    number: '3',
    icon: Users,
    title: 'Meet Expert',
    description: 'Get connected with a verified mechanic'
  },
  {
    number: '4',
    icon: CheckCircle,
    title: 'Problem Solved',
    description: 'Pay and rate your experience'
  }
]

export function HowItWorks() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Getting help is just 4 simple steps away
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <div key={index} className="relative">
                  {/* Connector line - hidden on mobile, visible on desktop */}
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-20 -right-4 w-8 h-1 bg-gradient-to-r from-[#FF9500] to-transparent" />
                  )}

                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-6">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#2F5F7F] to-[#1a3a52] flex items-center justify-center text-white shadow-lg">
                        <Icon className="w-10 h-10" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#FF9500] rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {step.number}
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {step.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
