"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Users, MapPin } from 'lucide-react';

interface SignupAlert {
  id: string;
  username: string;
  country: string;
  flag: string;
  timeAgo: string;
  progress: number;
}

const countries = [
  { name: 'United States', flag: '🇺🇸' },
  { name: 'United Kingdom', flag: '🇬🇧' },
  { name: 'Canada', flag: '🇨🇦' },
  { name: 'Australia', flag: '🇦🇺' },
  { name: 'Germany', flag: '🇩🇪' },
  { name: 'France', flag: '🇫🇷' },
  { name: 'Japan', flag: '🇯🇵' },
  { name: 'South Korea', flag: '🇰🇷' },
  { name: 'Brazil', flag: '🇧🇷' },
  { name: 'India', flag: '🇮🇳' },
  { name: 'China', flag: '🇨🇳' },
  { name: 'Russia', flag: '🇷🇺' },
  { name: 'Mexico', flag: '🇲🇽' },
  { name: 'Spain', flag: '🇪🇸' },
  { name: 'Italy', flag: '🇮🇹' },
  { name: 'Netherlands', flag: '🇳🇱' },
  { name: 'Sweden', flag: '🇸🇪' },
  { name: 'Norway', flag: '🇳🇴' },
  { name: 'Switzerland', flag: '🇨🇭' },
  { name: 'Singapore', flag: '🇸🇬' },
  { name: 'Thailand', flag: '🇹🇭' },
  { name: 'Philippines', flag: '🇵🇭' },
  { name: 'Indonesia', flag: '🇮🇩' },
  { name: 'Malaysia', flag: '🇲🇾' },
  { name: 'Vietnam', flag: '🇻🇳' },
  { name: 'Turkey', flag: '🇹🇷' },
  { name: 'Egypt', flag: '🇪🇬' },
  { name: 'South Africa', flag: '🇿🇦' },
  { name: 'Nigeria', flag: '🇳🇬' },
  { name: 'Kenya', flag: '🇰🇪' },
  { name: 'Argentina', flag: '🇦🇷' },
  { name: 'Chile', flag: '🇨🇱' },
  { name: 'Colombia', flag: '🇨🇴' },
  { name: 'Peru', flag: '🇵🇪' },
  { name: 'Venezuela', flag: '🇻🇪' },
  { name: 'Ukraine', flag: '🇺🇦' },
  { name: 'Poland', flag: '🇵🇱' },
  { name: 'Czech Republic', flag: '🇨🇿' },
  { name: 'Hungary', flag: '🇭🇺' },
  { name: 'Romania', flag: '🇷🇴' },
  { name: 'Greece', flag: '🇬🇷' },
  { name: 'Portugal', flag: '🇵🇹' },
  { name: 'Belgium', flag: '🇧🇪' },
  { name: 'Austria', flag: '🇦🇹' },
  { name: 'Denmark', flag: '🇩🇰' },
  { name: 'Finland', flag: '🇫🇮' },
  { name: 'Ireland', flag: '🇮🇪' },
  { name: 'New Zealand', flag: '🇳🇿' },
  { name: 'Israel', flag: '🇮🇱' },
  { name: 'UAE', flag: '🇦🇪' },
  { name: 'Saudi Arabia', flag: '🇸🇦' },
  { name: 'Qatar', flag: '🇶🇦' },
  { name: 'Kuwait', flag: '🇰🇼' },
  { name: 'Bahrain', flag: '🇧🇭' },
  { name: 'Oman', flag: '🇴🇲' },
  { name: 'Jordan', flag: '🇯🇴' },
  { name: 'Lebanon', flag: '🇱🇧' },
  { name: 'Morocco', flag: '🇲🇦' },
  { name: 'Tunisia', flag: '🇹🇳' },
  { name: 'Algeria', flag: '🇩🇿' },
  { name: 'Ghana', flag: '🇬🇭' },
  { name: 'Ethiopia', flag: '🇪🇹' },
  { name: 'Tanzania', flag: '🇹🇿' },
  { name: 'Uganda', flag: '🇺🇬' },
  { name: 'Rwanda', flag: '🇷🇼' },
  { name: 'Botswana', flag: '🇧🇼' },
  { name: 'Namibia', flag: '🇳🇦' },
  { name: 'Zambia', flag: '🇿🇲' },
  { name: 'Zimbabwe', flag: '🇿🇼' },
  { name: 'Mozambique', flag: '🇲🇿' },
  { name: 'Madagascar', flag: '🇲🇬' },
  { name: 'Mauritius', flag: '🇲🇺' },
  { name: 'Seychelles', flag: '🇸🇨' },
  { name: 'Maldives', flag: '🇲🇻' },
  { name: 'Sri Lanka', flag: '🇱🇰' },
  { name: 'Bangladesh', flag: '🇧🇩' },
  { name: 'Pakistan', flag: '🇵🇰' },
  { name: 'Afghanistan', flag: '🇦🇫' },
  { name: 'Nepal', flag: '🇳🇵' },
  { name: 'Bhutan', flag: '🇧🇹' },
  { name: 'Myanmar', flag: '🇲🇲' },
  { name: 'Cambodia', flag: '🇰🇭' },
  { name: 'Laos', flag: '🇱🇦' },
  { name: 'Mongolia', flag: '🇲🇳' },
  { name: 'Kazakhstan', flag: '🇰🇿' },
  { name: 'Uzbekistan', flag: '🇺🇿' },
  { name: 'Kyrgyzstan', flag: '🇰🇬' },
  { name: 'Tajikistan', flag: '🇹🇯' },
  { name: 'Turkmenistan', flag: '🇹🇲' },
  { name: 'Azerbaijan', flag: '🇦🇿' },
  { name: 'Armenia', flag: '🇦🇲' },
  { name: 'Georgia', flag: '🇬🇪' },
  { name: 'Moldova', flag: '🇲🇩' },
  { name: 'Belarus', flag: '🇧🇾' },
  { name: 'Lithuania', flag: '🇱🇹' },
  { name: 'Latvia', flag: '🇱🇻' },
  { name: 'Estonia', flag: '🇪🇪' },
  { name: 'Slovenia', flag: '🇸🇮' },
  { name: 'Croatia', flag: '🇭🇷' },
  { name: 'Bosnia', flag: '🇧🇦' },
  { name: 'Serbia', flag: '🇷🇸' },
  { name: 'Montenegro', flag: '🇲🇪' },
  { name: 'North Macedonia', flag: '🇲🇰' },
  { name: 'Albania', flag: '🇦🇱' },
  { name: 'Bulgaria', flag: '🇧🇬' },
  { name: 'Slovakia', flag: '🇸🇰' },
  { name: 'Luxembourg', flag: '🇱🇺' },
  { name: 'Malta', flag: '🇲🇹' },
  { name: 'Cyprus', flag: '🇨🇾' },
  { name: 'Iceland', flag: '🇮🇸' }
];

