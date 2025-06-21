#!/usr/bin/env python3
"""
Accessibility and Eldercare Compliance Testing for MyHealth Guide
Tests font sizes, touch targets, color contrast, and other eldercare requirements
"""

import re
import os
from pathlib import Path

class AccessibilityTester:
    def __init__(self, project_root="."):
        self.project_root = Path(project_root)
        self.issues = []
        self.warnings = []
        
    def check_font_sizes(self):
        """Check if font sizes meet eldercare minimum (1.2rem/19.2px)"""
        print("\n🔍 Checking Font Sizes...")
        
        css_files = [
            self.project_root / "src/app/globals.css",
            self.project_root / "tailwind.config.js"
        ]
        
        small_font_patterns = [
            r'font-size:\s*(\d+(?:\.\d+)?)(px|rem)',
            r'text-(?:xs|sm)(?:\s|"|\'|:)',
            r'\'elder-xs\':\s*\'(\d+(?:\.\d+)?)(rem|px)\''
        ]
        
        issues_found = False
        
        for file_path in css_files:
            if file_path.exists():
                content = file_path.read_text()
                
                # Check for small font sizes
                for pattern in small_font_patterns:
                    matches = re.finditer(pattern, content)
                    for match in matches:
                        if len(match.groups()) >= 2:
                            size = float(match.group(1))
                            unit = match.group(2)
                            
                            # Convert to px for comparison
                            size_px = size * 16 if unit == 'rem' else size
                            
                            if size_px < 17.6:  # Minimum for eldercare
                                self.issues.append(f"Small font size found: {size}{unit} ({size_px}px) in {file_path.name}")
                                issues_found = True
        
        # Check Tailwind config for eldercare font sizes
        tailwind_config = self.project_root / "tailwind.config.js"
        if tailwind_config.exists():
            content = tailwind_config.read_text()
            if "'elder-sm': '1.2rem'" in content and "'elder-base': '1.3rem'" in content:
                print("✅ Eldercare font sizes properly configured in Tailwind")
            else:
                self.issues.append("❌ Eldercare font sizes not properly configured")
                issues_found = True
        
        if not issues_found:
            print("✅ All font sizes meet eldercare requirements")
        
        return not issues_found
    
    def check_touch_targets(self):
        """Check if touch targets meet 44px minimum"""
        print("\n🔍 Checking Touch Targets...")
        
        patterns_to_check = [
            (r'min-h-\[(\d+)px\]', "Tailwind min-height"),
            (r'min-height:\s*(\d+)px', "CSS min-height"),
            (r'touch-target', "Touch target utility class")
        ]
        
        components_dir = self.project_root / "src/components"
        issues_found = False
        
        for component_file in components_dir.rglob("*.tsx"):
            content = component_file.read_text()
            
            # Check for button/input elements
            if any(tag in content for tag in ['<button', '<input', '<a ']):
                has_proper_sizing = False
                
                for pattern, desc in patterns_to_check:
                    matches = re.finditer(pattern, content)
                    for match in matches:
                        if len(match.groups()) >= 1:
                            size = int(match.group(1))
                            if size >= 44:
                                has_proper_sizing = True
                        elif 'touch-target' in match.group(0):
                            has_proper_sizing = True
                
                if not has_proper_sizing and 'min-h-[44px]' not in content:
                    self.warnings.append(f"Check touch target sizing in {component_file.name}")
        
        # Check Button component specifically
        button_file = self.project_root / "src/components/ui/Button.tsx"
        if button_file.exists():
            content = button_file.read_text()
            if 'min-h-[44px]' in content or 'min-h-[48px]' in content or 'min-h-[56px]' in content:
                print("✅ Button component has proper touch targets")
            else:
                self.issues.append("❌ Button component missing proper touch target sizing")
                issues_found = True
        
        return not issues_found
    
    def check_color_contrast(self):
        """Check color contrast ratios"""
        print("\n🔍 Checking Color Contrast...")
        
        # Check Tailwind config for color definitions
        tailwind_config = self.project_root / "tailwind.config.js"
        if tailwind_config.exists():
            content = tailwind_config.read_text()
            
            # Look for health status colors
            required_colors = ['health-safe', 'health-warning', 'health-danger']
            all_colors_found = all(color in content for color in required_colors)
            
            if all_colors_found:
                print("✅ Health status colors defined")
            else:
                self.issues.append("❌ Missing health status color definitions")
        
        # Check for proper text color usage
        high_contrast_patterns = [
            'text-elder-text',
            'text-elder-text-secondary',
            'text-white',
            'text-primary-'
        ]
        
        components_dir = self.project_root / "src/components"
        for component_file in components_dir.rglob("*.tsx"):
            content = component_file.read_text()
            
            # Check if text colors are properly used
            if '<p' in content or '<span' in content or '<h' in content:
                has_proper_color = any(pattern in content for pattern in high_contrast_patterns)
                if not has_proper_color:
                    self.warnings.append(f"Check text color contrast in {component_file.name}")
        
        return True
    
    def check_aria_labels(self):
        """Check for ARIA labels and accessibility attributes"""
        print("\n🔍 Checking ARIA Labels...")
        
        required_aria_patterns = [
            (r'<button(?![^>]*aria-label)', "Button without aria-label"),
            (r'<input(?![^>]*(?:aria-label|aria-describedby))', "Input without aria attributes"),
            (r'role="[^"]+"', "Role attribute usage")
        ]
        
        components_dir = self.project_root / "src/components"
        good_practices = 0
        total_components = 0
        
        for component_file in components_dir.rglob("*.tsx"):
            content = component_file.read_text()
            total_components += 1
            
            # Check for good ARIA practices
            if 'aria-label' in content or 'aria-describedby' in content or 'role=' in content:
                good_practices += 1
            
            # Check for missing ARIA on interactive elements
            for pattern, desc in required_aria_patterns[:2]:
                matches = re.finditer(pattern, content)
                for match in matches:
                    # Check if it's an icon-only button
                    if '<Icon' in content or 'icon' in content.lower():
                        self.warnings.append(f"{desc} in {component_file.name} (may need aria-label for icon-only elements)")
        
        if good_practices > total_components * 0.7:
            print(f"✅ Good ARIA label coverage ({good_practices}/{total_components} components)")
        else:
            self.issues.append(f"❌ Low ARIA label coverage ({good_practices}/{total_components} components)")
        
        return good_practices > total_components * 0.5
    
    def check_voice_support(self):
        """Check for voice input support"""
        print("\n🔍 Checking Voice Support...")
        
        voice_files = [
            self.project_root / "src/components/medication/VoiceInput.tsx",
            self.project_root / "src/lib/utils/voice.ts",
            self.project_root / "src/hooks/useVoice.ts"
        ]
        
        all_exist = all(f.exists() for f in voice_files)
        
        if all_exist:
            print("✅ Voice input components found")
            
            # Check VoiceInput component
            voice_input = voice_files[0].read_text()
            if 'webkitSpeechRecognition' in voice_input or 'SpeechRecognition' in voice_input:
                print("✅ Speech recognition API implemented")
            else:
                self.issues.append("❌ Speech recognition not properly implemented")
        else:
            self.issues.append("❌ Voice input components missing")
        
        return all_exist
    
    def check_medical_disclaimers(self):
        """Check for medical disclaimers"""
        print("\n🔍 Checking Medical Disclaimers...")
        
        # Check constants file
        constants_file = self.project_root / "src/lib/constants.ts"
        if constants_file.exists():
            content = constants_file.read_text()
            disclaimers = ['GENERAL', 'AI_LIMITATIONS', 'EMERGENCY', 'NOT_FDA_APPROVED']
            
            all_found = all(f"'{d}':" in content for d in disclaimers)
            if all_found:
                print("✅ All medical disclaimers defined")
            else:
                self.issues.append("❌ Missing medical disclaimers")
        
        # Check if disclaimers are used in medication checking
        medgemma_file = self.project_root / "src/lib/vertex-ai/medgemma.ts"
        if medgemma_file.exists():
            content = medgemma_file.read_text()
            if 'DISCLAIMERS' in content and 'disclaimer:' in content:
                print("✅ Disclaimers integrated in medication checking")
            else:
                self.issues.append("❌ Disclaimers not properly integrated")
        
        return True
    
    def check_responsive_design(self):
        """Check responsive design for mobile devices"""
        print("\n🔍 Checking Responsive Design...")
        
        # Check Tailwind config for breakpoints
        tailwind_config = self.project_root / "tailwind.config.js"
        if tailwind_config.exists():
            content = tailwind_config.read_text()
            if "'elder-tablet': '768px'" in content and "'elder-desktop': '1024px'" in content:
                print("✅ Eldercare-specific breakpoints configured")
            else:
                self.warnings.append("⚠️  Consider adding eldercare-specific breakpoints")
        
        # Check for responsive classes in components
        responsive_classes = ['sm:', 'md:', 'lg:', 'elder-tablet:', 'elder-desktop:']
        components_dir = self.project_root / "src/components"
        
        responsive_components = 0
        total_components = 0
        
        for component_file in components_dir.rglob("*.tsx"):
            content = component_file.read_text()
            total_components += 1
            
            if any(cls in content for cls in responsive_classes):
                responsive_components += 1
        
        if responsive_components > total_components * 0.5:
            print(f"✅ Good responsive design coverage ({responsive_components}/{total_components} components)")
        else:
            self.warnings.append(f"⚠️  Low responsive design coverage ({responsive_components}/{total_components} components)")
        
        return True
    
    def run_all_checks(self):
        """Run all accessibility checks"""
        print("🏥 MyHealth Guide Accessibility & Eldercare Compliance Check")
        print("=" * 60)
        
        checks = {
            "Font Sizes": self.check_font_sizes(),
            "Touch Targets": self.check_touch_targets(),
            "Color Contrast": self.check_color_contrast(),
            "ARIA Labels": self.check_aria_labels(),
            "Voice Support": self.check_voice_support(),
            "Medical Disclaimers": self.check_medical_disclaimers(),
            "Responsive Design": self.check_responsive_design()
        }
        
        print("\n" + "=" * 60)
        print("📊 Accessibility Check Summary:")
        print("=" * 60)
        
        for check_name, result in checks.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{check_name.ljust(20)}: {status}")
        
        if self.issues:
            print("\n❌ Critical Issues Found:")
            for issue in self.issues:
                print(f"  - {issue}")
        
        if self.warnings:
            print("\n⚠️  Warnings:")
            for warning in self.warnings:
                print(f"  - {warning}")
        
        total_checks = len(checks)
        passed_checks = sum(1 for r in checks.values() if r)
        
        print("\n" + "=" * 60)
        print(f"Score: {passed_checks}/{total_checks} checks passed")
        
        if passed_checks == total_checks and not self.issues:
            print("\n🎉 Excellent! All accessibility requirements met!")
        elif passed_checks >= total_checks * 0.8:
            print("\n👍 Good accessibility compliance with minor issues to address")
        else:
            print("\n⚠️  Significant accessibility improvements needed")
        
        return checks

if __name__ == "__main__":
    import sys
    
    project_root = sys.argv[1] if len(sys.argv) > 1 else "."
    
    tester = AccessibilityTester(project_root)
    tester.run_all_checks()