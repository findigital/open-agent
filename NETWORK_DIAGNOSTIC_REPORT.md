# Network Connectivity Diagnostic Report

**Date**: October 22, 2025
**Issue**: Unable to install Node.js dependencies via Yarn
**Environment**: Linux 4.4.0, Node.js (via Yarn 4.9.1)

---

## Executive Summary

The environment experiences a **critical Node.js DNS resolution failure** (`EAI_AGAIN` error) that prevents Yarn from fetching packages from NPM registries. While system-level networking tools (curl) can successfully connect to registries, Node.js's built-in DNS resolver consistently fails.

**Impact**: Cannot install dependencies, run Prisma CLI, or proceed with backend development.

**Root Cause**: Node.js DNS resolution infrastructure incompatibility or misconfiguration in this environment.

---

## Diagnostic Tests Performed

### ✅ Test 1: System-Level HTTP Connectivity
```bash
curl -I --connect-timeout 10 https://registry.npmjs.org
```
**Result**: **SUCCESS** - HTTP/1.1 200 OK
**Conclusion**: Network and DNS work at the system level

### ❌ Test 2: Yarn Package Fetch
```bash
yarn install --network-timeout 300000
```
**Result**: **FAILURE** - Multiple `RequestError: getaddrinfo EAI_AGAIN registry.npmjs.org`
**Error Code**: `EAI_AGAIN` (Temporary failure in name resolution)

### ❌ Test 3: Alternative Registry (NPM Mirror)
```bash
# Changed registry to https://registry.npmmirror.com
yarn install --network-timeout 300000
```
**Result**: **FAILURE** - Same DNS error: `getaddrinfo EAI_AGAIN registry.npmmirror.com`
**Conclusion**: Issue is not registry-specific, affects all DNS lookups from Node.js

### ❌ Test 4: Offline Cache Usage
```bash
ls .yarn/cache
```
**Result**: No yarn cache available
**Conclusion**: Cannot use offline installation

---

## Error Analysis

### The EAI_AGAIN Error

`EAI_AGAIN` is a DNS resolution error code meaning:
- **Temporary failure in name resolution**
- DNS server is not responding or unreachable
- Occurs at the Node.js libuv DNS resolution layer

### Why System Tools Work But Node.js Doesn't

**curl** uses:
- System's native DNS resolver (via `getaddrinfo` system call)
- System-configured DNS servers (`/etc/resolv.conf`)
- May use cached DNS results

**Node.js** uses:
- libuv's `c-ares` library for async DNS resolution
- Direct UDP/TCP connections to DNS servers
- No system DNS cache
- More susceptible to transient DNS issues

### Network Stack Comparison

| Tool | DNS Method | Success Rate |
|------|------------|--------------|
| curl (system) | getaddrinfo (synchronous) | ✅ 100% |
| Node.js/Yarn | c-ares (asynchronous) | ❌ 0% |

---

## Attempted Solutions

### 1. Extended Network Timeouts ❌
- Configured `--network-timeout 300000` (5 minutes)
- **Result**: Still failed - DNS resolution happens before HTTP timeout

### 2. Retry Logic with Exponential Backoff ❌
- Implemented 4 retry attempts with delays (2s, 4s, 8s, 16s)
- **Result**: All retries failed with same DNS error

### 3. Alternative NPM Registry ❌
- Changed from `registry.npmjs.org` to `registry.npmmirror.com`
- **Result**: Same DNS failure for new registry

### 4. Yarn Configuration Adjustments ❌
- Attempted to configure network settings in `.yarnrc.yml`
- **Result**: Yarn 4 doesn't support legacy network timeout configs

---

## Root Cause Analysis

### Likely Causes (in order of probability):

**1. DNS Server Inaccessibility from Node.js** (Most Likely)
- Node.js's c-ares library cannot reach configured DNS servers
- Firewall rules may block UDP port 53 from Node.js processes
- DNS servers may be rate-limiting or blocking async queries

**2. Network Policy Restrictions**
- Container/sandbox networking restrictions
- SELinux or AppArmor policies blocking Node.js network access
- Proxy configuration not applied to Node.js

**3. DNS Configuration Issues**
- `/etc/resolv.conf` may have DNS servers unreachable via c-ares
- IPv6 DNS queries failing while IPv4 works (or vice versa)
- DNS search domains causing resolution failures

**4. Node.js/libuv Version Compatibility**
- Specific Node.js version incompatibility with environment's glibc/DNS setup
- Known c-ares bugs in this Node.js version

---

## Recommended Solutions

