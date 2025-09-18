#!/usr/bin/env python3
"""
Document Processing Service
Extracts text from uploaded documents and summarizes using Gemini API
"""

import os
import sys
import json
import logging
from typing import Dict, Any, Optional
from pathlib import Path

# Document processing libraries
import PyPDF2
from PIL import Image
import pytesseract
import google.generativeai as genai
from firebase_admin import credentials, firestore, storage, initialize_app

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK
cred = credentials.Certificate('path/to/serviceAccountKey.json')
initialize_app(cred, {
    'storageBucket': 'your-project.appspot.com'
})

db = firestore.client()
bucket = storage.bucket()

# Configure Gemini API
genai.configure(api_key=os.environ.get('GEMINI_API_KEY'))
model = genai.GenerativeModel('gemini-pro')


class DocumentProcessor:
    """Process and analyze caregiver documents"""

    def __init__(self):
        self.supported_formats = ['.pdf', '.jpg', '.jpeg', '.png']

    def process_document(self, document_path: str, document_type: str) -> Dict[str, Any]:
        """
        Main processing pipeline
        """
        try:
            # Extract text based on file type
            file_extension = Path(document_path).suffix.lower()

            if file_extension == '.pdf':
                text = self._extract_pdf_text(document_path)
            elif file_extension in ['.jpg', '.jpeg', '.png']:
                text = self._extract_image_text(document_path)
            else:
                raise ValueError(f"Unsupported file format: {file_extension}")

            # Analyze with Gemini based on document type
            analysis = self._analyze_with_gemini(text, document_type)

            return {
                'status': 'success',
                'extracted_text': text[:500],  # First 500 chars for preview
                'full_text_length': len(text),
                'analysis': analysis,
                'document_type': document_type
            }

        except Exception as e:
            logger.error(f"Document processing failed: {str(e)}")
            return {
                'status': 'error',
                'error': str(e)
            }

    def _extract_pdf_text(self, pdf_path: str) -> str:
        """Extract text from PDF"""
        text = ""
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                text += page.extract_text()
        return text

    def _extract_image_text(self, image_path: str) -> str:
        """Extract text from image using OCR"""
        image = Image.open(image_path)
        text = pytesseract.image_to_string(image)
        return text

    def _analyze_with_gemini(self, text: str, document_type: str) -> Dict[str, Any]:
        """Analyze document content with Gemini"""

        prompts = {
            'certification': """
                Analyze this certification document and extract:
                1. Certification type and issuing organization
                2. Issue date and expiration date
                3. Certification number
                4. Key qualifications granted
                5. Any restrictions or limitations

                Text: {text}
            """,
            'background_check': """
                Analyze this background check document and extract:
                1. Type of background check performed
                2. Date of check
                3. Overall result (pass/fail/pending)
                4. Any flags or concerns mentioned
                5. Verification reference number

                Text: {text}
            """,
            'identification': """
                Analyze this ID document and extract:
                1. Type of ID (driver's license, passport, etc.)
                2. Issuing authority
                3. Expiration date
                4. Any relevant endorsements

                Text: {text}
            """
        }

        prompt = prompts.get(document_type, """
            Summarize the key information from this document:
            Text: {text}
        """).format(text=text[:4000])  # Limit text to avoid token limits

        try:
            response = model.generate_content(prompt)
            return {
                'summary': response.text,
                'confidence': 'high' if len(text) > 100 else 'low'
            }
        except Exception as e:
            logger.error(f"Gemini API error: {str(e)}")
            return {
                'summary': 'Unable to analyze document',
                'error': str(e)
            }

    def update_firestore(self, user_id: str, document_id: str, analysis_result: Dict):
        """Update Firestore with processing results"""
        doc_ref = db.collection('caregiverDocuments').document(user_id).collection('documents').document(document_id)

        doc_ref.update({
            'processingStatus': 'completed',
            'analysis': analysis_result,
            'processedAt': firestore.SERVER_TIMESTAMP,
            'requiresReview': True  # Admin needs to verify
        })


def main():
    """Entry point for document processing"""
    if len(sys.argv) < 4:
        print("Usage: python document_processor.py <file_path> <document_type> <user_id>")
        sys.exit(1)

    file_path = sys.argv[1]
    document_type = sys.argv[2]
    user_id = sys.argv[3]

    processor = DocumentProcessor()
    result = processor.process_document(file_path, document_type)

    # Update Firestore
    if result['status'] == 'success':
        processor.update_firestore(user_id, os.path.basename(file_path), result)

    # Output result as JSON
    print(json.dumps(result))


if __name__ == "__main__":
    main()