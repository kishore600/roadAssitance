import { ArrowRight, Zap, Shield, Wrench } from 'lucide-react'

export function BlogSection() {
  const blogPosts = [
    {
      icon: Zap,
      title: 'Battery Care Tips for Your Bike',
      excerpt: 'Learn essential maintenance tips to keep your bike battery in perfect condition and avoid unexpected breakdowns.',
      date: 'March 15, 2024',
      readTime: '5 min read'
    },
    {
      icon: Wrench,
      title: 'Common Bike Problems & Quick Fixes',
      excerpt: 'Discover the most common bike issues riders face and how our experts can solve them quickly on the road.',
      date: 'March 10, 2024',
      readTime: '7 min read'
    },
    {
      icon: Shield,
      title: 'Tyre Safety: What You Need to Know',
      excerpt: 'Complete guide on tyre maintenance, pressure checks, and signs that indicate you need immediate repair.',
      date: 'March 5, 2024',
      readTime: '6 min read'
    }
  ]

  return (
    <section id="blog" className="py-16 md:py-24 bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Latest Blog Posts
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Expert tips, maintenance guides, and industry insights for bike riders
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {blogPosts.map((post, index) => {
            const Icon = post.icon
            return (
              <article
                key={index}
                className="group p-6 bg-gray-50 rounded-lg border border-gray-200 hover:border-[#2F5F7F] hover:shadow-lg transition-all duration-300"
              >
                <div className="mb-4 p-3 w-fit rounded-lg bg-gradient-to-br from-[#2F5F7F] to-[#1F3F5F]">
                  <Icon size={24} className="text-white" />
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-[#2F5F7F] transition-colors">
                  {post.title}
                </h3>
                
                <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                  {post.excerpt}
                </p>
                
                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                  <span>{post.date}</span>
                  <span>{post.readTime}</span>
                </div>
                
                <button className="flex items-center gap-2 text-[#2F5F7F] font-medium text-sm hover:gap-3 transition-all duration-200 group-hover:text-[#FF9500]">
                  Read More
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </article>
            )
          })}
        </div>

        <div className="mt-12 text-center">
          <button className="px-6 py-3 rounded-lg border-2 border-[#2F5F7F] text-[#2F5F7F] font-medium hover:bg-[#2F5F7F] hover:text-white transition-colors duration-200">
            View All Articles
          </button>
        </div>
      </div>
    </section>
  )
}
