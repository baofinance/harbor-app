# Security Vulnerabilities Review

## Summary
**Main App:** Found **5 vulnerabilities** (1 critical, 2 high, 2 moderate) - **ALL FIXED** ✅  
**Subgraph:** Found **14 vulnerabilities** (10 high, 4 moderate) - **Reduced to 11** (7 high, 4 moderate) ⚠️

## Status Update
- ✅ **Main app vulnerabilities:** All resolved (0 vulnerabilities)
- ⚠️ **Subgraph vulnerabilities:** Reduced from 14 to 11 (remaining are in CLI tool dependencies)

## Critical Vulnerabilities

### 1. Next.js (15.5.6 → 15.5.7 in package.json, but 15.5.6 installed)
**Severity:** Critical (CVSS 10.0)  
**Affected Range:** 15.5.0 - 15.5.7  
**Issues:**
- **GHSA-9qr9-h5gf-34mp**: RCE (Remote Code Execution) in React flight protocol
- **GHSA-w37m-7fhw-fmv9**: Server Actions Source Code Exposure (Moderate)
- **GHSA-mwv6-3258-q52c**: Denial of Service with Server Components (High)

**Fix:** Update to Next.js 15.5.8 or later (latest stable: 16.0.10)
```bash
npm install next@15.5.8
# OR upgrade to latest stable
npm install next@latest
```

**Note:** Next.js 16.x is available but may require code changes. 15.5.8+ fixes all reported vulnerabilities.

## High Severity Vulnerabilities

### 2. glob (via sucrase dependency)
**Severity:** High (CVSS 7.5)  
**Affected Range:** 10.2.0 - 10.4.5  
**Issue:** Command injection via -c/--cmd executes matches with shell:true (CWE-78)

**Fix:** Update transitive dependency
```bash
npm audit fix
```

### 3. hono (transitive dependency)
**Severity:** High (CVSS 8.1)  
**Affected Range:** <=4.10.2  
**Issues:**
- Improper Authorization vulnerability (CWE-285)
- Vary Header Injection leading to potential CORS Bypass (Moderate, CWE-444)

**Fix:** Update transitive dependency
```bash
npm audit fix
```

## Moderate Severity Vulnerabilities

### 4. js-yaml (transitive dependency)
**Severity:** Moderate (CVSS 5.3)  
**Affected Range:** 4.0.0 - 4.1.0  
**Issue:** Prototype pollution in merge (<<) (CWE-1321)

**Fix:** Update transitive dependency
```bash
npm audit fix
```

### 5. tar (transitive dependency)
**Severity:** Moderate  
**Affected Range:** 7.5.1  
**Issue:** Race condition leading to uninitialized memory exposure (CWE-362)

**Fix:** Update transitive dependency
```bash
npm audit fix
```

## Recommended Actions

### Immediate (Critical)
1. **Update Next.js** - This is the most critical issue:
   ```bash
   npm install next@15.5.8
   # Test thoroughly after update
   ```

### Short-term (High Priority)
2. **Run npm audit fix** to update transitive dependencies:
   ```bash
   npm audit fix
   ```

3. **Verify fixes**:
   ```bash
   npm audit
   ```

### Testing After Updates
- Run the application and verify all features work
- Check that build process completes successfully
- Test critical user flows (wallet connections, transactions, etc.)

## Subgraph Vulnerabilities

### Status
Updated `@graphprotocol/graph-cli` from 0.68.0 to 0.98.1, reducing vulnerabilities from 14 to 11.

### Remaining Vulnerabilities (11 total: 7 high, 4 moderate)
These are in **transitive dependencies of @graphprotocol/graph-cli** (the CLI build tool, not runtime code):
- **axios** (high): CSRF, DoS, SSRF vulnerabilities
- **cross-spawn** (high): ReDoS vulnerability  
- **semver** (high): ReDoS vulnerability
- **ejs** (moderate): Prototype pollution
- **js-yaml** (moderate): Prototype pollution
- **lodash.trim/lodash.trimend** (moderate): ReDoS vulnerabilities
- **glob** (high): Command injection

**Note:** These vulnerabilities are in the CLI tool dependencies (gluegun, axios, etc.) used during build time, not in the deployed subgraph runtime code. They pose lower risk but should be monitored for updates from The Graph Protocol team.

**Recommendation:** Monitor @graphprotocol/graph-cli releases for security updates. The Graph Protocol team will need to update their dependencies to fully resolve these.

## Additional Notes

- The project uses `yarn` as package manager (see package.json), but npm commands should work
- Consider enabling Dependabot on GitHub for automatic security updates
- Review the 25 total Dependabot alerts on GitHub (some may be duplicates or from subgraph)
- Subgraph vulnerabilities are in build-time CLI tools, not runtime code

## References
- [Next.js Security Advisory](https://github.com/advisories/GHSA-9qr9-h5gf-34mp)
- [npm audit documentation](https://docs.npmjs.com/cli/v8/commands/npm-audit)

