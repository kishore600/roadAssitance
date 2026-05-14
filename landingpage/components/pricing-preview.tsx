'use client'

const vehicleServices = [
  {
    category: 'Two-wheeler / Bikes',
    services: [
      { name: 'Tubeless Puncture', price: '₹100' },
      { name: 'Mushroom Puncture', price: '₹350' },
      { name: 'Tyre Remover Work', price: '₹600' },
      { name: 'Valve Service', price: '₹20' }
    ]
  },
  {
    category: 'Scooter / Auto',
    services: [
      { name: 'Tubeless Puncture', price: '₹200' },
      { name: 'Mushroom Puncture', price: '₹300' },
      { name: 'Tyre Remover Work', price: '₹700' },
      { name: 'Grease Service', price: '₹75' }
    ]
  },
  {
    category: 'Car',
    services: [
      { name: 'Tubeless Puncture', price: '₹250' },
      { name: 'Mushroom Puncture', price: '₹450' },
      { name: 'Tyre Remover Work', price: '₹1300' },
      { name: 'Grease Service', price: '₹100' }
    ]
  }
]

export function PricingPreview() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Transparent Pricing
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            No surprises at checkout - see all prices upfront
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {vehicleServices.map((vehicle, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-[#2F5F7F] to-[#1a3a52] text-white p-6">
                <h3 className="text-lg font-semibold">{vehicle.category}</h3>
              </div>

              {/* Services list */}
              <div className="p-6 space-y-4">
                {vehicle.services.map((service, serviceIdx) => (
                  <div key={serviceIdx} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                    <span className="text-gray-700 font-medium">{service.name}</span>
                    <span className="text-[#FF9500] font-bold">{service.price}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Note */}
        <div className="mt-12 bg-[#2FB095]/10 border border-[#2FB095]/30 rounded-lg p-6 text-center">
          <p className="text-gray-700">
            <span className="font-semibold text-[#2FB095]">✓ Verified Mechanics</span> • 
            <span className="font-semibold text-[#2FB095] ml-2">No Hidden Charges</span> • 
            <span className="font-semibold text-[#2FB095] ml-2">Quality Guaranteed</span>
          </p>
        </div>
      </div>
    </section>
  )
}
