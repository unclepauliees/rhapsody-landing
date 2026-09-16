# Rhapsody pre-launch landing page

Next.js static landing page announcing first light on 5 October 2026.
The invitation button opens the visitor's email app with a message addressed
to ProjectRhapsodyRSVP@theconcretegrp.com. Visitors must send that email;
the website does not store submissions or require a backend.

## Development

```bash
npm ci
npm run dev
```

## Verify and Deploy

```bash
npm run lint
npm run build:firebase
firebase deploy --only hosting --project project-rhapsody-eb1bc
```

Firebase runs the static build automatically before deployment. The hosting
configuration targets only the main site, `project-rhapsody-eb1bc`, and never
the separate investor-deck site. No email-provider environment variables or
paid signup services are needed.

Default hosting URL: https://project-rhapsody-eb1bc.web.app
Custom domain: https://project-rhapsody.com

The custom domain requires its root A records to point to `199.36.158.100`.
Keep Firebase verification TXT records and unrelated email DNS records intact.

GitHub Pages also builds on pushes to main, using its repository base path.
The invitation link works on both hosting destinations.

See `NOTES_components.md` for visual component implementation details.
