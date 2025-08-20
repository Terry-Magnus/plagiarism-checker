Plagiarism Checker
A web-based plagiarism detection tool built as a final year project. Users can input text or upload PDF/TXT files to check for plagiarism against online sources using the Google Custom Search API. The application generates a detailed report highlighting matched sections and provides a downloadable PDF summary.
Features

Text Input: Enter text via a textarea to check for plagiarism.
File Upload: Upload PDF or TXT files for analysis.
Plagiarism Detection: Compares text against web sources using Google Custom Search API.
Results Display: Shows plagiarism percentage, matched text chunks, similarity scores, and source URLs.
Highlighted Text: Highlights plagiarized sections in the original text.
PDF Report: Generates a downloadable PDF report with summary and matches.
Responsive UI: Built with React and Tailwind CSS for a modern, mobile-friendly interface.
Secure: Sanitizes inputs to prevent XSS attacks.

Tech Stack

Backend: Node.js, Express.js, Multer (file uploads), PDFKit (PDF generation), Axios (API requests), Sanitize-HTML (input sanitization), String-Similarity (text comparison).
Frontend: React, Tailwind CSS, Axios, React-Dropzone (file uploads).
API: Google Custom Search JSON API for plagiarism detection.
Environment: Managed with .env files for secure configuration.

Project Structure
plagiarism-checker/
├── backend/
│ ├── routes/
│ │ └── plagiarismRoutes.js # API routes for plagiarism check and report generation
│ ├── PlagiarismService.js # Text parsing and chunking logic
│ ├── SearchService.js # Google API search and similarity comparison
│ ├── utils.js # Input sanitization utilities
│ ├── server.js # Express server setup
│ ├── package.json # Backend dependencies
│ └── .env # Backend environment variables
├── frontend/
│ ├── src/
│ │ ├── App.jsx # Main React component
│ │ └── index.css # Tailwind CSS styles
│ ├── package.json # Frontend dependencies
│ └── .env # Frontend environment variables
└── README.md # Project documentation

Prerequisites

Node.js: Version 14 or higher.
npm: Version 6 or higher.
Google Cloud Account: For Google Custom Search API key and Search Engine ID.
Browser: Modern browser (e.g., Chrome, Firefox) for frontend testing.

Setup Instructions
Backend Setup

Navigate to Backend Directory:cd backend

Install Dependencies:npm install express cors multer pdfkit sanitize-html axios string-similarity pdf-parse dotenv

Configure Environment Variables:
Create a .env file in backend/:GOOGLE_API_KEY=your_google_api_key
GOOGLE_CSE_ID=your_custom_search_engine_id
PORT=5000

Obtain GOOGLE_API_KEY from Google Cloud Console:
Create a project.
Enable Custom Search API.
Create an API key under Credentials.

Obtain GOOGLE_CSE_ID from Programmable Search Engine:
Create a search engine with “Search the entire web” enabled.
Copy the Search Engine ID.

Start the Backend:node server.js

Server runs on http://localhost:5000.

Frontend Setup

Navigate to Frontend Directory:cd frontend

Install Dependencies:npm install react axios react-dropzone tailwindcss postcss autoprefixer

Initialize Tailwind CSS:npx tailwindcss init

Update tailwind.config.js:module.exports = {
content: ['./src/**/*.{js,jsx,ts,tsx}'],
theme: { extend: {} },
plugins: [],
};

Create src/index.css:@tailwind base;
@tailwind components;
@tailwind utilities;

Import in src/index.js:import './index.css';

Configure Environment Variables:
Create a .env file in frontend/:REACT_APP_API_URL=http://localhost:5000

Start the Frontend:npm start

App runs on http://localhost:3000.

API Setup

Google Custom Search API:
Free tier: ~100 queries/day (resets at midnight Pacific Time).
Paid tier: $5 per 1,000 queries, up to 10,000/day.
Monitor usage in Google Cloud Console.

Quota Management: Text is split into chunks (>50 characters) to minimize API calls. Caching can be added with node-cache for repeated queries.

Usage

Open the App:
Navigate to http://localhost:3000.

Input Text or File:
Enter text in the textarea or upload a PDF/TXT file via the Dropzone.

Check Plagiarism:
Click “Check Plagiarism” to analyze text.
View results: plagiarism percentage, matched chunks, similarity scores, and source URLs.
Matched text is highlighted in red.

Download Report:
Click “Download PDF Report” to generate a PDF with summary and matches.

API Endpoints

POST /check-plagiarism:
Accepts: multipart/form-data with text (string) or file (PDF/TXT).
Returns: JSON with text, results (array of matches), and plagiarismPercentage.
Example:{
"text": "Artificial intelligence (AI) refers to...",
"results": [
{
"chunk": "Artificial intelligence (AI) refers to...",
"source": "https://insights.btoes.com/what-is-artificial-intelligence",
"similarity": 1
}
],
"plagiarismPercentage": 100
}

POST /generate-report:
Accepts: JSON with text, results, and plagiarismPercentage.
Returns: PDF file (plagiarism_report.pdf).

Testing

Test Text: Use a known online source (e.g., Wikipedia: “Artificial intelligence (AI) refers to...”) to verify matches.
Test File: Create a .txt or PDF with the same text.
Curl Commands:# Check plagiarism
curl -X POST http://localhost:5000/check-plagiarism \
 -H "Content-Type: application/json" \
 -d '{"text":"Artificial intelligence (AI) refers to..."}'

# Generate report

curl -X POST http://localhost:5000/generate-report \
 -H "Content-Type: application/json" \
 -o plagiarism_report.pdf \
 -d '{"text":"Artificial intelligence (AI) refers to...","results":[{"chunk":"Artificial intelligence (AI) refers to...","source":"https://example.com","similarity":1}],"plagiarismPercentage":100}'

Quota Check: Monitor Google API usage in Google Cloud Console to avoid 429 errors.

Limitations

API Quota: Free tier limits to ~100 queries/day. Use a 50-character chunk threshold to reduce calls.
File Support: Only PDF and TXT files are supported.
Accuracy: Depends on Google API indexing and similarity threshold (0.8).

Future Improvements

Support additional file formats (e.g., DOCX) using mammoth.
Integrate Bing Web Search API for higher free tier (1,000 queries/month).
Add real-time progress bar for large files.
Enhance UI with toast notifications (e.g., react-toastify).

Troubleshooting

429 Too Many Requests: Wait for quota reset (8:00 AM WAT) or enable billing for higher quota.
CORS Errors: Ensure cors middleware in server.js allows http://localhost:3000.
No Matches: Test with widely indexed text (e.g., Wikipedia) or lower similarity threshold (0.8 to 0.6).
Logs: Check server console for Chunks: and Search error: messages.

License
MIT License. See LICENSE for details.
