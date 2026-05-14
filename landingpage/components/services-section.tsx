'use client'

import { Zap, Wrench, Fuel, Headphones } from 'lucide-react'

const services = [
  {
    icon: Zap,
    title: 'Puncture Repair',
    description: 'Tubeless & mushroom puncture repairs',
    color: 'text-[#FF9500]',
    bgColor: 'bg-[#FF9500]/10'
  },
  {
    icon: Wrench,
    title: 'Tyre Services',
    description: 'Complete tyre removal and replacement',
    color: 'text-[#2FB095]',
    bgColor: 'bg-[#2FB095]/10'
  },
  {
    icon: Fuel,
    title: 'Fuel Delivery',
    description: 'Emergency fuel delivery to your location',
    color: 'text-[#FF6B6B]',
    bgColor: 'bg-[#FF6B6B]/10'
  },
  {
    icon: Headphones,
    title: '24/7 Support',
    description: 'Always ready to help you out',
    color: 'text-[#5D4E9E]',
    bgColor: 'bg-[#5D4E9E]/10'
  }
]

export function ServicesSection() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Services We Provide
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Quick, reliable, and affordable roadside assistance for your bike
          </p>
        </div>

        {/* Services grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => {
            const Icon = service.icon
            return (
              <div
                key={index}
                className="p-6 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300 group cursor-pointer"
              >
                <div className={`${service.bgColor} w-14 h-14 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-7 h-7 ${service.color}`} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {service.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {service.description}
                </p>
              </div>
            )
          })}
        </div>

        {/* Additional info */}
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          <div className="bg-gradient-to-br from-[#2F5F7F] to-[#1a3a52] text-white p-8 rounded-xl">
            <div className="text-3xl font-bold mb-2">₹100-600</div>
            <p className="text-gray-200">Affordable pricing for all vehicle types</p>
          </div>
          <div className="bg-gradient-to-br from-[#2FB095] to-[#1f7263] text-white p-8 rounded-xl">
            <div className="text-3xl font-bold mb-2">&lt;10 min</div>
            <p className="text-gray-200">Quick response and assistance</p>
          </div>
          <div className="bg-gradient-to-br from-[#FF9500] to-[#E68A00] text-white p-8 rounded-xl">
            <div className="text-3xl font-bold mb-2">500+ Mechanics</div>
            <p className="text-gray-200">Verified experts in your city</p>
          </div>
        </div>
      </div>
    </section>
  )
}
