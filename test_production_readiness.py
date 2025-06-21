#!/usr/bin/env python3
"""
Production Readiness Test Suite for MyHealth Guide
Comprehensive testing of security, performance, and compliance
"""

import os
import re
import json
from pathlib import Path
from datetime import datetime

class ProductionReadinessTester:
    def __init__(self, project_root="."):
        self.project_root = Path(project_root)
        self.results = {
            "passed": [],
            "failed": [],
            "warnings": []
        }
    
    def test_environment_setup(self):
        """Test environment configuration"""
        print("\n🔍 Testing Environment Setup...")
        
        # Check .env.example exists
        env_example = self.project_root / ".env.example"
        if env_example.exists():
            self.results["passed"].append("✅ .env.example file exists")
            
            # Check for all required variables
            content = env_example.read_text()
            required_vars = [
                "NEXT_PUBLIC_FIREBASE_API_KEY",
                "GOOGLE_CLOUD_PROJECT_ID",
                "RESEND_API_KEY"
            ]
            
            for var in required_vars:
                if var in content:
                    self.results["passed"].append(f"✅ {var} documented")
                else:
                    self.results["failed"].append(f"❌ {var} missing from .env.example")
        else:
            self.results["failed"].append("❌ .env.example file missing")
        
        # Check .gitignore includes .env
        gitignore = self.project_root / ".gitignore"
        if gitignore.exists():
            content = gitignore.read_text()
            if ".env" in content:
                self.results["passed"].append("✅ .env properly gitignored")
            else:
                self.results["failed"].append("❌ .env not in .gitignore")
    
    def test_security_measures(self):
        """Test security implementations"""
        print("\n🔍 Testing Security Measures...")
        
        # Check for rate limiting
        rate_limit_file = self.project_root / "src/lib/middleware/rate-limit.ts"
        if rate_limit_file.exists():
            self.results["passed"].append("✅ Rate limiting middleware implemented")
            
            content = rate_limit_file.read_text()
            if "429" in content:
                self.results["passed"].append("✅ Proper 429 status for rate limits")
        else:
            self.results["failed"].append("❌ Rate limiting not implemented")
        
        # Check API routes for authentication
        api_dir = self.project_root / "src/app/api"
        protected_routes = ["medication/check"]
        
        for route in protected_routes:
            route_file = api_dir / route / "route.ts"
            if route_file.exists():
                content = route_file.read_text()
                if "verifyAuthToken" in content or "verifyIdToken" in content:
                    self.results["passed"].append(f"✅ {route} has authentication")
                else:
                    self.results["failed"].append(f"❌ {route} missing authentication")
        
        # Check for input validation
        if (api_dir / "auth/signup/route.ts").exists():
            content = (api_dir / "auth/signup/route.ts").read_text()
            if "zod" in content and "safeParse" in content:
                self.results["passed"].append("✅ Input validation with Zod")
            else:
                self.results["failed"].append("❌ Missing input validation")
    
    def test_error_handling(self):
        """Test error handling implementation"""
        print("\n🔍 Testing Error Handling...")
        
        # Check for ErrorBoundary
        error_boundary = self.project_root / "src/components/ErrorBoundary.tsx"
        if error_boundary.exists():
            self.results["passed"].append("✅ ErrorBoundary component exists")
            
            # Check if it's used in layout
            layout_file = self.project_root / "src/app/layout.tsx"
            if layout_file.exists():
                content = layout_file.read_text()
                if "ErrorBoundary" in content:
                    self.results["passed"].append("✅ ErrorBoundary used in layout")
                else:
                    self.results["failed"].append("❌ ErrorBoundary not used in layout")
        else:
            self.results["failed"].append("❌ ErrorBoundary component missing")
        
        # Check API error responses
        api_files = list((self.project_root / "src/app/api").rglob("route.ts"))
        proper_error_handling = 0
        
        for api_file in api_files:
            content = api_file.read_text()
            if "try" in content and "catch" in content and "status: 500" in content:
                proper_error_handling += 1
        
        if proper_error_handling == len(api_files):
            self.results["passed"].append(f"✅ All {len(api_files)} API routes have error handling")
        else:
            self.results["warnings"].append(f"⚠️  {len(api_files) - proper_error_handling} API routes may lack proper error handling")
    
    def test_performance_optimizations(self):
        """Test performance optimizations"""
        print("\n🔍 Testing Performance Optimizations...")
        
        # Check Next.js config
        next_config = self.project_root / "next.config.js"
        if next_config.exists():
            content = next_config.read_text()
            
            optimizations = {
                "reactStrictMode: true": "React strict mode",
                "swcMinify: true": "SWC minification",
                "images:": "Image optimization"
            }
            
            for check, desc in optimizations.items():
                if check in content:
                    self.results["passed"].append(f"✅ {desc} enabled")
                else:
                    self.results["warnings"].append(f"⚠️  {desc} not configured")
        
        # Check for lazy loading
        component_files = list((self.project_root / "src/components").rglob("*.tsx"))
        lazy_imports = 0
        
        for file in component_files:
            content = file.read_text()
            if "dynamic(" in content or "lazy(" in content:
                lazy_imports += 1
        
        if lazy_imports > 0:
            self.results["passed"].append(f"✅ Lazy loading used in {lazy_imports} components")
    
    def test_eldercare_compliance(self):
        """Test eldercare-specific requirements"""
        print("\n🔍 Testing Eldercare Compliance...")
        
        # Check Tailwind config for eldercare settings
        tailwind_config = self.project_root / "tailwind.config.js"
        if tailwind_config.exists():
            content = tailwind_config.read_text()
            
            eldercare_checks = {
                "'elder-base': '1.3rem'": "Base font size (20.8px)",
                "'touch': '44px'": "Touch target size",
                "health-safe": "Health status colors"
            }
            
            for check, desc in eldercare_checks.items():
                if check in content:
                    self.results["passed"].append(f"✅ {desc} configured")
                else:
                    self.results["failed"].append(f"❌ {desc} not configured")
        
        # Check for voice support
        voice_files = [
            "src/components/medication/VoiceInput.tsx",
            "src/hooks/useVoice.ts"
        ]
        
        voice_support = sum(1 for f in voice_files if (self.project_root / f).exists())
        if voice_support == len(voice_files):
            self.results["passed"].append("✅ Voice input support implemented")
        else:
            self.results["failed"].append("❌ Voice input not fully implemented")
    
    def test_build_configuration(self):
        """Test build and deployment configuration"""
        print("\n🔍 Testing Build Configuration...")
        
        # Check package.json scripts
        package_json = self.project_root / "package.json"
        if package_json.exists():
            data = json.loads(package_json.read_text())
            scripts = data.get("scripts", {})
            
            required_scripts = ["build", "start", "lint", "type-check"]
            for script in required_scripts:
                if script in scripts:
                    self.results["passed"].append(f"✅ {script} script configured")
                else:
                    self.results["failed"].append(f"❌ {script} script missing")
        
        # Check TypeScript config
        tsconfig = self.project_root / "tsconfig.json"
        if tsconfig.exists():
            data = json.loads(tsconfig.read_text())
            compiler_options = data.get("compilerOptions", {})
            
            if compiler_options.get("strict") == True:
                self.results["passed"].append("✅ TypeScript strict mode enabled")
            else:
                self.results["failed"].append("❌ TypeScript strict mode not enabled")
    
    def generate_report(self):
        """Generate final report"""
        print("\n" + "=" * 60)
        print("📊 Production Readiness Report")
        print("=" * 60)
        print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        # Summary
        total_passed = len(self.results["passed"])
        total_failed = len(self.results["failed"])
        total_warnings = len(self.results["warnings"])
        total_checks = total_passed + total_failed
        
        if total_checks > 0:
            score = (total_passed / total_checks) * 100
            print(f"Overall Score: {score:.1f}%")
            print(f"Passed: {total_passed} | Failed: {total_failed} | Warnings: {total_warnings}")
        
        # Passed checks
        if self.results["passed"]:
            print("\n✅ Passed Checks:")
            for item in self.results["passed"]:
                print(f"  {item}")
        
        # Failed checks
        if self.results["failed"]:
            print("\n❌ Failed Checks:")
            for item in self.results["failed"]:
                print(f"  {item}")
        
        # Warnings
        if self.results["warnings"]:
            print("\n⚠️  Warnings:")
            for item in self.results["warnings"]:
                print(f"  {item}")
        
        # Final verdict
        print("\n" + "=" * 60)
        if total_failed == 0:
            print("🎉 PRODUCTION READY - All critical checks passed!")
        elif total_failed <= 2:
            print("👍 NEARLY READY - Minor issues to address")
        else:
            print("⚠️  NOT READY - Critical issues need resolution")
        
        return score if total_checks > 0 else 0
    
    def run_all_tests(self):
        """Run all production readiness tests"""
        print("🚀 MyHealth Guide Production Readiness Test")
        print("=" * 60)
        
        self.test_environment_setup()
        self.test_security_measures()
        self.test_error_handling()
        self.test_performance_optimizations()
        self.test_eldercare_compliance()
        self.test_build_configuration()
        
        return self.generate_report()

if __name__ == "__main__":
    import sys
    
    project_root = sys.argv[1] if len(sys.argv) > 1 else "."
    
    tester = ProductionReadinessTester(project_root)
    score = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if score >= 90 else 1)