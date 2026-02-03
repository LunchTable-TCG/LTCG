#!/usr/bin/env python3
"""
Dead Code and Unused File Detector for TypeScript/JavaScript Monorepo

This script scans a monorepo to detect:
1. Unused files (files that are never imported)
2. Unused exports (exports that are never imported)
3. Orphaned files (files with no imports or exports)

Usage:
    python scripts/check_dead_code.py
    python scripts/check_dead_code.py --detailed
    python scripts/check_dead_code.py --json
"""

import os
import re
import json
import argparse
from pathlib import Path
from collections import defaultdict
from typing import Set, Dict, List, Tuple

class DeadCodeDetector:
    def __init__(self, root_dir: str):
        self.root_dir = Path(root_dir)
        self.files: Set[Path] = set()
        self.imports: Dict[Path, Set[str]] = defaultdict(set)
        self.exports: Dict[Path, Set[str]] = defaultdict(set)
        self.file_imports: Dict[Path, Set[Path]] = defaultdict(set)

        # Patterns for imports and exports
        self.import_patterns = [
            r'import\s+.*?\s+from\s+["\']([^"\']+)["\']',  # import ... from "..."
            r'import\s*\(["\']([^"\']+)["\']\)',  # import("...")
            r'require\s*\(["\']([^"\']+)["\']\)',  # require("...")
            r'from\s+["\']([^"\']+)["\']',  # from "..."
        ]

        self.export_patterns = [
            r'export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var|interface|type|enum)\s+(\w+)',
            r'export\s*\{([^}]+)\}',
            r'export\s+default',
        ]

        # Directories to exclude
        self.exclude_dirs = {
            'node_modules', '.next', 'dist', 'build', '.turbo',
            '.git', '.vercel', 'output', '.husky', '.claude',
            '__pycache__', '.pytest_cache', 'coverage',
            'playwright-report', '.playwright-mcp'
        }

        # File patterns to include
        self.include_extensions = {'.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'}

        # Entry point patterns (these files should not be marked as unused)
        self.entry_patterns = {
            'page.tsx', 'layout.tsx', 'route.ts', 'middleware.ts',
            'app.tsx', 'app.ts', '_app.tsx', '_document.tsx',
            'index.ts', 'index.tsx', 'index.js', 'index.jsx',
            'main.ts', 'main.tsx', 'main.js', 'main.jsx',
            'server.ts', 'server.js',
        }

        # Config files that are entry points
        self.config_files = {
            'next.config.js', 'next.config.mjs', 'next.config.ts',
            'tailwind.config.js', 'tailwind.config.ts',
            'postcss.config.js', 'postcss.config.mjs',
            'vitest.config.ts', 'vite.config.ts',
            'playwright.config.ts',
            'turbo.json', 'tsconfig.json', 'package.json',
            'biome.json', 'convex.json',
        }

    def is_excluded_dir(self, path: Path) -> bool:
        """Check if a directory should be excluded from scanning."""
        return any(exclude in path.parts for exclude in self.exclude_dirs)

    def is_entry_point(self, file_path: Path) -> bool:
        """Check if a file is an entry point (should not be marked as unused)."""
        name = file_path.name
        return (
            name in self.entry_patterns or
            name in self.config_files or
            name.endswith('.spec.ts') or
            name.endswith('.test.ts') or
            name.endswith('.spec.tsx') or
            name.endswith('.test.tsx') or
            name.endswith('.spec.js') or
            name.endswith('.test.js') or
            'convex' in file_path.parts  # Convex files are often entry points
        )

    def scan_files(self):
        """Scan the repository for all relevant files."""
        print(f"Scanning {self.root_dir}...")

        for root, dirs, files in os.walk(self.root_dir):
            # Filter out excluded directories
            dirs[:] = [d for d in dirs if d not in self.exclude_dirs]

            root_path = Path(root)
            if self.is_excluded_dir(root_path):
                continue

            for file in files:
                file_path = root_path / file
                if file_path.suffix in self.include_extensions:
                    self.files.add(file_path)

        print(f"Found {len(self.files)} files to analyze")

    def parse_imports(self, file_path: Path) -> Set[str]:
        """Extract all imports from a file."""
        imports = set()
        try:
            content = file_path.read_text(encoding='utf-8', errors='ignore')

            for pattern in self.import_patterns:
                matches = re.finditer(pattern, content, re.MULTILINE)
                for match in matches:
                    import_path = match.group(1)
                    imports.add(import_path)
        except Exception as e:
            print(f"Warning: Could not parse {file_path}: {e}")

        return imports

    def parse_exports(self, file_path: Path) -> Set[str]:
        """Extract all exports from a file."""
        exports = set()
        try:
            content = file_path.read_text(encoding='utf-8', errors='ignore')

            for pattern in self.export_patterns:
                matches = re.finditer(pattern, content, re.MULTILINE)
                for match in matches:
                    if match.lastindex and match.lastindex >= 1:
                        export_name = match.group(1)
                        if '{' in export_name:
                            # Handle export { a, b, c }
                            names = re.findall(r'\w+', export_name)
                            exports.update(names)
                        else:
                            exports.add(export_name)
                    else:
                        exports.add('default')
        except Exception as e:
            print(f"Warning: Could not parse {file_path}: {e}")

        return exports

    def resolve_import_path(self, from_file: Path, import_str: str) -> Path | None:
        """Resolve an import string to an actual file path."""
        # Skip external packages
        if not import_str.startswith('.') and not import_str.startswith('/'):
            if not import_str.startswith('@/'):
                return None

        # Handle @/ alias (common in Next.js/TypeScript)
        if import_str.startswith('@/'):
            import_str = import_str[2:]
            # Detect which app this file belongs to
            relative_path = str(from_file.relative_to(self.root_dir))
            if relative_path.startswith('apps/web'):
                base = self.root_dir / 'apps' / 'web' / 'src'
            elif relative_path.startswith('apps/admin'):
                base = self.root_dir / 'apps' / 'admin' / 'src'
            elif relative_path.startswith('packages'):
                # For packages, try to find src directory in the package
                parts = from_file.parts
                pkg_idx = parts.index('packages')
                if pkg_idx + 1 < len(parts):
                    pkg_root = Path(*parts[:pkg_idx+2])
                    base = pkg_root / 'src'
                else:
                    base = from_file.parent
            else:
                base = self.root_dir / 'src'
            if not base.exists():
                base = from_file.parent
        else:
            base = from_file.parent

        # Handle relative imports
        if import_str.startswith('./') or import_str.startswith('../'):
            candidate = (base / import_str).resolve()
        else:
            candidate = (base / import_str).resolve()

        # Try different extensions
        if candidate.exists() and candidate.is_file():
            return candidate

        for ext in self.include_extensions:
            candidate_with_ext = candidate.with_suffix(ext)
            if candidate_with_ext.exists():
                return candidate_with_ext

        # Try index files
        if candidate.is_dir():
            for ext in self.include_extensions:
                index_file = candidate / f'index{ext}'
                if index_file.exists():
                    return index_file

        return None

    def build_dependency_graph(self):
        """Build a graph of file dependencies."""
        print("Building dependency graph...")

        for file_path in self.files:
            imports = self.parse_imports(file_path)
            exports = self.parse_exports(file_path)

            self.imports[file_path] = imports
            self.exports[file_path] = exports

            # Resolve imports to actual files
            for import_str in imports:
                resolved = self.resolve_import_path(file_path, import_str)
                if resolved and resolved in self.files:
                    self.file_imports[file_path].add(resolved)

    def find_unused_files(self) -> Set[Path]:
        """Find files that are never imported by any other file."""
        imported_files = set()
        for imports in self.file_imports.values():
            imported_files.update(imports)

        unused = set()
        for file_path in self.files:
            if file_path not in imported_files and not self.is_entry_point(file_path):
                unused.add(file_path)

        return unused

    def find_orphaned_files(self) -> Set[Path]:
        """Find files with no imports or exports (completely isolated)."""
        orphaned = set()
        for file_path in self.files:
            if not self.imports[file_path] and not self.exports[file_path]:
                if not self.is_entry_point(file_path):
                    orphaned.add(file_path)

        return orphaned

    def find_files_with_no_exports(self) -> Set[Path]:
        """Find files that have imports but no exports (might be dead)."""
        no_exports = set()
        for file_path in self.files:
            if self.imports[file_path] and not self.exports[file_path]:
                if not self.is_entry_point(file_path):
                    no_exports.add(file_path)

        return no_exports

    def get_relative_path(self, file_path: Path) -> str:
        """Get path relative to root directory."""
        try:
            return str(file_path.relative_to(self.root_dir))
        except ValueError:
            return str(file_path)

    def categorize_files(self, files: Set[Path]) -> Dict[str, List[Path]]:
        """Categorize files by their location in the monorepo."""
        categories = defaultdict(list)

        for file in files:
            rel_path = self.get_relative_path(file)

            if rel_path.startswith('apps/web'):
                categories['Web App'].append(file)
            elif rel_path.startswith('apps/admin'):
                categories['Admin App'].append(file)
            elif rel_path.startswith('convex'):
                categories['Convex Backend'].append(file)
            elif rel_path.startswith('packages'):
                categories['Packages'].append(file)
            elif rel_path.startswith('scripts'):
                categories['Scripts'].append(file)
            elif rel_path.startswith('e2e') or rel_path.startswith('tests'):
                categories['Tests'].append(file)
            else:
                categories['Other'].append(file)

        return categories

    def generate_report(self, detailed: bool = False) -> dict:
        """Generate a report of dead code findings."""
        unused_files = self.find_unused_files()
        orphaned_files = self.find_orphaned_files()
        no_exports = self.find_files_with_no_exports()

        report = {
            'summary': {
                'total_files': len(self.files),
                'unused_files': len(unused_files),
                'orphaned_files': len(orphaned_files),
                'files_with_no_exports': len(no_exports),
            },
            'unused_files': self.categorize_files(unused_files),
            'orphaned_files': self.categorize_files(orphaned_files),
            'files_with_no_exports': self.categorize_files(no_exports),
        }

        return report

    def print_report(self, report: dict, detailed: bool = False):
        """Print the report in a human-readable format."""
        print("\n" + "=" * 80)
        print("DEAD CODE ANALYSIS REPORT")
        print("=" * 80)

        summary = report['summary']
        print(f"\n📊 SUMMARY")
        print(f"   Total files scanned: {summary['total_files']}")
        print(f"   Unused files: {summary['unused_files']}")
        print(f"   Orphaned files: {summary['orphaned_files']}")
        print(f"   Files with no exports: {summary['files_with_no_exports']}")

        if summary['unused_files'] > 0:
            print(f"\n🗑️  UNUSED FILES ({summary['unused_files']})")
            print("   These files are never imported by any other file:")
            self._print_categorized_files(report['unused_files'], detailed)

        if summary['orphaned_files'] > 0:
            print(f"\n👻 ORPHANED FILES ({summary['orphaned_files']})")
            print("   These files have no imports or exports (completely isolated):")
            self._print_categorized_files(report['orphaned_files'], detailed)

        if summary['files_with_no_exports'] > 0 and detailed:
            print(f"\n⚠️  FILES WITH NO EXPORTS ({summary['files_with_no_exports']})")
            print("   These files import other files but export nothing (might be side-effect files):")
            self._print_categorized_files(report['files_with_no_exports'], detailed)

        if summary['unused_files'] == 0 and summary['orphaned_files'] == 0:
            print("\n✅ No dead code detected!")

        print("\n" + "=" * 80)

    def _print_categorized_files(self, categories: Dict[str, List[Path]], detailed: bool):
        """Print categorized files."""
        for category, files in sorted(categories.items()):
            if files:
                print(f"\n   {category} ({len(files)} files):")
                for file in sorted(files):
                    rel_path = self.get_relative_path(file)
                    print(f"      • {rel_path}")

                    if detailed:
                        # Show what this file imports
                        imports = self.imports.get(file, set())
                        if imports:
                            print(f"        Imports: {', '.join(sorted(imports)[:3])}")


