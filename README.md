# Plagiarism Checker

A web-based plagiarism detection tool developed as a final year project. Users can input text or upload PDF/TXT files to check for plagiarism against online sources using the Google Custom Search API. The application displays a detailed report with matched sections, similarity scores, and a downloadable PDF summary.

## Features

- **Text Input**: Enter text via a textarea to check for plagiarism.
- **File Upload**: Upload PDF or TXT files for analysis.
- **Plagiarism Detection**: Compares text against web sources using the Google Custom Search API.
- **Results Display**: Shows plagiarism percentage, matched text chunks, similarity scores, and clickable source URLs.
- **Highlighted Text**: Highlights plagiarized sections in the original text.
- **PDF Report**: Generates a downloadable PDF report with summary and matches.
- **Responsive UI**: Built with React and Tailwind CSS for a modern, mobile-friendly interface.
- **Secure**: Sanitizes inputs to prevent XSS attacks and uses CORS for secure API communication.

## Tech Stack

- **Backend**: Node.js, Express.js, Multer (file uploads), PDFKit (PDF generation), Axios (API requests), Sanitize-HTML (input sanitization), String-Similarity (text comparison).
- **Frontend**: React, Tailwind CSS, Axios, React-Dropzone (file uploads).
- **API**: Google Custom Search JSON API for plagiarism detection.
- **Environment**: Managed with `.env` files in `frontend/` and `backend/` for secure configuration.

## Project Structure

```
plagiarism-checker/
├── client/                    # Frontend (React)
│   ├── src/
│   │   ├── App.jsx             # Main React component
│   │   └── index.css           # Tailwind CSS styles
│   ├── package.json            # Frontend dependencies
│   └── .env                    # Frontend environment variables
├── server/                     # Backend (Node.js/Express)
│   ├── routes/
│   │   └── plagiarismRoutes.js # API routes for plagiarism check and report generation
│   ├── PlagiarismService.js     # Text parsing and chunking logic
│   ├── SearchService.js         # Google API search and similarity comparison
│   ├── utils.js                # Input sanitization utilities
│   ├── server.js               # Express server setup
│   ├── package.json            # Backend dependencies
│   └── .env                    # Backend environment variables
├── README.md                   # Project documentation
└── .gitignore                  # Git ignore file
```

## Prerequisites

- **Node.js**: Version 14 or higher.
- **npm**: Version 6 or higher.
- **Google Cloud Account**: For Google Custom Search API key and Search Engine ID.
- **Browser**: Modern browser (e.g., Chrome, Firefox) for frontend testing.

## Setup Instructions

### Backend Setup

1. **Navigate to Backend Directory**:

   ```bash
   cd server
   ```

2. **Install Dependencies**:

   ```bash
   npm install express cors multer pdfkit sanitize-html axios string-similarity pdf-parse dotenv
   ```

