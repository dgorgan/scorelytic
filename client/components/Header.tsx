'use client';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './Header.module.css';
import { API_CONFIG } from '@/../shared/src/constants/api';

const getDemosUrl = () => {
  // Always use BASE_URL from API_CONFIG, append /demos/index.html
  return `${API_CONFIG.BASE_URL.replace(/\/$/, '')}/demos/index.html`;
};

const Header = () => {
  const [demosUrl, setDemosUrl] = React.useState(getDemosUrl());

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
            width={140}
            height={46}
            className={styles.navbarLogo}
            priority
          />
        </Link>
      </div>
      <div className={styles.navbarRight}>
        <Link href="/game-demos" className={styles.navbarLink}>
          Games
        </Link>
        <a href={demosUrl} className={styles.navbarLink} rel="noopener noreferrer">
          Demos
        </a>
      </div>
    </nav>
  );
};

export default Header;
