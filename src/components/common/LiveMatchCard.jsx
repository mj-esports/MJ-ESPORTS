import React from 'react'

/**
 * MJ ESPORTS — Cyberpunk Free Fire Live Match Card
 * 
 * Recreates the esports battle arena match card using Tailwind CSS
 * with tactical HUD aesthetics, skewed neon team badges, angled clip-path CTA,
 * and live match telemetry.
 */
export default function LiveMatchCard({
  matchNumber = '07',
  tournamentName = 'MJ ESPORTS',
  title = 'BATTLE ARENA',
  game = 'FREE FIRE MAX',
  team1 = {
    shortName: 'MJ',
    name: 'MJ TITANS',
    score: '12',
    color: 'cyan',
  },
  team2 = {
    shortName: 'NX',
    name: 'NOVA X',
    score: '09',
    color: 'orange',
  },
  format = 'BO3',
  mapName = '02',
  status = 'IN GAME',
  isLive = true,
  onViewMatch,
}) {
  return (
    <div className="relative w-full max-w-[360px] h-[470px] p-[22px] bg-[#111315] border border-[#292d31] rounded-none overflow-hidden shadow-[0_15px_45px_rgba(0,0,0,0.55)] transition-all duration-350 hover:-translate-y-2 hover:border-[#00e5ff]/60 hover:shadow-[0_20px_55px_rgba(0,0,0,0.7),0_0_30px_rgba(0,229,255,0.1)] font-sans select-none group bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:22px_22px]">
      
      {/* CYAN LEFT EDGE ACCENT */}
      <div className="absolute top-0 left-0 w-[3px] h-full bg-[#00e5ff] shadow-[0_0_15px_rgba(0,229,255,0.55)]" />

      {/* ORANGE TOP-RIGHT EDGE ACCENT */}
      <div className="absolute top-0 right-0 w-[3px] h-[38%] bg-[#ff6b00] shadow-[0_0_15px_rgba(255,107,0,0.35)]" />

      {/* TOP BAR */}
      <div className="flex justify-between items-center pb-3.5 border-b border-[#272b2f] text-[10px] font-extrabold tracking-[1.5px]">
        {isLive ? (
          <div className="flex items-center gap-1.5 text-[#ff6b00]">
            <span className="w-[7px] h-[7px] rounded-full bg-[#ff6b00] shadow-[0_0_10px_rgba(255,107,0,0.8)] animate-pulse" />
            <span>LIVE</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[#8e9dae]">
            <span className="w-[7px] h-[7px] rounded-full bg-[#8e9dae]" />
            <span>UPCOMING</span>
          </div>
        )}

        <div className="text-[#70777d]">
          MATCH <strong className="text-[#00e5ff] font-extrabold">#{matchNumber}</strong>
        </div>
      </div>

      {/* HEADING */}
      <div className="text-center mt-6">
        <span className="text-[9px] text-[#00e5ff] font-extrabold tracking-[3px] uppercase block">
          {tournamentName}
        </span>
        <h2 className="my-1 text-white font-black italic text-[30px] tracking-[1px] leading-tight font-display-lg uppercase">
          {title}
        </h2>
        <p className="m-0 text-[#737b82] text-[9px] font-extrabold tracking-[2px] uppercase">
          {game}
        </p>
      </div>

      {/* MATCH TEAMS & VS */}
      <div className="grid grid-cols-[1fr_55px_1fr] items-center mt-8">
        
        {/* TEAM 1 (CYAN) */}
        <div className="text-center">
          <div className="w-[62px] h-[62px] mx-auto flex items-center justify-center font-black italic text-[22px] rounded-[7px] -skew-x-[7deg] text-[#00e5ff] bg-[#00e5ff]/[0.07] border border-[#00e5ff]/70 shadow-[inset_0_0_20px_rgba(0,229,255,0.04),0_0_15px_rgba(0,229,255,0.08)] transition-transform duration-300 group-hover:scale-105">
            {team1.shortName}
          </div>
          <span className="block mt-2 text-[#60676d] text-[7px] font-extrabold tracking-[2px] uppercase">
            TEAM
          </span>
          <h3 className="m-0 mt-1 text-[#eeeeee] text-[12px] font-black tracking-[0.5px] truncate px-1 uppercase">
            {team1.name}
          </h3>
          <div className="mt-2 font-black italic text-[34px] leading-none text-[#00e5ff] drop-shadow-[0_0_12px_rgba(0,229,255,0.25)]">
            {team1.score}
          </div>
        </div>

        {/* VS DIVIDER */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-[1px] h-[20px] bg-gradient-to-b from-[#00e5ff] to-transparent" />
          <span className="text-white font-black italic text-[18px] tracking-wider">
            VS
          </span>
          <div className="w-[1px] h-[20px] bg-gradient-to-t from-[#ff6b00] to-transparent" />
        </div>

        {/* TEAM 2 (ORANGE) */}
        <div className="text-center">
          <div className="w-[62px] h-[62px] mx-auto flex items-center justify-center font-black italic text-[22px] rounded-[7px] -skew-x-[7deg] text-[#ff6b00] bg-[#ff6b00]/[0.07] border border-[#ff6b00]/70 shadow-[inset_0_0_20px_rgba(255,107,0,0.04),0_0_15px_rgba(255,107,0,0.08)] transition-transform duration-300 group-hover:scale-105">
            {team2.shortName}
          </div>
          <span className="block mt-2 text-[#60676d] text-[7px] font-extrabold tracking-[2px] uppercase">
            TEAM
          </span>
          <h3 className="m-0 mt-1 text-[#eeeeee] text-[12px] font-black tracking-[0.5px] truncate px-1 uppercase">
            {team2.name}
          </h3>
          <div className="mt-2 font-black italic text-[34px] leading-none text-[#ff6b00] drop-shadow-[0_0_12px_rgba(255,107,0,0.2)]">
            {team2.score}
          </div>
        </div>

      </div>

      {/* MATCH INFORMATION HUD */}
      <div className="grid grid-cols-3 mt-6 border-y border-[#292d31] bg-[#0b0c0e]/40">
        <div className="py-[11px] px-1 text-center">
          <span className="block text-[#60676d] text-[7px] font-extrabold tracking-[1.5px] uppercase">
            FORMAT
          </span>
          <strong className="block mt-1 text-[#eeeeee] text-[11px] font-bold">
            {format}
          </strong>
        </div>

        <div className="py-[11px] px-1 text-center border-x border-[#292d31]">
          <span className="block text-[#60676d] text-[7px] font-extrabold tracking-[1.5px] uppercase">
            MAP
          </span>
          <strong className="block mt-1 text-[#eeeeee] text-[11px] font-bold">
            {mapName}
          </strong>
        </div>

        <div className="py-[11px] px-1 text-center">
          <span className="block text-[#60676d] text-[7px] font-extrabold tracking-[1.5px] uppercase">
            STATUS
          </span>
          <strong className="block mt-1 text-[#ff6b00] text-[11px] font-bold uppercase">
            {status}
          </strong>
        </div>
      </div>

      {/* VIEW MATCH BUTTON (ANGLED CLIP-PATH) */}
      <button
        onClick={onViewMatch}
        type="button"
        className="w-full mt-5 py-3 px-4 flex justify-between items-center bg-[#00e5ff] hover:bg-white text-[#061014] text-[10px] font-black tracking-[1.5px] cursor-pointer transition-all duration-250 border border-[#00e5ff] hover:border-white hover:shadow-[0_0_20px_rgba(0,229,255,0.3)] [clip-path:polygon(0_0,calc(100%-10px)_0,100%_10px,100%_100%,10px_100%,0_calc(100%-10px))]"
      >
        <span>VIEW MATCH</span>
        <span className="text-[18px] transition-transform duration-250 group-hover:translate-x-1.5 leading-none">
          &rarr;
        </span>
      </button>

      {/* HUD ACCENT DECORATIONS */}
      <div className="absolute bottom-[28px] left-[10px] w-[18px] h-[2px] bg-[#00e5ff] opacity-60" />
      <div className="absolute top-[95px] right-[10px] w-[18px] h-[2px] bg-[#ff6b00] opacity-60" />

      {/* FOOTER WATERMARK */}
      <div className="absolute bottom-[10px] left-[22px] text-[#3d444a] text-[7px] tracking-[2px] font-mono">
        MJ // ESPORTS
      </div>

    </div>
  )
}
