# Integration Test Report: {SERVICE_NAME}

**Date:** {TIMESTAMP}
**Duration:** {DURATION}ms
**Status:** {PASS/FAIL}
**Tester:** Integration Test Suite

---

## Executive Summary

{SUMMARY_TEXT}

**Overall Result:** {PASS_COUNT}/{TOTAL_COUNT} tests passed

---

## Test Environment

| Property | Value |
|----------|-------|
| Service Name | {SERVICE_NAME} |
| Base URL | {BASE_URL} |
| Authentication | {AUTH_METHOD} |
| Test Date | {DATE} |
| Test Duration | {DURATION}ms |

---

## Test Results

### 1. Environment Configuration

**Status:** {PASS/FAIL}

- Base URL configured: {YES/NO}
- Authentication credentials present: {YES/NO}
- Required environment variables: {LIST}

{ENVIRONMENT_DETAILS}

---

### 2. Connection Test

**Status:** {PASS/FAIL}
**Duration:** {DURATION}ms

- DNS Resolution: {PASS/FAIL}
- TCP Connection: {PASS/FAIL}
- SSL Certificate: {VALID/INVALID}
- Response Time: {TIME}ms

{CONNECTION_DETAILS}

---

### 3. Authentication Test

**Status:** {PASS/FAIL}
**Duration:** {DURATION}ms

- Credentials Valid: {YES/NO}
- Authorization Header: {CORRECT/INCORRECT}
- Token/Key Status: {ACTIVE/EXPIRED/INVALID}
- Permissions: {LIST_OF_SCOPES}

{AUTHENTICATION_DETAILS}

---

### 4. CRUD Operations

#### Read Operations (GET)

**Status:** {PASS/FAIL}
**Duration:** {DURATION}ms

- Endpoint: `{ENDPOINT}`
- Records Retrieved: {COUNT}
- Response Format: {JSON/XML/OTHER}
- Schema Valid: {YES/NO}

{READ_DETAILS}

#### Create Operations (POST)

**Status:** {PASS/FAIL/SKIPPED}
**Duration:** {DURATION}ms

- Endpoint: `{ENDPOINT}`
- Record Created: {YES/NO}
- Created ID: {ID}
- Validation: {PASSED/FAILED}

{CREATE_DETAILS}

#### Update Operations (PUT/PATCH)

**Status:** {PASS/FAIL/SKIPPED}
**Duration:** {DURATION}ms

- Endpoint: `{ENDPOINT}`
- Record Updated: {YES/NO}
- Fields Modified: {LIST}

{UPDATE_DETAILS}

#### Delete Operations (DELETE)

**Status:** {PASS/FAIL/SKIPPED}
**Duration:** {DURATION}ms

- Endpoint: `{ENDPOINT}`
- Record Deleted: {YES/NO}
- Cleanup Successful: {YES/NO}

{DELETE_DETAILS}

---

### 5. Pagination Testing

**Status:** {PASS/FAIL/SKIPPED}

- Pagination Type: {LIMIT_OFFSET/CURSOR/PAGE}
- Page Size: {SIZE}
- Total Records: {COUNT}
- Navigation Working: {YES/NO}

{PAGINATION_DETAILS}

---

### 6. Search & Filtering

**Status:** {PASS/FAIL/SKIPPED}

- Search Query: `{QUERY}`
- Results Returned: {COUNT}
- Results Relevant: {YES/NO}
- Filters Working: {YES/NO}

{SEARCH_DETAILS}

---

### 7. Error Handling

**Status:** {PASS/FAIL}

Tested error scenarios:
- 400 Bad Request: {HANDLED/NOT_HANDLED}
- 401 Unauthorized: {HANDLED/NOT_HANDLED}
- 403 Forbidden: {HANDLED/NOT_HANDLED}
- 404 Not Found: {HANDLED/NOT_HANDLED}
- 429 Rate Limit: {HANDLED/NOT_HANDLED}
- 500 Server Error: {HANDLED/NOT_HANDLED}

{ERROR_HANDLING_DETAILS}

---

## Performance Metrics

| Operation | Avg Time | Min Time | Max Time | Status |
|-----------|----------|----------|----------|--------|
| Health Check | {AVG}ms | {MIN}ms | {MAX}ms | {STATUS} |
| Authentication | {AVG}ms | {MIN}ms | {MAX}ms | {STATUS} |
| Read Single | {AVG}ms | {MIN}ms | {MAX}ms | {STATUS} |
| Read List | {AVG}ms | {MIN}ms | {MAX}ms | {STATUS} |
| Create | {AVG}ms | {MIN}ms | {MAX}ms | {STATUS} |
| Update | {AVG}ms | {MIN}ms | {MAX}ms | {STATUS} |
| Delete | {AVG}ms | {MIN}ms | {MAX}ms | {STATUS} |

**Performance Rating:**
- Excellent: < 500ms
- Good: 500ms - 1000ms
- Acceptable: 1000ms - 2000ms
- Slow: > 2000ms

{PERFORMANCE_ANALYSIS}

---

## Errors & Warnings

### Errors

{ERROR_LIST}

### Warnings

{WARNING_LIST}

---

## Recommendations

Based on the test results, here are recommendations for improvement:

{RECOMMENDATIONS_LIST}

---

## Troubleshooting Guide

### If Connection Fails

1. Verify service is running
2. Check BASE_URL configuration
3. Verify network connectivity
4. Check firewall rules

### If Authentication Fails

1. Regenerate API credentials
2. Verify environment variables
3. Check credential format
4. Confirm scopes/permissions

### If Operations Fail

1. Review API documentation
2. Check request format
3. Validate data types
4. Verify required fields

---

## Next Steps

- [ ] {NEXT_STEP_1}
- [ ] {NEXT_STEP_2}
- [ ] {NEXT_STEP_3}

---

## Appendix

### Sample Request

```bash
curl -X GET '{BASE_URL}{ENDPOINT}' \
  -H 'Authorization: Bearer {TOKEN}' \
  -H 'Content-Type: application/json'
```

### Sample Response

```json
{SAMPLE_RESPONSE}
```

### Environment Variables

```bash
# Required
{ENV_VAR_1}={VALUE}
{ENV_VAR_2}={VALUE}

# Optional
{ENV_VAR_3}={VALUE}
```

---

**Report Generated:** {TIMESTAMP}
**Test Suite Version:** 1.0.0
