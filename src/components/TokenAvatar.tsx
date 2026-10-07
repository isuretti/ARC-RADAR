/** Token avatar — initials fallback since most Arc tokens won't have logos yet */

interface TokenAvatarProps {
  symbol: string;
  logoUri?: string;
  size?: number;
}

const SYMBOL_COLORS: [string, string][] = [
  ['#acc6e9', '#0d1b2f'],
  ['#8dd89f', '#0f2318'],
  ['#e86d7a', '#2a0f14'],
  ['#f0c46a', '#2a1f06'],
  ['#b494f7', '#180f2a'],
  ['#5fc8e8', '#091d27'],
];

function colorForSymbol(symbol: string): [string, string] {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) & 0xffff;
  return SYMBOL_COLORS[h % SYMBOL_COLORS.length] ?? ['#acc6e9', '#0d1b2f'];
}

export function TokenAvatar({ symbol, logoUri, size = 36 }: TokenAvatarProps) {
  const [bg, fg] = colorForSymbol(symbol ?? '?');
  const initials = (symbol ?? '?').slice(0, 2).toUpperCase();

  if (logoUri) {
    return (
      <img
        src={logoUri}
        alt={symbol}
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 font-bold"
      style={{
        width: size,
        height: size,
        background: bg,
        color: fg,
        fontSize: size * 0.33,
        fontFamily: "'Space Grotesk', sans-serif",
        letterSpacing: '-0.01em',
      }}
    >
      {initials}
    </div>
  );
}
