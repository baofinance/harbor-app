# Harbor Marks Setup - Step by Step Walkthrough

## Current Status

We've set up the basic structure, but there are AssemblyScript compilation issues that need to be resolved. Here's what we've accomplished and what's next:

## ✅ Completed

1. ✅ Installed The Graph CLI
2. ✅ Installed subgraph dependencies
3. ✅ Created schema with flexible rules system
4. ✅ Created ABI file with events
5. ✅ Generated TypeScript types
6. ⚠️ Build has AssemblyScript compilation errors (needs fixing)

## 🔧 Next Steps to Fix Build

The AssemblyScript compiler is crashing. This is likely due to:

- Type assertion issues (`as BigInt`, `as BigDecimal`)
- Nullable type handling
- Complex operations on nullable values

### Quick Fix Approach

1. **Simplify the code** - Remove complex nullable operations
2. **Use explicit null checks** - Avoid type assertions where possible
3. **Test incrementally** - Get a minimal version working first

### Alternative: Use The Graph Studio Template

If the AssemblyScript issues persist, you can:

1. Use The Graph Studio's template generator
2. Start with a simpler schema
3. Add complexity gradually

## 📋 Setup Checklist

- [ ] Fix AssemblyScript compilation errors
- [ ] Create subgraph in The Graph Studio
- [ ] Get deployment key
- [ ] Update `subgraph.yaml` with correct network and start block
- [ ] Build successfully
- [ ] Deploy to The Graph Studio
- [ ] Wait for sync
- [ ] Get GraphQL endpoint
- [ ] Add `NEXT_PUBLIC_GRAPH_URL` to `.env.local`
- [ ] Test the `useHarborMarks` hook

## 🚀 Once Build Works

1. **Authenticate:**

   ```bash
   graph auth --studio <YOUR_DEPLOYMENT_KEY>
   ```

2. **Deploy:**

   ```bash
   npm run deploy
   ```

3. **Get Endpoint:**

   - Go to The Graph Studio
   - Copy the GraphQL endpoint
   - Add to `.env.local`

4. **Test:**

   ```typescript
   import { useHarborMarks } from "@/hooks/useHarborMarks";

   const { data } = useHarborMarks({
     genesisAddress: "0x...",
   });
   ```

## 💡 Recommendation

Given the AssemblyScript complexity, I recommend:

1. **Start Simple**: Get a basic version working with just deposit tracking
2. **Add Features Gradually**: Add rules, withdrawals, etc. one at a time
3. **Test Each Step**: Verify each addition compiles before moving on

Would you like me to:

- A) Create a minimal working version first?
- B) Continue debugging the current version?
- C) Use a different approach (like starting from The Graph template)?