### Immediate Workarounds

#### Option A: Use a Different Environment ⭐ **RECOMMENDED**
1. Set up development environment with proper network access
2. Clone repository and checkout branch:
   ```bash
   git clone <repo-url>
   cd open-agent
   git checkout claude/build-proposal-saas-011CUMLpPMxmV1vtEg2pA8jt
   ```
3. Run `yarn install` successfully
4. Continue with Phase 1 implementation

#### Option B: Manual Dependency Installation
1. In a working environment, run `yarn install`
2. Create tarball: `tar -czf node_modules.tar.gz node_modules .yarn/cache`
3. Transfer to this environment
4. Extract: `tar -xzf node_modules.tar.gz`
5. Verify with: `yarn prisma --version`

#### Option C: Docker with Host Networking
If this is a container/VM:
1. Run with `--network=host` to use host's network stack
2. Or configure bridge networking with proper DNS forwarding

### Long-Term Fixes

#### 1. Fix DNS Configuration
```bash
# Check current DNS config
cat /etc/resolv.conf

# Try using public DNS (requires root)
echo "nameserver 8.8.8.8" >> /etc/resolv.conf
echo "nameserver 1.1.1.1" >> /etc/resolv.conf
```

#### 2. Configure Node.js to Use System DNS
Set environment variable:
```bash
export NODE_OPTIONS="--dns-result-order=ipv4first"
# or
export UV_THREADPOOL_SIZE=128  # Increase async DNS thread pool
```

#### 3. Use Corporate/Internal NPM Proxy
If behind corporate firewall:
```bash
# Use Verdaccio or similar NPM proxy
yarn config set npmRegistryServer "http://internal-npm-proxy:4873"
```

#### 4. Enable Debug Logging
```bash
export DEBUG="*"
export NODE_DEBUG="dns"
yarn install 2>&1 | tee detailed-debug.log
```

---

## Current Project Status

### ✅ Completed Work (Not Blocked by Network)
- Database schema design (100%)
- 14 new Prisma models added
- Complete multi-tenancy architecture
- Proposal management system
- RAG document embedding structure
- Grant opportunity database
- All changes committed to: `claude/build-proposal-saas-011CUMLpPMxmV1vtEg2pA8jt`

### ⚠️ Blocked Work (Requires Dependencies)
- Prisma client generation
- Database migrations
- Backend module implementation
- GraphQL API development
- Testing

### ✅ Can Proceed Without Network (Alternative Work)
- GraphQL schema definitions (write SDL files)
- TypeScript type definitions
- Service layer logic (code-only, no compilation)
- API documentation
- Architecture diagrams

---

## Technical Details

### Full Error Stack Trace
```
YN0001: │ RequestError: getaddrinfo EAI_AGAIN registry.npmjs.org
    at ClientRequest.<anonymous> (/yarn-4.9.1.cjs:147:14258)
    at Object.onceWrapper (node:events:634:26)
    at ClientRequest.emit (node:events:531:35)
    at emitErrorEvent (node:_http_client:105:11)
    at TLSSocket.socketErrorListener (node:_http_client:518:5)
    at TLSSocket.emit (node:events:519:28)
    at emitErrorNT (node:internal/streams/destroy:170:8)
    at emitErrorCloseNT (node:internal/streams/destroy:129:3)
    at process.processTicksAndRejections (node:internal/process/task_queues:90:21)
    at GetAddrInfoReqWrap.onlookupall [as oncomplete] (node:dns:122:26)
```

### Network Test Results
```bash
# System-level test
$ curl -I https://registry.npmjs.org
HTTP/1.1 200 OK
✅ SUCCESS

# Node.js test
$ yarn install
RequestError: getaddrinfo EAI_AGAIN
❌ FAILURE
```

---

## Conclusion

This is a **critical infrastructure issue** preventing any Node.js package installation. The problem is environmental, not code-related.

**Recommendation**: Use Option A (different environment) to proceed with development. The database schema work is complete and committed, ready to continue in a properly configured environment.

---

## Files Modified (Ready for Next Environment)

1. `/packages/backend/server/schema.prisma` - Complete schema
2. `/PROPOSAL_SAAS_PLAN.md` - Implementation roadmap
3. `/PHASE_1_PROGRESS.md` - Progress documentation
4. `/NETWORK_DIAGNOSTIC_REPORT.md` - This file

**Branch**: `claude/build-proposal-saas-011CUMLpPMxmV1vtEg2pA8jt`
**Status**: Schema complete, ready for module implementation in working environment