// Dynamic username generator
const generateRandomUsername = (): string => {
  const prefixes = [
    'crypto', 'bitcoin', 'ethereum', 'defi', 'nft', 'web3', 'blockchain', 'digital',
    'smart', 'tech', 'cyber', 'meta', 'quantum', 'alpha', 'beta', 'gamma', 'delta',
    'omega', 'prime', 'ultra', 'mega', 'super', 'hyper', 'neo', 'pro', 'elite',
    'master', 'expert', 'ninja', 'wizard', 'guru', 'sage', 'legend', 'titan',
    'phoenix', 'dragon', 'wolf', 'eagle', 'lion', 'tiger', 'shark', 'falcon',
    'storm', 'thunder', 'lightning', 'fire', 'ice', 'shadow', 'ghost', 'spirit',
    'void', 'cosmic', 'stellar', 'lunar', 'solar', 'nova', 'comet', 'meteor',
    'galaxy', 'universe', 'infinity', 'matrix', 'nexus', 'vertex', 'apex',
    'zenith', 'summit', 'peak', 'crown', 'royal', 'noble', 'diamond', 'gold',
    'silver', 'platinum', 'emerald', 'ruby', 'sapphire', 'crystal', 'pearl'
  ];

  const suffixes = [
    'trader', 'investor', 'holder', 'miner', 'staker', 'farmer', 'hunter', 'seeker',
    'builder', 'creator', 'maker', 'pioneer', 'explorer', 'voyager', 'navigator',
    'guardian', 'warrior', 'knight', 'champion', 'hero', 'legend', 'master',
    'expert', 'pro', 'ace', 'star', 'king', 'queen', 'prince', 'duke', 'lord',
    'chief', 'boss', 'captain', 'commander', 'general', 'admiral', 'marshal',
    'ranger', 'scout', 'agent', 'operative', 'specialist', 'technician', 'engineer',
    'architect', 'designer', 'developer', 'coder', 'hacker', 'geek', 'nerd',
    'genius', 'brain', 'mind', 'soul', 'heart', 'spirit', 'force', 'power',
    'energy', 'wave', 'pulse', 'beam', 'ray', 'flash', 'spark', 'flame',
    'blaze', 'storm', 'wind', 'tide', 'flow', 'stream', 'river', 'ocean'
  ];

  const numbers = ['', '1', '2', '3', '7', '9', '21', '42', '69', '88', '99', '100', '420', '777', '888', '999'];
  const separators = ['_', '', '.', '-'];
  const specialChars = ['', 'x', 'z', 'v2', 'pro', 'max', 'plus', 'ultra'];

  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  const number = numbers[Math.floor(Math.random() * numbers.length)];
  const separator = separators[Math.floor(Math.random() * separators.length)];
  const special = specialChars[Math.floor(Math.random() * specialChars.length)];

  // Different username patterns
  const patterns = [
    `${prefix}${separator}${suffix}${number}`,
    `${prefix}${number}${separator}${suffix}`,
    `${prefix}${separator}${suffix}${separator}${special}`,
    `${special}${separator}${prefix}${separator}${suffix}`,
    `${prefix}${suffix}${number}`,
    `${number}${prefix}${separator}${suffix}`,
    `${prefix}${separator}${special}${separator}${suffix}`,
    `${prefix}${number}${special}`
  ];

  const pattern = patterns[Math.floor(Math.random() * patterns.length)];
  
  // Clean up empty separators and ensure reasonable length
  return pattern.replace(/_{2,}/g, '_').replace(/^_|_$/g, '').substring(0, 20);
};

