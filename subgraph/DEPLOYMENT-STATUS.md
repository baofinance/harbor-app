# Subgraph Deployment Status

## ✅ Successfully Deployed

**Subgraph Name**: `harbor-marks-local`  
**Version**: `v1.0.0`  
**Network**: `anvil` (local)  
**GraphQL Endpoint**: `http://localhost:8000/subgraphs/name/harbor-marks-local`

## Configuration

### Genesis Contract
- **Address**: `0x6732128F9cc0c4344b2d4DC6285BCd516b7E59E6`
- **Start Block**: `0` (will auto-detect or can be set manually)
- **Network**: `anvil`

### Current Status
- ✅ Subgraph built successfully
- ✅ Deployed to local Graph Node
- ✅ Genesis data source is active
- ⚠️  haToken and stabilityPool templates are temporarily disabled (compilation issues)

## Next Steps

1. **Verify Indexing**: Check if the subgraph is indexing events from the Genesis contract
2. **Fix Template Handlers**: Resolve compilation issues with `haToken.ts` and `stabilityPool.ts`
3. **Add Data Sources**: Once templates are fixed, add data sources for:
   - ha tokens (ERC20)
   - Stability pools (collateral and sail)

## Testing

Query the subgraph:
```bash
curl -X POST http://localhost:8000/subgraphs/name/harbor-marks-local \
  -H "Content-Type: application/json" \
  -d '{"query":"{ deposits { id user amount timestamp } }"}'
```

## Known Issues

- **Template Compilation**: `haToken.ts` and `stabilityPool.ts` have AssemblyScript compilation errors
- **Workaround**: Templates are commented out in `subgraph.yaml` - Genesis subgraph works independently

## Future Work

1. Fix AssemblyScript compilation errors in template handlers
2. Re-enable templates in `subgraph.yaml`
3. Add data sources for ha tokens and stability pools
4. Test multi-market support



## ✅ Successfully Deployed

**Subgraph Name**: `harbor-marks-local`  
**Version**: `v1.0.0`  
**Network**: `anvil` (local)  
**GraphQL Endpoint**: `http://localhost:8000/subgraphs/name/harbor-marks-local`

## Configuration

### Genesis Contract
- **Address**: `0x6732128F9cc0c4344b2d4DC6285BCd516b7E59E6`
- **Start Block**: `0` (will auto-detect or can be set manually)
- **Network**: `anvil`

### Current Status
- ✅ Subgraph built successfully
- ✅ Deployed to local Graph Node
- ✅ Genesis data source is active
- ⚠️  haToken and stabilityPool templates are temporarily disabled (compilation issues)

## Next Steps

1. **Verify Indexing**: Check if the subgraph is indexing events from the Genesis contract
2. **Fix Template Handlers**: Resolve compilation issues with `haToken.ts` and `stabilityPool.ts`
3. **Add Data Sources**: Once templates are fixed, add data sources for:
   - ha tokens (ERC20)
   - Stability pools (collateral and sail)

## Testing

Query the subgraph:
```bash
curl -X POST http://localhost:8000/subgraphs/name/harbor-marks-local \
  -H "Content-Type: application/json" \
  -d '{"query":"{ deposits { id user amount timestamp } }"}'
```

## Known Issues

- **Template Compilation**: `haToken.ts` and `stabilityPool.ts` have AssemblyScript compilation errors
- **Workaround**: Templates are commented out in `subgraph.yaml` - Genesis subgraph works independently

## Future Work

1. Fix AssemblyScript compilation errors in template handlers
2. Re-enable templates in `subgraph.yaml`
3. Add data sources for ha tokens and stability pools
4. Test multi-market support





