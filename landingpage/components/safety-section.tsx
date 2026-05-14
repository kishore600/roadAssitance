import { Shield, CheckCircle, AlertCircle, Lock } from 'lucide-react'

export function SafetySection() {
  const safetyFeatures = [
    {
      icon: Shield,
      title: 'Verified Mechanics',
      description: 'All mechanics are background-checked and professionally verified for your safety.'
    },
    {
      icon: Lock,
      title: 'Secure Transactions',
      description: 'Your payments are encrypted and secure through trusted payment gateways.'
    },
    {
      icon: CheckCircle,
      title: 'Quality Assurance',
      description: 'Every service is quality-checked with customer feedback and ratings system.'
    },
    {
      icon: AlertCircle,
      title: 'Real-time Tracking',
      description: 'Track your mechanic in real-time with GPS to know exactly when they arrive.'
    }
  ]

  return (
    <section id="safety" className="py-16 md:py-24 bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Your Safety is Our Priority
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            We take comprehensive measures to ensure every interaction is safe, secure, and trustworthy
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {safetyFeatures.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div key={index} className="p-6 bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-[#2F5F7F] to-[#1F3F5F]">
                    <Icon size={24} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-12 p-8 bg-white rounded-lg border border-gray-200">
          <h3 className="text-xl font-bold text-[#2F5F7F] mb-6">Safety Guidelines for Riders</h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <span className="inline-block w-2 h-2 rounded-full bg-[#FF9500] mt-2 flex-shrink-0"></span>
              <p className="text-gray-600">
                <strong>Share your location:</strong> Ensure your real-time location is enabled for mechanic tracking and safety.
              </p>
            </div>
            <div className="flex gap-4">
              <span className="inline-block w-2 h-2 rounded-full bg-[#FF9500] mt-2 flex-shrink-0"></span>
              <p className="text-gray-600">
                <strong>Verify mechanic details:</strong> Check the mechanic&apos;s ID and vehicle details before allowing access to your bike.
              </p>
            </div>
            <div className="flex gap-4">
              <span className="inline-block w-2 h-2 rounded-full bg-[#FF9500] mt-2 flex-shrink-0"></span>
              <p className="text-gray-600">
                <strong>Use app communication:</strong> Always communicate through the app for record and safety purposes.
              </p>
            </div>
            <div className="flex gap-4">
              <span className="inline-block w-2 h-2 rounded-full bg-[#FF9500] mt-2 flex-shrink-0"></span>
              <p className="text-gray-600">
                <strong>Rate your experience:</strong> Your honest feedback helps us maintain the highest service standards.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