def main():
    parser = argparse.ArgumentParser(
        description='Detect dead code and unused files in a TypeScript/JavaScript monorepo'
    )
    parser.add_argument(
        '--detailed',
        action='store_true',
        help='Show detailed information including files with no exports'
    )
    parser.add_argument(
        '--json',
        action='store_true',
        help='Output results as JSON'
    )
    parser.add_argument(
        '--root',
        type=str,
        default='.',
        help='Root directory of the monorepo (default: current directory)'
    )

    args = parser.parse_args()

    # Get the absolute path to the root directory
    root_dir = Path(args.root).resolve()

    if not root_dir.exists():
        print(f"Error: Directory {root_dir} does not exist")
        return 1

    # Create detector and run analysis
    detector = DeadCodeDetector(root_dir)
    detector.scan_files()
    detector.build_dependency_graph()
    report = detector.generate_report(detailed=args.detailed)

    # Output results
    if args.json:
        # Convert Path objects to strings for JSON serialization
        json_report = {
            'summary': report['summary'],
            'unused_files': {
                cat: [detector.get_relative_path(f) for f in files]
                for cat, files in report['unused_files'].items()
            },
            'orphaned_files': {
                cat: [detector.get_relative_path(f) for f in files]
                for cat, files in report['orphaned_files'].items()
            },
            'files_with_no_exports': {
                cat: [detector.get_relative_path(f) for f in files]
                for cat, files in report['files_with_no_exports'].items()
            },
        }
        print(json.dumps(json_report, indent=2))
    else:
        detector.print_report(report, detailed=args.detailed)

    # Return exit code based on findings
    if report['summary']['unused_files'] > 0 or report['summary']['orphaned_files'] > 0:
        return 1
    return 0


if __name__ == '__main__':
    exit(main())
