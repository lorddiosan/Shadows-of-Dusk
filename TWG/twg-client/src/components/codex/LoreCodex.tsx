import React, { useState } from 'react';
import { BookOpen, Globe2, Compass, ShieldAlert } from 'lucide-react';
import { FACTIONS } from '../../data/factions';

export const LoreCodex: React.FC = () => {
  const [selectedFactionId, setSelectedFactionId] = useState<string>(FACTIONS[0].id);
  const activeFaction = FACTIONS.find(f => f.id === selectedFactionId) || FACTIONS[0];

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-6">
      {/* Lore Header */}
      <div className="bg-gradient-to-r from-purple-950 via-zinc-950 to-rose-950 border border-purple-900/40 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center space-x-2 text-purple-400 font-bold text-xs uppercase tracking-widest">
          <Globe2 className="w-4 h-4" />
          <span>The Convergence Chronicles</span>
        </div>
        <h1 className="text-3xl font-black text-white mt-1">Shadows of Dusk Lore Archive</h1>
        <p className="text-xs text-zinc-300 max-w-2xl mt-1">
          The Main World serves as the physical collision point where reality is unstable enough to be shaped. The Above Realms seek absolute celestial control, the Below Realms seek total annihilation of order, and colliding parallel realities spill tech, relics, and titans across the battlefield.
        </p>
      </div>

      {/* Cosmic Realities & Realms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900/80 border border-sky-900/50 rounded-xl p-4">
          <div className="flex items-center space-x-2 text-sky-400 font-bold text-sm">
            <span>☀️</span>
            <span>The Above Realms</span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            <strong>Heaven, Celestial Realm, Beyond Realm</strong>: Cold divine architecture seeking perfection, order, and control at all costs. Mortals are viewed as flawed code to be wiped clean or rewritten.
          </p>
        </div>

        <div className="bg-zinc-900/80 border border-rose-900/50 rounded-xl p-4">
          <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm">
            <span>🌍</span>
            <span>The Main World (Battlefield)</span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            <strong>The Convergence Point</strong>: The sole realm where divine blood, parallel technologies, and magic interact physically. Here, reality fractures and empires clash for ultimate dominion.
          </p>
        </div>

        <div className="bg-zinc-900/80 border border-amber-900/50 rounded-xl p-4">
          <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
            <span>🔥</span>
            <span>The Below Realms</span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            <strong>Abyss, Hell, Void</strong>: Structured infernal legions, endless abyssal mutations, and void entities striving to shatter the cosmic design and break free from celestial imprisonment.
          </p>
        </div>
      </div>

      {/* Factions Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Faction Selector List */}
        <div className="lg:col-span-4 space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 px-1">Factions of Dusk</h2>
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
            {FACTIONS.map(f => (
              <button
                key={f.id}
                onClick={() => setSelectedFactionId(f.id)}
                className={`w-full p-3 rounded-xl border text-left flex items-center space-x-3 transition ${
                  selectedFactionId === f.id
                    ? 'bg-rose-950/70 border-rose-500 shadow-md shadow-rose-950/50 text-white'
                    : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                }`}
              >
                <span className="text-2xl">{f.symbol}</span>
                <div className="overflow-hidden">
                  <span className="font-bold text-sm block truncate">{f.name}</span>
                  <span className="text-[11px] text-zinc-400 block truncate">{f.leaderName}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Faction Codex Dossier */}
        <div className="lg:col-span-8 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs uppercase tracking-widest text-rose-400 font-bold font-mono">Codex Dossier</span>
              <h2 className="text-2xl font-black text-white flex items-center space-x-3 mt-1">
                <span>{activeFaction.symbol}</span>
                <span>{activeFaction.name}</span>
              </h2>
              <p className="text-sm text-zinc-300 font-medium mt-0.5">{activeFaction.title}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-zinc-500 uppercase block font-mono">Supreme Leader</span>
              <span className="text-sm font-bold text-amber-400">{activeFaction.leaderName}</span>
            </div>
          </div>

          <blockquote className="border-l-4 border-rose-600 pl-4 py-1 italic font-serif text-zinc-300 text-sm bg-rose-950/20 rounded-r-lg">
            "{activeFaction.quote}"
          </blockquote>

          <div>
            <h3 className="text-xs uppercase font-bold tracking-wider text-zinc-400 mb-2">Faction Background</h3>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed bg-zinc-950/80 p-4 rounded-xl border border-zinc-800">
              {activeFaction.loreSummary}
            </p>
          </div>

          <div>
            <h3 className="text-xs uppercase font-bold tracking-wider text-zinc-400 mb-2">Tactical Battle Traits</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {activeFaction.strengths.map((str, idx) => (
                <div key={idx} className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl">
                  <span className="text-xs font-bold text-rose-300 block">✦ Trait {idx + 1}</span>
                  <span className="text-xs text-zinc-300 font-medium mt-1 block">{str}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
