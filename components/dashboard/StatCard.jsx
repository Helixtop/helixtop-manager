import React from 'react';
import { cn } from '@/lib/utils';

export default function StatCard({ title, value, icon: Icon, trend, color, description }) {
  const colorMap = {
    blue: "from-blue-600/20 to-blue-400/5 text-blue-400 border-blue-500/20",
    green: "from-green-600/20 to-green-400/5 text-green-400 border-green-500/20",
    orange: "from-orange-600/20 to-orange-400/5 text-orange-400 border-orange-500/20",
    purple: "from-purple-600/20 to-purple-400/5 text-purple-400 border-purple-500/20",
    red: "from-red-600/20 to-red-400/5 text-red-400 border-red-500/20",
  };

  return (
    <div className={cn(
      "p-6 rounded-2xl border bg-gradient-to-br transition-all duration-300 hover:scale-[1.02]",
      colorMap[color] || colorMap.blue
    )}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 rounded-xl bg-black/40 border border-white/5">
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span className={cn(
            "text-xs font-bold px-2 py-1 rounded-lg bg-black/40 border border-white/5",
            trend > 0 ? "text-green-400" : "text-red-400"
          )}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div>
        <p className="text-gray-400 text-sm font-medium">{title}</p>
        <h3 className="text-3xl font-bold mt-1 text-white">{value}</h3>
        {description && <p className="text-xs text-gray-500 mt-2 font-medium">{description}</p>}
      </div>
    </div>
  );
}
