# Dead Code Detection Script

A Python tool to detect unused files and dead code in the LTCG monorepo.

## Features

- **Unused Files Detection**: Finds files that are never imported by any other file
- **Orphaned Files Detection**: Identifies files with no imports or exports (completely isolated)
- **Files with No Exports**: Detects files that import other modules but don't export anything
- **Smart Categorization**: Groups results by monorepo location (Web App, Admin App, Convex, Packages, etc.)
- **Entry Point Awareness**: Excludes common entry points (page.tsx, layout.tsx, test files, config files, etc.)

## Usage

### Basic Usage

```bash
python scripts/check_dead_code.py
```

### Show Detailed Information

Includes files with no exports (side-effect files) and import details:

```bash
python scripts/check_dead_code.py --detailed
```

### JSON Output

For integration with other tools or CI/CD:

```bash
python scripts/check_dead_code.py --json
```

### Custom Root Directory

```bash
python scripts/check_dead_code.py --root /path/to/monorepo
```

## What It Detects

### 1. Unused Files 🗑️

Files that are never imported by any other file. These are likely candidates for deletion, unless they are:
- Entry points (page.tsx, layout.tsx, route.ts)
- Test files (*.spec.ts, *.test.ts)
- Configuration files
- Scripts meant to be run directly

**Example:**
```
Web App (16 files):
   • apps/web/src/components/game/GameResultScreen.tsx
   • apps/web/src/components/game/TutorialManager.tsx
```

### 2. Orphaned Files 👻

Files that have no imports AND no exports. These files are completely isolated and likely dead code.

**Example:**
```
Admin App (3 files):
   • apps/admin/next-env.d.ts
   • apps/admin/public/sw.js
```

### 3. Files with No Exports ⚠️ (detailed mode only)

Files that import other modules but don't export anything. These might be:
- Side-effect files (intentionally modifying global state)
- Dead code that was never cleaned up
- Test setup files

## Understanding Results

### Safe to Delete

- **Orphaned files** are usually safe to delete
- **Unused files** that are not in use and not documented as intentional entry points

### Investigate Before Deleting

- UI components (might be used in a way the script doesn't detect)
- Provider components (might be used in layout files)
- Service Worker files (sw.js)
- Test utilities and setup files

### False Positives

The script may flag some files as unused when they are actually needed:

1. **Dynamic Imports**: Files imported via `import(\`./components/\${name}\`)`
2. **Next.js Special Files**: Some Next.js files like `next-env.d.ts` are auto-generated
3. **Side-Effect Imports**: CSS imports, polyfills, etc.
4. **Plugin Entry Points**: Agent plugins and their examples
5. **Type Declaration Files**: `global.d.ts`, `*.d.ts` files that augment globals

## Handling Results

### Review the Report

1. Start with **Orphaned Files** - these are the safest to delete
2. Review **Unused Files** - check if they're intentional entry points
3. Check **Files with No Exports** (detailed mode) - determine if they're side-effect files

### Before Deleting

```bash
# Search for dynamic references
git grep "GameResultScreen"

# Check git history
git log --oneline -- apps/web/src/components/game/GameResultScreen.tsx

# Search for string-based imports
rg "'.*GameResultScreen'" --type ts
```

### Example Workflow

```bash
# 1. Generate report
python scripts/check_dead_code.py > dead_code_report.txt

# 2. Review orphaned files (usually safe to delete)
# Check the report for orphaned files

# 3. Create a branch for cleanup
git checkout -b chore/remove-dead-code

# 4. Delete unused files cautiously
# Test after each deletion!

# 5. Run tests
bun run test

# 6. Commit and review
git add .
git commit -m "chore: remove dead code"
```

## CI/CD Integration

Use the JSON output for automation:

```bash
# Exit with code 1 if dead code is found
if python scripts/check_dead_code.py --json | jq -e '.summary.unused_files > 0'; then
  echo "Dead code detected!"
  exit 1
fi
```

## Limitations

1. **Dynamic Imports**: Cannot detect dynamically constructed import paths
2. **Reflection**: Cannot detect usage via string-based module resolution
3. **Build Tools**: Some files might be used by build tools in ways not visible to static analysis
4. **External References**: Files referenced from outside the monorepo won't be detected

## Configuration

To customize what's excluded, edit the script and modify:

- `exclude_dirs`: Directories to skip
- `entry_patterns`: File names that are always entry points
- `config_files`: Configuration files to preserve

## Examples

### Example: Finding All Unused Components

```bash
python scripts/check_dead_code.py --detailed | grep "components"
```

### Example: Checking a Specific Package

```bash
python scripts/check_dead_code.py --root packages/plugin-ltcg
```

### Example: Getting Count Summary

```bash
python scripts/check_dead_code.py --json | jq '.summary'
```

## Contributing

To improve the script:

1. Add new import patterns to `import_patterns`
2. Add new export patterns to `export_patterns`
3. Improve path resolution in `resolve_import_path()`
4. Add new entry point patterns to `entry_patterns`

## Support

For issues or questions, see the main project README or create an issue in the repository.
