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
  video: 'media/dolios-explainer.mp4',
  poster: 'media/dolios-explainer.jpg',
};
