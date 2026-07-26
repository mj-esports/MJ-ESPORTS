import React from 'react'
import { Newspaper, ExternalLink, Calendar } from 'lucide-react'

export const NewsSection = () => {
  const newsItems = [
    {
      id: 'news-1',
      title: 'Grand Finals Championship Announced for Free Fire MAX Invitational 2026',
      summary: 'Top 16 squads from across India will compete for a massive prize pool of ₹1,00,000 live on YouTube.',
      category: 'TOURNAMENT NEWS',
      date: 'JULY 2026',
      readTime: '3 MIN READ',
      image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'news-2',
      title: 'MJ ESPORTS Integrates Instant Automated Razorpay Prize Wallet Payouts',
      summary: 'Winners can now claim instant prize pool money directly into their bank accounts or UPI wallets upon match completion.',
      category: 'PLATFORM UPDATE',
      date: 'JULY 2026',
      readTime: '2 MIN READ',
      image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-3">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-[#fe6b00]" />
          <h3 className="font-display-lg text-lg font-extrabold text-white uppercase tracking-wider">
            ESPORTS NEWS & UPDATES
          </h3>
        </div>
        <span className="text-xs font-bold text-[#00f2ff] hover:underline cursor-pointer uppercase tracking-wider">
          READ ALL NEWS
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {newsItems.map((article) => (
          <div
            key={article.id}
            className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl overflow-hidden shadow-xl hover:border-[#00f2ff] transition-all group flex flex-col justify-between"
          >
            <div className="relative h-40 overflow-hidden">
              <img
                src={article.image}
                alt={article.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#151a21] via-transparent to-transparent" />
              <span className="absolute top-3 left-3 px-2.5 py-1 bg-[#07090c]/80 backdrop-blur border border-[#00f2ff]/40 text-[#00f2ff] text-[10px] font-mono font-bold uppercase rounded">
                {article.category}
              </span>
            </div>

            <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-3 text-[10px] font-mono text-[#8e9dae]">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#00f2ff]" />
                    {article.date}
                  </span>
                  <span>•</span>
                  <span>{article.readTime}</span>
                </div>
                <h4 className="font-display-lg text-sm sm:text-base font-extrabold text-white group-hover:text-[#00f2ff] transition-colors leading-snug">
                  {article.title}
                </h4>
                <p className="text-xs text-[#8e9dae] line-clamp-2 leading-relaxed">
                  {article.summary}
                </p>
              </div>

              <div className="pt-2 flex items-center gap-1 text-xs font-bold text-[#00f2ff] group-hover:text-[#74f5ff]">
                <span>Read Full Article</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