3. **Configure Environment Variables**:

   - Create `backend/.env`:
     ```env
     GOOGLE_API_KEY=your_google_api_key
     GOOGLE_CSE_ID=your_custom_search_engine_id
     ```
   - Obtain `GOOGLE_API_KEY` from [Google Cloud Console](https://console.cloud.google.com):
     - Create a project.
     - Enable Custom Search API.
     - Create an API key under **Credentials**.
   - Obtain `GOOGLE_CSE_ID` from [Programmable Search Engine](https://programmablesearchengine.google.com/controlpanel/all):
     - Create a search engine with “Search the entire web” enabled.
     - Copy the Search Engine ID.

4. **Start the Backend**:
   ```bash
   node server.js
   ```
   - Server runs on `http://localhost:5000`.

### Frontend Setup

1. **Navigate to Frontend Directory**:

   ```bash
   cd client
   ```

2. **Install Dependencies**:

   ```bash
   npm install react axios react-dropzone tailwindcss @tailwindcss/vite
   ```

3. **Initialize Tailwind CSS**:

   - Update `frontend/vite.config.js`:

     ```javascript
     import tailwindcss from "@tailwindcss/vite";

      plugins: [react(), tailwindcss()],
     ```

   - Create `frontend/src/index.css`:
     ```css
     @import "tailwindcss";
     ```
   - Import in `frontend/src/main.jsx`:
     ```javascript
     import "./index.css";
     ```

4. **Configure Environment Variables**:

   - Create `frontend/.env`:
     ```env
     VITE_BASE_URL=http://localhost:5000
     ```

5. **Start the Frontend**:
   ```bash
   npm start
   ```
   - App runs on `http://localhost:5173`.

### API Setup

- **Google Custom Search API**:
  - Free tier: ~100 queries/day (resets at midnight Pacific Time, 8:00 AM WAT).
  - Paid tier: $5 per 1,000 queries, up to 10,000/day.
  - Monitor usage in [Google Cloud Console](https://console.cloud.google.com/apis/dashboard).
- **Quota Management**: Text is split into chunks (>50 characters) to minimize API calls. Caching can be added with `node-cache` for repeated queries.

## Usage

1. **Open the App**:

   - Navigate to `http://localhost:5173`.

2. **Input Text or File**:

   - Enter text in the textarea or upload a PDF/TXT file via the Dropzone.

3. **Check Plagiarism**:

   - Click “Check Plagiarism” to analyze text.
   - View results: plagiarism percentage, matched chunks, similarity scores, and source URLs.
   - Matched text is highlighted in red.

4. **Download Report**:
   - Click “Download PDF Report” to generate a PDF with summary and matches.

## API Endpoints

- **POST `/check-plagiarism`**:

  - **Accepts**: `multipart/form-data` with `text` (string) or `file` (PDF/TXT).
  - **Returns**: JSON with `text`, `results` (array of matches), and `plagiarismPercentage`.
  - **Example**:
    ```json
    {
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
    ```

- **POST `/generate-report`**:
  - **Accepts**: JSON with `text`, `results`, and `plagiarismPercentage`.
  - **Returns**: PDF file (`plagiarism_report.pdf`).

## Deployment

- **Backend** (e.g., Render, Heroku):

  - Deploy `client/` to a platform like Render.
  - Set environment variables (`GOOGLE_API_KEY`, `GOOGLE_CSE_ID`) in the platform’s dashboard.
  - Update CORS in `client/server.js`:
    ```javascript
    app.use(
      cors({
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"],
      })
    );
    ```
  - Add to `client/.env`:
    ```env
    FRONTEND_URL=https://your-frontend.vercel.app
    ```

- **Frontend** (e.g., Vercel, Netlify):
  - Deploy `frontend/` to Vercel/Netlify.
  - Set `VITE_BASE_URL=https://your-backend.onrender.com` in the environment settings.
  - Ensure HTTPS for both frontend and backend to avoid mixed content issues.

## Testing

- **Test Text**: Use a known online source (e.g., Wikipedia: “Artificial intelligence (AI) refers to...”) to verify matches.
- **Test File**: Create a `.txt` or PDF with the same text.
- **Curl Commands**:

  ```bash
  # Check plagiarism
  curl -X POST http://localhost:5000/check-plagiarism \
    -H "Content-Type: application/json" \
    -d '{"text":"Artificial intelligence (AI) refers to..."}'

  # Generate report
  curl -X POST http://localhost:5000/generate-report \
    -H "Content-Type: application/json" \
    -o plagiarism_report.pdf \
    -d '{"text":"Artificial intelligence (AI) refers to...","results":[{"chunk":"Artificial intelligence (AI) refers to...","source":"https://example.com","similarity":1}],"plagiarismPercentage":100}'
  ```

- **Quota Check**: Monitor Google API usage in [Google Cloud Console](https://console.cloud.google.com/apis/dashboard) to avoid 429 errors.

## Limitations

- **API Quota**: Free tier limits to ~100 queries/day. Use a 50-character chunk threshold to reduce calls.
- **File Support**: Only PDF and TXT files are supported.
- **Accuracy**: Depends on Google API indexing and similarity threshold (0.8).

## Future Improvements

- Support additional file formats (e.g., DOCX).
- Integrate Bing Web Search API for higher free tier (1,000 queries/month).

## Troubleshooting

- **429 Too Many Requests**: Wait for quota reset (8:00 AM WAT) or enable billing for higher quota.
- **CORS Errors**: Ensure `cors` middleware in `backend/server.js` allows the frontend URL.
- **No Matches**: Test with widely indexed text (e.g., Wikipedia) or lower similarity threshold (0.8 to 0.6).
- **Logs**: Check server console for `Chunks:` and `Search error:` messages.

## Contributors

- Terry Magnus - Developer
