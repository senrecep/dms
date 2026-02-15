# Testing Conventions
- Unit tests next to source files in `__tests__/` directories
- Integration tests in `tests/` at project root
- New features: > 80% coverage
- Bug fixes: Test reproducing the bug first
- Describe behavior: `it('should return documents when user is authorized')`
- Before commit: Run tests, no .skip/.only
- Mock external services (Redis, PostgreSQL, Resend) in unit tests
