// Site settings — edit here, everything else reads from this file.
export const SITE = {
  token: {
    ticker: '$DOLIOS',
    ca: '',            // contract address — empty shows "Coming soon"
    chain: 'sol',      // sol | bsc | base | eth (used for the GMGN chart link)
  },
  x: '',               // X / Twitter handle without @, e.g. 'DoliosAgent' — empty hides the link
  github: 'https://github.com/DoliosAgent/dolios',
  installWin: 'irm https://raw.githubusercontent.com/DoliosAgent/dolios/main/install-dolios.ps1 | iex',
  installUnix: 'curl -fsSL https://raw.githubusercontent.com/DoliosAgent/dolios/main/install-dolios.sh | bash',
  videos: [
    { id: 'action', label: 'See it in action', note: 'Live tool calls in the Dolios terminal', src: 'media/dolios-in-action.mp4', poster: 'media/dolios-in-action.jpg', chapters: 'media/chapters-in-action.json' },
    { id: 'explainer', label: '1-minute explainer', note: 'What Dolios does, narrated', src: 'media/dolios-explainer.mp4', poster: 'media/dolios-explainer.jpg', chapters: 'media/chapters.json' },
  ],
};
