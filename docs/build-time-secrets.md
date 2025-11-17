# Build-Time Secrets Management

This document describes how build-time secrets are injected into the application during the Docker build process, specifically for client-side configuration values that need to be embedded in the JavaScript bundle.

## Overview

Build-time secrets are configuration values that:

- Need to be embedded in the client-side JavaScript bundle at build time
- Should not be stored in source code (for open-source projects)
- Are environment-specific (development, staging, production)
- Are safe to expose in client-side code (e.g., public API keys, client IDs)

**Example:** LaunchDarkly client-side SDK client ID

## Architecture

### 1. Secret Storage

Secrets are stored in AWS Secrets Manager under the `/cloudops/managed-secrets/` namespace:

```
/cloudops/managed-secrets/launchdarkly/lfx_one/ld_client_id
```

Secret format (JSON):

```json
{
  "ld_client_id": "691b727361cbf309e9d74468"
}
```

### 2. Reusable Workflow

We use a reusable GitHub Actions workflow (`.github/workflows/get-launchdarkly-secrets.yml`) that:

1. Authenticates with AWS using OIDC
2. Retrieves secrets from AWS Secrets Manager
3. Validates required secrets exist
4. Masks secrets in logs
5. Outputs secrets to calling workflows

**Key feature:** Uses workflow outputs (not `GITHUB_ENV`) to pass secrets between jobs.

```yaml
jobs:
  get-secrets:
    runs-on: ubuntu-latest
    outputs:
      ld_client_id: ${{ steps.set-output.outputs.ld_client_id }}
```

### 3. Docker BuildKit Secret Mounts

Secrets are passed to Docker builds using BuildKit secret mounts, which:

- Don't persist in image layers
- Don't appear in build history
- Are more secure than `ARG` or `ENV`

**GitHub Actions:**

```yaml
- name: Build and push Docker image
  uses: docker/build-push-action@v5
  with:
    secret-envs: |
      LAUNCHDARKLY_CLIENT_ID=LAUNCHDARKLY_CLIENT_ID
```

**Dockerfile:**

```dockerfile
RUN --mount=type=secret,id=LAUNCHDARKLY_CLIENT_ID \
    LAUNCHDARKLY_CLIENT_ID=$(cat /run/secrets/LAUNCHDARKLY_CLIENT_ID) && \
    yarn build:${BUILD_ENV} --define LAUNCHDARKLY_CLIENT_ID="'${LAUNCHDARKLY_CLIENT_ID}'"
```

### 4. Angular Build-Time Injection

Angular 19's `define` feature (Vite) replaces constant references at build time:

**angular.json:**

```json
{
  "options": {
    "define": {
      "LAUNCHDARKLY_CLIENT_ID": "''"
    }
  }
}
```

**Environment files:**

```typescript
// Declare the constant that will be replaced at build time
declare const LAUNCHDARKLY_CLIENT_ID: string | undefined;

export const environment = {
  launchDarklyClientId: typeof LAUNCHDARKLY_CLIENT_ID !== 'undefined' ? LAUNCHDARKLY_CLIENT_ID : '691b727361cbf309e9d74468', // Dev fallback for local ng serve
};
```

The `--define LAUNCHDARKLY_CLIENT_ID="'value'"` flag replaces all occurrences of `LAUNCHDARKLY_CLIENT_ID` in the compiled code with the actual value.

## Data Flow

```
AWS Secrets Manager
    ↓
GitHub Actions (OIDC Auth)
    ↓
Reusable Workflow (get-launchdarkly-secrets.yml)
    ↓
Job Outputs
    ↓
Docker Build (BuildKit Secret Mount)
    ↓
Angular Build (--define flag)
    ↓
JavaScript Bundle (constant replaced)
```

## Local Development

### Using `yarn start` (ng serve)

The `ng serve` command doesn't support the `--define` flag, so environment files include hardcoded fallback values:

```typescript
launchDarklyClientId:
  typeof LAUNCHDARKLY_CLIENT_ID !== 'undefined'
    ? LAUNCHDARKLY_CLIENT_ID
    : '691b727361cbf309e9d74468', // Dev client ID for local ng serve
```

This means:

- ✅ Local development works without AWS credentials
- ✅ Dev environment uses appropriate client ID
- ✅ Production builds override with secure values
- ❌ Dev client ID is visible in source code (acceptable trade-off)

### Using `yarn build`

Local builds can be tested with environment variables:

```bash
# Export the secret
export LAUNCHDARKLY_CLIENT_ID="your-client-id"

# Build with define
yarn build --define LAUNCHDARKLY_CLIENT_ID="'$LAUNCHDARKLY_CLIENT_ID'"
```

## Workflow Integration

All three Docker build workflows use the reusable workflow:

1. **docker-build-main.yml** - Development environment deployments
2. **docker-build-tag.yml** - Production releases
3. **docker-build-pr.yml** - PR preview deployments

Example integration:

```yaml
jobs:
  get-secrets:
    uses: ./.github/workflows/get-launchdarkly-secrets.yml

  build-and-push:
    needs: get-secrets
    runs-on: ubuntu-latest
    env:
      LAUNCHDARKLY_CLIENT_ID: ${{ needs.get-secrets.outputs.ld_client_id }}
```

## Security Considerations

### ✅ Secure Practices

