'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

export function Header() {
  const [isOpen, setIsOpen] = useState(false)

  const navLinks = [
    { href: '#about', label: 'About Us' },
    { href: '#safety', label: 'Safety' },
    { href: '#blog', label: 'Blog' },
    { href: '#contact', label: 'Contact Us' },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="#" className="flex items-center gap-2 font-bold text-xl">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2F5F7F] to-[#1F3F5F] flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="hidden sm:inline bg-gradient-to-r from-[#2F5F7F] to-[#1F3F5F] bg-clip-text text-transparent">
              MOTO108
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-gray-600 hover:text-[#2F5F7F] transition-colors duration-200 font-medium"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* CTA Button - Desktop */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="https://play.google.com/store/apps/details?id=com.moto108.emergency"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2 rounded-lg bg-[#FF9500] text-white font-medium text-sm hover:bg-[#E68A00] transition-colors duration-200"
            >
              Download Now
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-[#2F5F7F] transition-colors"
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <nav className="md:hidden pb-4 border-t border-gray-200">
            <div className="flex flex-col gap-3 pt-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-[#2F5F7F] hover:bg-gray-50 rounded-lg transition-colors duration-200 font-medium"
                >
                  {link.label}
                </a>
              ))}
              <a
                href="https://play.google.com/store/apps/details?id=com.moto108.emergency"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 mt-2 rounded-lg bg-[#FF9500] text-white font-medium text-sm hover:bg-[#E68A00] transition-colors duration-200 text-center"
              >
                Download Now
              </a>
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
