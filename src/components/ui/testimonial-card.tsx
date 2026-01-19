import { cn } from "@/lib/utils"

export interface TestimonialAuthor {
  name: string
  handle: string
  avatar: string
}

interface TestimonialCardProps {
  author: TestimonialAuthor
  text: string
  href?: string
  className?: string
}

export function TestimonialCard({ 
  author, 
  text, 
  href,
  className 
}: TestimonialCardProps) {
  return (
    <div 
      className={cn(
        "flex flex-col rounded-xl border border-white/10 bg-white/5 p-5",
        "backdrop-blur-sm hover:bg-white/[0.08] transition-colors",
        "w-[320px] shrink-0",
        className
      )}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
            {author.avatar}
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-white">{author.name}</span>
          <span className="text-xs text-gray-400">{author.handle}</span>
        </div>
      </div>
      <p className="text-sm text-gray-300 leading-relaxed">{text}</p>
    </div>
  )
}
