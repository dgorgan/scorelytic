'use client';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './Header.module.css';
import { API_CONFIG } from '@/../shared/src/constants/api';
import { useState } from 'react';

const getDemosUrl = () => {
  // Always use BASE_URL from API_CONFIG, append /demos/index.html
  return `${API_CONFIG.BASE_URL.replace(/\/$/, '')}/demos/index.html`;
};

const Header = () => {
  const [demosUrl, setDemosUrl] = React.useState(getDemosUrl());
  const [menuOpen, setMenuOpen] = useState(false);

  React.useEffect(() => {
    setDemosUrl(getDemosUrl());
  }, []);

  return (
    <nav className={styles.navbar}>
      <div className={styles.navbarLeft}>
        <Link href="/dashboard" title="Go to Scorelytic App" className={styles.logoLink}>
          <Image
            src="/scorelytic-logo.png"
            alt="Scorelytic Logo"
            width={170}
            height={40}
            className={styles.navbarLogo}
            style={{ width: '170px', height: '40px', objectFit: 'contain', maxWidth: '100%' }}
            priority
          />
        </Link>
      </div>
      {/* Desktop nav */}
      <div className={styles.navbarRight + ' hidden sm:flex'}>
        <Link href="/game-demos" className={styles.navbarLink}>
          Games
        </Link>
        <a href={demosUrl} className={styles.navbarLink} rel="noopener noreferrer">
          Demos
        </a>
      </div>
      {/* Hamburger for mobile */}
      <button
        className="sm:hidden flex flex-col justify-center items-center w-10 h-10 ml-2 rounded focus:outline-none"
        aria-label="Open menu"
        onClick={() => setMenuOpen((v) => !v)}
      >
        <span className="block w-6 h-0.5 bg-white mb-1 rounded" />
        <span className="block w-6 h-0.5 bg-white mb-1 rounded" />
        <span className="block w-6 h-0.5 bg-white rounded" />
      </button>
      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-gradient-to-b from-[#e0b6f9] to-[#a18aff] flex flex-col items-center justify-start pt-24 sm:hidden animate-slide-down">
          <button
            className="absolute top-6 right-6 text-violet-900 text-3xl"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          >
            &times;
          </button>
          <Link
            href="/game-demos"
            className="w-full text-center py-6 text-2xl font-bold text-violet-900 transition-all duration-200 border-b border-violet-100 focus:bg-[#a18aff] focus:text-white hover:bg-[#a18aff] hover:text-white active:scale-95 font-orbitron"
            onClick={() => setMenuOpen(false)}
          >
            Games
          </Link>
          <a
            href={demosUrl}
            className="w-full text-center py-6 text-2xl font-bold text-violet-900 transition-all duration-200 focus:bg-[#a18aff] focus:text-white hover:bg-[#a18aff] hover:text-white active:scale-95 font-orbitron"
            rel="noopener noreferrer"
            onClick={() => setMenuOpen(false)}
          >
            Demos
          </a>
        </div>
      )}
    </nav>
  );
};

export default Header;
