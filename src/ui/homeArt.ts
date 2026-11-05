// 案4「崩壊都市」の背景（デザインキャンバスから移植）
export type HomePalette = Record<string, string | number>;
export const NIGHT: HomePalette = {
      sky0: '#1c212b', sky1: '#3c3d46', sky2: '#9a6e5a', sun: '#ffd1a0', cloud: '#2a2c34', redA: 0.8,
      far: '#2c2f36', far2: '#3c3f46', heli: '#14161a', bldg: '#2b2c30', winHole: '#5a4e4c', bldgEdge: '#18191c', rebar: '#4a3a30',
      banner: '#7a2626', bannerText: '#e9d6c9', ground: '#1f2126', metal: '#3a3c40', evac: '#5a1a18', evacText: '#ff7a6a',
      concrete: '#55565a', hazA: '#d9a21b', hazB: '#1f1d1a', barrel: '#6a3a22', barrel2: '#3a3e44', crate: '#22241f',
      rubble: '#16171a', puddle: '#5a4a48', shade: '#0b0c0f',
      figure: '#2a2c30', figure2: '#4e5157', edge: '#ffbf8a', skin: '#a07a64', hair: '#1c1612', headset: '#111111', eye: '#2a1e18', lip: '#6e4438', scar: '#7a3a30',
      gun: '#121315', lens: '#5a6a78', watch: '#f07a22',
      panel: 'rgba(14,15,18,0.86)', panel2: 'rgba(26,28,32,0.92)', line: '#3e4148',
      text: '#f2f0ee', muted: '#b6b2ad', accent: '#f07a22', accentHi: '#ffa15c', onAccent: '#1a1108', gold: '#e2b54a', gunIcon: '#cfd3d8'
    };
export const DAY: HomePalette = {
      sky0: '#86aed0', sky1: '#d8dcd6', sky2: '#efdcb4', sun: '#fff8e2', cloud: '#eeeae2', redA: 0.35,
      far: '#b0a690', far2: '#9a8f7a', heli: '#4a4238', bldg: '#a39a88', winHole: '#5e5546', bldgEdge: '#6e6555', rebar: '#7a5a40',
      banner: '#a4362a', bannerText: '#fff1e2', ground: '#c7ad80', metal: '#6e6658', evac: '#a4362a', evacText: '#fff1e2',
      concrete: '#cfc6b6', hazA: '#d9a21b', hazB: '#2a231b', barrel: '#a5562c', barrel2: '#5e6e7e', crate: '#6f7350',
      rubble: '#8f7c62', puddle: '#a9a38e', shade: '#e8dcc4',
      figure: '#5a5144', figure2: '#857967', edge: '#fff0cc', skin: '#d0a283', hair: '#3a2a1e', headset: '#222222', eye: '#3a2a22', lip: '#9a5a48', scar: '#a05a48',
      gun: '#262320', lens: '#7fb3d8', watch: '#b4471c',
      panel: 'rgba(243,236,221,0.93)', panel2: 'rgba(230,218,193,0.96)', line: '#8a7658',
      text: '#2a231b', muted: '#574b3d', accent: '#b4471c', accentHi: '#2a231b', onAccent: '#fff8ee', gold: '#8a5d0e', gunIcon: '#2a231b'
    };
