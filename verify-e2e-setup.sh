#!/bin/bash

echo "=========================================="
echo "E2E Test Suite Verification"
echo "=========================================="
echo ""

# Check if e2e directory exists
if [ -d "e2e" ]; then
    echo "✅ e2e/ directory exists"
else
    echo "❌ e2e/ directory missing"
    exit 1
fi

# Check setup files
echo ""
echo "Setup Files:"
for file in e2e/setup/fixtures.ts e2e/setup/helpers.ts e2e/setup/test-data.ts; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file missing"
    fi
done

# Check test spec files
echo ""
echo "Test Spec Files:"
for file in e2e/auth.spec.ts e2e/deck.spec.ts e2e/lobby.spec.ts e2e/gameplay.spec.ts e2e/effects.spec.ts e2e/economy.spec.ts e2e/story.spec.ts e2e/social.spec.ts; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file missing"
    fi
done

# Count total tests
echo ""
echo "Test Statistics:"
total_tests=0
for file in e2e/*.spec.ts; do
    if [ -f "$file" ]; then
        count=$(grep -c 'test("' "$file" 2>/dev/null || echo "0")
        total_tests=$((total_tests + count))
        echo "  $(basename $file): $count tests"
    fi
done
echo "  Total: $total_tests tests"

# Check configuration files
echo ""
echo "Configuration:"
if [ -f "playwright.config.ts" ]; then
    echo "  ✅ playwright.config.ts"
else
    echo "  ❌ playwright.config.ts missing"
fi

if grep -q "test:e2e" package.json 2>/dev/null; then
    echo "  ✅ npm scripts added to package.json"
else
    echo "  ❌ npm scripts missing from package.json"
fi

# Check documentation
echo ""
echo "Documentation:"
for file in E2E_TESTING.md E2E_TEST_SUITE_SUMMARY.md e2e/README.md; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file missing"
    fi
done

# Check Playwright installation
echo ""
echo "Dependencies:"
if [ -d "node_modules/@playwright/test" ]; then
    echo "  ✅ Playwright installed"
else
    echo "  ⚠️  Playwright not installed (run: bun install)"
fi

echo ""
echo "=========================================="
echo "Verification Complete"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. Ensure dev server is running: bun run dev"
echo "2. Install browsers: bun x playwright install"
echo "3. Run tests: bun run test:e2e"
echo "4. View UI mode: bun run test:e2e:ui"
echo ""
