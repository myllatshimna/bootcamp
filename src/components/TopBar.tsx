import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { ScreenId } from '../types/studio';

interface TopBarProps {
  activeScreen: ScreenId;
  onSelectScreen: (screen: ScreenId) => void;
  onExportMix: () => void;
  exporting: boolean;
}

const NAV_ITEMS: { id: ScreenId; label: string }[] = [
  { id: 'deck', label: 'Studio Deck' },
  { id: 'instruments', label: 'Instruments' },
  { id: 'session-log', label: 'Session Log' },
  { id: 'calibration', label: 'Calibration' },
];

export const TopBar: React.FC<TopBarProps> = ({
  activeScreen,
  onSelectScreen,
  onExportMix,
  exporting,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (id: ScreenId) => {
    onSelectScreen(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-[#f9f9f9] border-b border-[#e5e5e5]">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleNavClick('deck')}
          className="font-display text-lg font-medium tracking-[-0.02em] text-[#000000] whitespace-nowrap shrink-0 cursor-pointer"
        >
          KLANGWERK
        </button>

        {/* Zone 2: 4 single-line navigation links */}
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-8">
          {NAV_ITEMS.map((item) => {
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`relative py-2 text-[13px] font-display font-medium tracking-[0.02em] whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 ${
                  isActive
                    ? 'text-[#000000]'
                    : 'text-[#4c4546] hover:text-[#000000]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 right-0 bottom-0 h-[2px] bg-[#fd591e]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action + mobile menu button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onExportMix}
            disabled={exporting}
            className="px-4 py-2.5 bg-[#000000] text-[#ffffff] label-md whitespace-nowrap shrink-0 cursor-pointer hover:bg-[#fd591e] transition-colors duration-150 disabled:opacity-60"
          >
            {exporting ? 'Rendering WAV...' : 'Export Mix'}
          </button>

          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden w-10 h-10 border border-[#e5e5e5] bg-[#ffffff] flex items-center justify-center text-[#000000] cursor-pointer"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile navigation"
          className="md:hidden border-t border-[#e5e5e5] bg-[#ffffff] px-4 py-2"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between py-3 px-2 border-b last:border-b-0 border-[#e5e5e5] font-display text-sm font-medium cursor-pointer ${
                  isActive ? 'text-[#fd591e]' : 'text-[#1a1c1c]'
                }`}
              >
                <span>{item.label}</span>
                {isActive && <span className="w-2 h-2 bg-[#fd591e]" />}
              </button>
            );
          })}
        </nav>
      )}
    </header>
  );
};
