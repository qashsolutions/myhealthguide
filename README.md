# MyHealth Guide

AI-powered medication safety platform designed specifically for elderly users, featuring voice interfaces and accessibility-first design.

## 🏥 Features

- **Medication Conflict Detection**: AI-powered analysis using MedGemma
- **Voice Interface**: Speech recognition and text-to-speech for easy interaction
- **Eldercare Optimized**: Large fonts, high contrast, simple navigation
- **Traffic Light System**: Easy-to-understand safety indicators
- **WCAG 2.1 AA Compliant**: Full accessibility support
- **Secure**: HIPAA-compliant with enterprise-grade security

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/myhealthguide.git
   cd myhealthguide
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open browser**
   ```
   http://localhost:3000
   ```

## 🔧 Environment Setup

Required environment variables:

- `NEXT_PUBLIC_FIREBASE_*` - Firebase configuration
- `GOOGLE_CLOUD_CREDENTIALS` - Vertex AI credentials
- `RESEND_API_KEY` - Email service API key

See `.env.example` for complete list.

## 📦 Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS (eldercare-optimized)
- **Authentication**: Firebase Auth
- **AI/ML**: Google Vertex AI (MedGemma)
- **Email**: Resend
- **Hosting**: Vercel
- **Security**: Rate limiting, CSP, HTTPS

## 🛡️ Security

- Comprehensive security headers
- Rate limiting on all API endpoints
- Input validation with Zod
- Automated security scanning
- No `eval()` in production
- Medical disclaimer enforcement

## 🧪 Testing

```bash
# Run security checks
npm run security:check

# Run tests (when implemented)
npm test

# Run E2E tests
npm run test:e2e
```

## 📱 Accessibility Features

- Minimum font size: 1.2rem
- Touch targets: 44px minimum
- High contrast colors
- Screen reader support
- Keyboard navigation
- Voice control

## 🚀 Deployment

Automatic deployment via Vercel:

1. Push to `main` branch
2. Vercel automatically builds and deploys
3. Preview deployments for pull requests

## 📄 License

This project is licensed under the MIT License.

## ⚠️ Medical Disclaimer

This application provides informational support only and does not replace professional medical advice. Always consult healthcare providers for medical decisions.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📞 Support

For support, email support@myhealthguide.com