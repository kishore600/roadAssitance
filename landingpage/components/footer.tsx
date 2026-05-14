'use client'

import Link from 'next/link'
import { Facebook, Instagram, Twitch } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">MOTO108</h3>
            <p className="text-sm text-gray-400">
              Roadside help. Anytime. Anywhere.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:text-white transition">About Us</Link></li>
              <li><Link href="#" className="hover:text-white transition">Services</Link></li>
              <li><Link href="#" className="hover:text-white transition">Pricing</Link></li>
              <li><Link href="#" className="hover:text-white transition">Blog</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:text-white transition">Help Center</Link></li>
              <li><Link href="#" className="hover:text-white transition">Contact Us</Link></li>
              <li><Link href="#" className="hover:text-white transition">Safety</Link></li>
              <li><Link href="#" className="hover:text-white transition">Terms</Link></li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="text-white font-semibold mb-4">Follow Us</h4>
            <div className="flex gap-4">
              <Link href="#" className="hover:text-[#FF9500] transition">
                <Facebook className="w-5 h-5" />
              </Link>
              <Link href="#" className="hover:text-[#FF9500] transition">
                <Instagram className="w-5 h-5" />
              </Link>
              <Link href="#" className="hover:text-[#FF9500] transition">
                <Twitch className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
            <p>&copy; 2024 MOTO108. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <Link href="#" className="hover:text-white transition">Privacy Policy</Link>
              <Link href="#" className="hover:text-white transition">Terms of Service</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