export function SignupAlert() {
  const [alerts, setAlerts] = useState<SignupAlert[]>([]);
  const [usedUsernames, setUsedUsernames] = useState<Set<string>>(new Set());

  const generateRandomAlert = (): SignupAlert => {
    let username = generateRandomUsername();
    
    // Ensure username is unique in recent history
    let attempts = 0;
    while (usedUsernames.has(username) && attempts < 10) {
      username = generateRandomUsername();
      attempts++;
    }

    const randomCountry = countries[Math.floor(Math.random() * countries.length)];
    const timeOptions = ['just now', '1 min ago', '2 min ago', '3 min ago', '5 min ago'];
    const randomTime = timeOptions[Math.floor(Math.random() * timeOptions.length)];

    return {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      username,
      country: randomCountry.name,
      flag: randomCountry.flag,
      timeAgo: randomTime,
      progress: 0
    };
  };

  useEffect(() => {
    // Show first alert after random initial delay (2-5 seconds)
    const initialDelay = Math.random() * 3000 + 2000;
    const initialTimeout = setTimeout(() => {
      const newAlert = generateRandomAlert();
      setAlerts([newAlert]);
      setUsedUsernames(prev => {
        const updated = new Set([...prev, newAlert.username]);
        // Keep only last 50 usernames to prevent memory issues
        if (updated.size > 50) {
          const array = Array.from(updated);
          return new Set(array.slice(-50));
        }
        return updated;
      });
    }, initialDelay);

    // Then show new alerts with random intervals (5-20 seconds)
    const scheduleNextAlert = () => {
      const randomDelay = Math.random() * 15000 + 5000; // 5-20 seconds
      setTimeout(() => {
        const newAlert = generateRandomAlert();
        setAlerts(prev => {
          // Keep only the last 3 alerts
          const updated = [newAlert, ...prev].slice(0, 3);
          return updated;
        });
        setUsedUsernames(prev => {
          const updated = new Set([...prev, newAlert.username]);
          // Keep only last 50 usernames
          if (updated.size > 50) {
            const array = Array.from(updated);
            return new Set(array.slice(-50));
          }
          return updated;
        });
        scheduleNextAlert(); // Schedule the next one
      }, randomDelay);
    };

    scheduleNextAlert();

    return () => {
      clearTimeout(initialTimeout);
    };
  }, []);

  // Auto-remove alerts after random duration (6-12 seconds)
  useEffect(() => {
    alerts.forEach(alert => {
      const autoRemoveDelay = Math.random() * 6000 + 6000; // 6-12 seconds
      const timeout = setTimeout(() => {
        setAlerts(prev => prev.filter(a => a.id !== alert.id));
      }, autoRemoveDelay);

      return () => clearTimeout(timeout);
    });
  }, [alerts]);

  const removeAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  if (alerts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-2 sm:right-4 z-50 space-y-2">
      {alerts.map((alert, index) => (
        <div
          key={alert.id}
          className={`
            bg-white border border-green-200 rounded-lg shadow-lg p-3 sm:p-4 
            w-72 sm:w-80 md:w-96
            transform transition-all duration-500 ease-in-out
            ${index === 0 ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-90'}
            hover:shadow-xl hover:scale-105
            animate-slideInRight
          `}
          style={{
            animationDelay: `${index * 100}ms`
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                    {alert.username}
                  </p>
                  <span className="text-green-600 text-xs font-medium flex-shrink-0">joined!</span>
                </div>
                <div className="flex items-center space-x-1 text-xs text-gray-600">
                  <span className="text-base sm:text-lg">{alert.flag}</span>
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{alert.country}</span>
                  <span className="flex-shrink-0">•</span>
                  <span className="flex-shrink-0">{alert.timeAgo}</span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeAlert(alert.id)}
              className="text-gray-400 hover:text-gray-600 p-1 h-auto flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Progress bar animation */}
          <div className="mt-3 w-full bg-gray-200 rounded-full h-1">
            <div 
              className="bg-gradient-to-r from-green-400 to-emerald-500 h-1 rounded-full animate-progressBar"
            />
          </div>
        </div>
      ))}

      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes progressBar {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
        
        .animate-slideInRight {
          animation: slideInRight 0.5s ease-out forwards;
        }
        
        .animate-progressBar {
          animation: progressBar 8s linear forwards;
        }
      `}</style>
    </div>
  );
}