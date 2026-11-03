This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000). `/` redirects to `/anchor`. [`src/app/page.tsx`](src/app/page.tsx) does the same redirect.

## Documentation

- **[`docs/README.md`](docs/README.md)** — index of internal docs (routes, ops, security, subgraph app notes).
- **[`docs/SINGLE_SOURCES.md`](docs/SINGLE_SOURCES.md)** — which ABI, config, and helper file to extend.
- **[`docs/INDEX_PAGE_PATTERN.md`](docs/INDEX_PAGE_PATTERN.md)** — handbook for Genesis / Earn / Sail index UX (UI−/UI+, shared files, porting steps).
- **Route notes:** [`docs/routes/`](docs/routes/) (`anchor.md`, `sail.md`, `genesis.md`, `earn.md`, `hytoken.md`).

Nav routes: **Earn** [`/anchor`](src/app/anchor/page.tsx) (`/` and `/earn` redirect here), **Harbor Yield** [`/hytoken`](src/app/hytoken/page.tsx) (`/harbor` redirects here), **Leverage** [`/sail`](src/app/sail/page.tsx), **Maiden Voyage** [`/genesis`](src/app/genesis/page.tsx), **Tide** [`/tide`](src/app/tide/page.tsx). Pool detail stays at `/earn/[marketId]/[poolType]`.

The [subgraph](subgraph/) package keeps its own Markdown guides next to the subgraph code. App fonts are Geo and Space Grotesk (`src/utils/fonts.ts`).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
