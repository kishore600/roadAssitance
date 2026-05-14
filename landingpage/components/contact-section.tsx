'use client'

import { useState } from 'react'
import { Mail, Phone, MapPin, Send } from 'lucide-react'

export function ContactSection() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  })
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would typically send the form data to a backend
    console.log('Form submitted:', formData)
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      setFormData({ name: '', email: '', phone: '', message: '' })
    }, 3000)
  }

  const contactInfo = [
    {
      icon: Phone,
      title: 'Call Us',
      detail: '+91-1800-MOTO-108',
      subtext: 'Available 24/7'
    },
    {
      icon: Mail,
      title: 'Email Us',
      detail: 'support@moto108.com',
      subtext: 'We respond within 2 hours'
    },
    {
      icon: MapPin,
      title: 'Head Office',
      detail: 'Chennai, Tamil Nadu',
      subtext: 'Operations across India'
    }
  ]

  return (
    <section id="contact" className="py-16 md:py-24 bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Get in Touch
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Have questions? We&apos;d love to hear from you. Contact us anytime.
          </p>
        </div>

        {/* Contact Info Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {contactInfo.map((info, index) => {
            const Icon = info.icon
            return (
              <div key={index} className="p-6 bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow duration-300 text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-[#2F5F7F] to-[#1F3F5F]">
                    <Icon size={24} className="text-white" />
                  </div>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{info.title}</h3>
                <p className="text-[#2F5F7F] font-semibold mb-1">{info.detail}</p>
                <p className="text-sm text-gray-600">{info.subtext}</p>
              </div>
            )
          })}
        </div>

        {/* Contact Form */}
        <div className="max-w-2xl mx-auto p-8 bg-white rounded-lg border border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Send us a Message</h3>
          
          {submitted ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <p className="text-green-700 font-medium">
                Thank you! Your message has been sent successfully. We&apos;ll get back to you soon.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#2F5F7F] focus:ring-2 focus:ring-[#2F5F7F]/10 transition-colors"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#2F5F7F] focus:ring-2 focus:ring-[#2F5F7F]/10 transition-colors"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#2F5F7F] focus:ring-2 focus:ring-[#2F5F7F]/10 transition-colors"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#2F5F7F] focus:ring-2 focus:ring-[#2F5F7F]/10 transition-colors resize-none"
                  placeholder="Tell us how we can help..."
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-[#2F5F7F] to-[#1F3F5F] text-white font-medium hover:shadow-lg transition-all duration-200"
              >
                Send Message
                <Send size={18} />
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
