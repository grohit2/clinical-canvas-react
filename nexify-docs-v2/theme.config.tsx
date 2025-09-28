import React from 'react'

export default {
  logo: <span>Nexify Docs</span>,
  project: {
    link: 'https://example.com/repo' // TODO replace
  },
  docsRepositoryBase: 'https://example.com/repo/blob/main/pages',
  footer: { text: 'Nexify · living docs' },
  useNextSeoProps() {
    return { titleTemplate: '%s – Nexify' }
  }
}
