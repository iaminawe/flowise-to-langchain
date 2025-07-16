# Test Structure

This directory contains all test files for the flowise-to-langchain converter.

## Directory Structure

- **`unit/`** - Unit tests for individual modules and functions
- **`integration/`** - Integration tests for complete workflows
- **`fixtures/`** - Test data files including sample Flowise JSON exports

## Testing Guidelines

- Use Jest as the testing framework
- Maintain high test coverage (>90%)
- Include both positive and negative test cases
- Use fixtures for consistent test data
- Mock external dependencies appropriately