export function homeArt(c: HomePalette): string {
  return `<svg aria-hidden="true" viewBox="0 0 1280 720" class="home-art" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="r-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${c.sky0}"></stop>
        <stop offset="0.5" stop-color="${c.sky1}"></stop>
        <stop offset="0.7" stop-color="${c.sky2}"></stop>
      </linearGradient>
      <radialGradient id="r-sun" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="${c.sun}" stop-opacity="0.95"></stop>
        <stop offset="1" stop-color="${c.sun}" stop-opacity="0"></stop>
      </radialGradient>
      <radialGradient id="r-red" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#ff3b2a" stop-opacity="${c.redA}"></stop>
        <stop offset="1" stop-color="#ff3b2a" stop-opacity="0"></stop>
      </radialGradient>
      <linearGradient id="r-vig" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${c.shade}" stop-opacity="0.85"></stop>
        <stop offset="0.35" stop-color="${c.shade}" stop-opacity="0.15"></stop>
        <stop offset="0.75" stop-color="${c.shade}" stop-opacity="0.1"></stop>
        <stop offset="1" stop-color="${c.shade}" stop-opacity="0.7"></stop>
      </linearGradient>
      <filter id="r-blur"><feGaussianBlur stdDeviation="9"></feGaussianBlur></filter>
      <pattern id="r-win" width="22" height="26" patternUnits="userSpaceOnUse">
        <rect width="22" height="26" fill="${c.bldg}"></rect><rect x="5" y="6" width="12" height="14" fill="${c.winHole}"></rect>
      </pattern>
      <pattern id="r-fence" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <path d="M0 0 H16 M0 0 V16" stroke="${c.metal}" stroke-width="1.6" fill="none"></path>
      </pattern>
      <pattern id="r-haz" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="14" height="28" fill="${c.hazA}"></rect><rect x="14" width="14" height="28" fill="${c.hazB}"></rect>
      </pattern>
    </defs>
    <rect width="1280" height="720" fill="url(#r-sky)"></rect>
    <circle cx="1010" cy="250" r="150" fill="url(#r-sun)"></circle>
    <g fill="${c.cloud}" filter="url(#r-blur)" opacity="0.9">
      <ellipse cx="760" cy="80" rx="320" ry="60"></ellipse><ellipse cx="1180" cy="120" rx="200" ry="50"></ellipse><ellipse cx="980" cy="200" rx="160" ry="26"></ellipse>
    </g>
    <g fill="${c.far}">
      <polygon points="1060,460 1060,200 1090,190 1100,150 1130,150 1140,200 1170,210 1170,460"></polygon>
      <polygon points="1180,460 1180,280 1220,270 1236,300 1280,300 1280,460"></polygon>
      <polygon points="880,460 880,330 920,320 940,350 980,350 980,460"></polygon>
    </g>
    <g fill="${c.far2}">
      <rect x="1080" y="230" width="6" height="200"></rect><rect x="1110" y="230" width="6" height="200"></rect><rect x="1140" y="230" width="6" height="200"></rect>
    </g>
    <g transform="translate(1010 120)">
      <ellipse cx="0" cy="0" rx="46" ry="12" fill="${c.heli}"></ellipse>
      <path d="M40 -2 L90 -6 L92 0 L42 6 Z" fill="${c.heli}"></path>
      <path d="M-70 -14 H70 M30 -14 H130" stroke="${c.heli}" stroke-width="2"></path>
      <rect x="-20" y="10" width="40" height="3" fill="${c.heli}"></rect>
    </g>
    <g>
      <polygon points="360,520 360,90 420,70 440,110 520,100 520,30 560,20 600,60 640,60 640,520" fill="url(#r-win)"></polygon>
      <path d="M520 100 L560 140 L600 120 L640 170 L640 60 L600 60 L560 20 L520 30 Z" fill="${c.sky1}" opacity="0.6"></path>
      <path d="M360 90 L360 520 M640 60 L640 520" stroke="${c.bldgEdge}" stroke-width="5"></path>
      <polygon points="640,520 640,200 700,190 720,230 760,230 760,520" fill="url(#r-win)"></polygon>
      <path d="M380 180 L340 200 M400 260 L350 300 M620 150 L680 120" stroke="${c.rebar}" stroke-width="2"></path>
    </g>
    <g>
      <rect x="610" y="160" width="140" height="240" fill="${c.banner}"></rect>
      <path d="M610 400 L626 380 L642 410 L660 384 L680 420 L700 388 L720 416 L736 392 L750 410 L750 400 L610 400 Z" fill="${c.banner}"></path>
      <text x="628" y="250" font-family="Barlow Condensed, sans-serif" font-weight="800" font-size="78" fill="${c.bannerText}">S-07</text>
      <text x="628" y="290" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="17" fill="${c.bannerText}" letter-spacing="1">SURVIVOR</text>
      <text x="628" y="312" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="17" fill="${c.bannerText}" letter-spacing="1">SAFE ZONE</text>
      <rect x="610" y="340" width="140" height="22" fill="url(#r-haz)"></rect>
    </g>
    <polygon points="0,720 0,500 400,480 800,470 1280,490 1280,720" fill="${c.ground}"></polygon>
    <g>
      <rect x="860" y="440" width="420" height="120" fill="url(#r-fence)" opacity="0.8"></rect>
      <g stroke="${c.metal}" stroke-width="5"><line x1="860" y1="430" x2="860" y2="570"></line><line x1="1000" y1="430" x2="1000" y2="570"></line><line x1="1140" y1="430" x2="1140" y2="570"></line><line x1="860" y1="440" x2="1280" y2="440"></line></g>
      <circle cx="860" cy="426" r="34" fill="url(#r-red)"></circle><circle cx="1140" cy="426" r="34" fill="url(#r-red)"></circle>
      <circle cx="860" cy="426" r="5" fill="#ff4a36"></circle><circle cx="1140" cy="426" r="5" fill="#ff4a36"></circle>
      <rect x="1030" y="470" width="190" height="60" fill="${c.evac}"></rect>
      <text x="1048" y="514" font-family="Barlow Condensed, sans-serif" font-weight="800" font-size="38" fill="${c.evacText}" letter-spacing="2">EVAC ››</text>
    </g>
    <g>
      <polygon points="760,620 780,540 900,534 924,620" fill="${c.concrete}"></polygon>
      <polygon points="780,560 900,554 908,580 784,586" fill="url(#r-haz)"></polygon>
      <polygon points="930,640 950,560 1080,552 1104,640" fill="${c.concrete}"></polygon>
      <polygon points="950,580 1080,572 1088,600 954,606" fill="url(#r-haz)"></polygon>
      <rect x="1130" y="560" width="70" height="110" rx="6" fill="${c.barrel}"></rect>
      <rect x="1206" y="580" width="74" height="110" rx="6" fill="${c.barrel2}"></rect>
      <rect x="1130" y="590" width="70" height="6" fill="${c.metal}"></rect><rect x="1130" y="630" width="70" height="6" fill="${c.metal}"></rect>
      <rect x="1206" y="610" width="74" height="6" fill="${c.metal}"></rect><rect x="1206" y="650" width="74" height="6" fill="${c.metal}"></rect>
      <rect x="960" y="640" width="150" height="80" fill="${c.crate}"></rect>
    </g>
    <g fill="${c.rubble}">
      <polygon points="0,720 0,600 80,580 140,620 220,590 300,640 380,620 420,720"></polygon>
      <polygon points="60,600 120,560 150,600"></polygon><polygon points="220,600 280,570 300,610"></polygon>
    </g>
    <g fill="${c.puddle}" opacity="0.7"><ellipse cx="820" cy="680" rx="160" ry="10"></ellipse></g>

    <rect width="1280" height="720" fill="url(#r-vig)"></rect>
  </svg>`;
}