- **AWS Secrets Manager** - Centralized secret storage with access control
- **OIDC Authentication** - No long-lived AWS credentials in GitHub
- **BuildKit Secret Mounts** - Secrets don't persist in image layers
- **Log Masking** - `::add-mask::` prevents secrets from appearing in logs
- **Validation Steps** - Fail fast if secrets are missing

### ⚠️ Important Notes

- **Client-side secrets are public** - These values are visible in browser dev tools
- **Use only for non-sensitive data** - API keys for client-side SDKs, public endpoints
- **Never use for server secrets** - Database passwords, API tokens, etc. should use runtime injection

## Adding New Build-Time Secrets

### Step 1: Add Secret to AWS Secrets Manager

Create secret at `/cloudops/managed-secrets/[service]/[app]/[secret_name]`:

```bash
aws secretsmanager create-secret \
  --name /cloudops/managed-secrets/service/lfx_one/new_secret \
  --secret-string '{"key": "value"}'
```

### Step 2: Update Reusable Workflow

Edit `.github/workflows/get-launchdarkly-secrets.yml`:

```yaml
- name: Read secrets from AWS Secrets Manager
  uses: aws-actions/aws-secretsmanager-get-secrets@v2
  with:
    secret-ids: |
      LAUNCHDARKLY, /cloudops/managed-secrets/launchdarkly/lfx_one/ld_client_id
      NEWSECRET, /cloudops/managed-secrets/service/lfx_one/new_secret

- name: Set up sensitive environment variables and output
  run: |
    # Extract new secret
    NEW_SECRET_VALUE=$(echo "$NEWSECRET" | jq -r '.key // empty')
    echo "::add-mask::$NEW_SECRET_VALUE"
    echo "new_secret=$NEW_SECRET_VALUE" >> $GITHUB_OUTPUT
```

Add output:

```yaml
outputs:
  ld_client_id: ${{ jobs.get-secrets.outputs.ld_client_id }}
  new_secret: ${{ jobs.get-secrets.outputs.new_secret }}
```

### Step 3: Update Docker Build Workflows

Add to `secret-envs` in all three workflows:

```yaml
secret-envs: |
  LAUNCHDARKLY_CLIENT_ID=LAUNCHDARKLY_CLIENT_ID
  NEW_SECRET=NEW_SECRET
```

Update job env:

```yaml
env:
  LAUNCHDARKLY_CLIENT_ID: ${{ needs.get-secrets.outputs.ld_client_id }}
  NEW_SECRET: ${{ needs.get-secrets.outputs.new_secret }}
```

### Step 4: Update Dockerfile

Add secret mount:

```dockerfile
RUN --mount=type=secret,id=LAUNCHDARKLY_CLIENT_ID \
    --mount=type=secret,id=NEW_SECRET \
    LAUNCHDARKLY_CLIENT_ID=$(cat /run/secrets/LAUNCHDARKLY_CLIENT_ID) && \
    NEW_SECRET=$(cat /run/secrets/NEW_SECRET) && \
    yarn build:${BUILD_ENV} \
      --define LAUNCHDARKLY_CLIENT_ID="'${LAUNCHDARKLY_CLIENT_ID}'" \
      --define NEW_SECRET="'${NEW_SECRET}'"
```

### Step 5: Update Angular Configuration

Add to `angular.json`:

```json
{
  "options": {
    "define": {
      "LAUNCHDARKLY_CLIENT_ID": "''",
      "NEW_SECRET": "''"
    }
  }
}
```

### Step 6: Update Environment Files

```typescript
declare const NEW_SECRET: string | undefined;

export const environment = {
  newSecret: typeof NEW_SECRET !== 'undefined' ? NEW_SECRET : 'dev-fallback-value', // For local ng serve
};
```

## Troubleshooting

### Build fails with "secret not found"

**Problem:** Docker build can't find secret mount

**Solution:**

1. Verify secret exists in AWS Secrets Manager
2. Check GitHub Actions workflow output for secret retrieval
3. Ensure secret is added to `secret-envs` in workflow
4. Verify secret ID matches between workflow and Dockerfile

### Secret value is empty in build

**Problem:** Secret retrieves but value is empty/undefined

**Solution:**

1. Check JSON structure in AWS Secrets Manager matches jq extraction
2. Verify field name in `jq -r '.field_name // empty'`
3. Check validation step passes in workflow

### Local development not working

**Problem:** `yarn start` fails or uses wrong values

**Solution:**

1. Ensure fallback values exist in environment files
2. Check `typeof CONSTANT !== 'undefined'` logic
3. Remember `ng serve` doesn't support `--define` flag
4. Use `yarn build` locally to test define injection

### Secret visible in logs

**Problem:** Secret appears in GitHub Actions logs

**Solution:**

1. Add `echo "::add-mask::$SECRET"` before using secret
2. Ensure masking happens before any echo/logging
3. Check for indirect leaks (e.g., in error messages)

## References

- [Angular Build Options](https://angular.dev/tools/cli/build)
- [Docker BuildKit Secrets](https://docs.docker.com/build/building/secrets/)
- [GitHub Actions Reusable Workflows](https://docs.github.com/en/actions/using-workflows/reusing-workflows)
- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)
- [GitHub OIDC with AWS](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)

## Related Documentation

- [Deployment Guide](./deployment.md) - Deployment processes and environments
- [Feature Flags](./architecture/frontend/feature-flags.md) - LaunchDarkly feature flag system
- [Authentication](./architecture/backend/authentication.md) - Server-side authentication setup
