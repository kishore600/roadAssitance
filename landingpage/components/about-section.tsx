export function AboutSection() {
  return (
    <section id="about" className="py-16 md:py-24 bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            About MOTO108
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Revolutionizing roadside assistance for two-wheeler riders across India
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          <div>
            <h3 className="text-xl font-bold text-[#2F5F7F] mb-4">Our Mission</h3>
            <p className="text-gray-600 leading-relaxed">
              We believe every rider deserves quick, reliable, and affordable roadside assistance. MOTO108 connects bike and scooter riders with verified expert mechanics within minutes, ensuring you&apos;re never stranded on the road.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-bold text-[#2F5F7F] mb-4">Why Choose Us</h3>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-start gap-3">
                <span className="inline-block w-2 h-2 rounded-full bg-[#FF9500] mt-2 flex-shrink-0"></span>
                <span>Instant connection with verified mechanics</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="inline-block w-2 h-2 rounded-full bg-[#FF9500] mt-2 flex-shrink-0"></span>
                <span>Transparent pricing with no hidden charges</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="inline-block w-2 h-2 rounded-full bg-[#FF9500] mt-2 flex-shrink-0"></span>
                <span>Available 24/7 across all major cities</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="inline-block w-2 h-2 rounded-full bg-[#FF9500] mt-2 flex-shrink-0"></span>
                <span>Quality service with professional mechanics</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 p-8 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-xl font-bold text-[#2F5F7F] mb-4">Our Values</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Reliability</h4>
              <p className="text-sm text-gray-600">We&apos;re there when you need us, every time.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Transparency</h4>
              <p className="text-sm text-gray-600">Clear pricing and honest communication always.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Excellence</h4>
              <p className="text-sm text-gray-600">Quality service from trained professionals.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
