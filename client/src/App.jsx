import { useState } from "react";
import axios from "axios";
import Dropzone from "react-dropzone";

function App() {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    const formData = new FormData();
    if (file) formData.append("file", file);
    if (text) formData.append("text", text);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/check-plagiarism`,
        formData
      );
      setResults(response.data);
    } catch (err) {
      setError("Error checking plagiarism: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!results) {
      setError("No results available to generate a report");
      return;
    }

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/generate-report`,
        {
          text: results.text,
          results: results.results,
          plagiarismPercentage: results.plagiarismPercentage,
        },
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "plagiarism_report.pdf");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError("Error downloading report: " + err.message);
    }
  };

  // Highlight matched chunks in the original text
  const renderHighlightedText = () => {
    if (!results || !results.text) return null;

    let highlightedText = results.text;
    results.results.forEach((result) => {
      const regex = new RegExp(
        `(${result.chunk.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
        "g"
      );
      highlightedText = highlightedText.replace(
        regex,
        `<span class="bg-red-300 text-red-600">$1</span>`
      );
    });

    return (
      <div className="mt-4 p-4 bg-gray-100 rounded-lg text-black">
        <h3 className="text-lg font-semibold mb-2">
          Original Text with Matches Highlighted
        </h3>
        <div
          className="text-sm whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: highlightedText }}
        />
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl bg-black text-green-400 min-h-screen font-mono">
      <h1 className="text-3xl font-bold text-center mb-6 text-green-300 tracking-widest">
        Plagiarism Checker
      </h1>
      <p className="text-center text-green-500 mb-6 italic">
        Enter text or upload a PDF/TXT file to scan for anomalies...
      </p>

      {/* Textarea */}
      <div className="mb-6">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="> Enter text here..."
          className="w-full h-40 p-4 border border-green-500 bg-black text-green-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 placeholder-green-600"
        />
      </div>

      {/* File Dropzone */}
      <div className="mb-6">
        <Dropzone onDrop={(files) => setFile(files[0])}>
          {({ getRootProps, getInputProps }) => (
            <div
              {...getRootProps()}
              className="border-2 border-dashed border-green-500 p-6 text-center rounded-lg cursor-pointer hover:bg-green-900/20 transition"
            >
              <input {...getInputProps()} />
              <p className="text-green-400">
                {file
                  ? `> ${file.name}`
                  : "> Drag & drop a PDF/TXT file here, or click to select"}
              </p>
            </div>
          )}
        </Dropzone>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className={`w-full py-2 px-4 rounded-lg font-semibold tracking-wide ${
          loading
            ? "bg-green-800 text-green-600 cursor-not-allowed"
            : "bg-green-600 hover:bg-green-500 text-black cursor-pointer"
        }`}
      >
        {loading ? "> Scanning..." : "> Check Plagiarism"}
      </button>

      {/* Error */}
      {error && (
        <div className="mt-4 p-4 bg-red-900 text-red-300 rounded-lg border border-red-500">
          {error}
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-green-300">
              Plagiarism: {results.plagiarismPercentage.toFixed(2)}%
            </h2>
            <button
              onClick={handleDownloadReport}
              className="py-2 px-4 bg-green-700 text-black rounded-lg hover:bg-green-500 cursor-pointer"
            >
              Download Report
            </button>
          </div>

          {results.results.length > 0 ? (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-green-400">
                Matched Sections
              </h3>
              <ul className="space-y-4">
                {results.results.map((r, i) => (
                  <li
                    key={i}
                    className="p-4 bg-black border border-green-500 rounded-lg"
                  >
                    <p className="text-sm font-medium text-green-300">
                      [Text {i + 1}] (Similarity:{" "}
                      {(r.similarity * 100).toFixed(2)}%)
                    </p>
                    <p className="text-sm italic bg-red-300 text-red-500 px-2 py-1 rounded my-2 inline-block">
                      "{r.chunk}"
                    </p>
                    <p className="text-sm">
                      Source:{" "}
                      <a
                        href={r.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-400 underline hover:text-green-200"
                      >
                        {r.source}
                      </a>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="p-4 bg-green-900/30 text-green-300 border border-green-500 rounded-lg">
              No plagiarism detected.
            </div>
          )}

          {renderHighlightedText()}
        </div>
      )}
    </div>

    // <div className="container mx-auto p-4 max-w-4xl">
    //   <h1 className="text-3xl font-bold text-center mb-6">
    //     Plagiarism Checker
    //   </h1>
    //   <p className="text-center text-gray-600 mb-4">
    //     Enter text or upload a PDF/TXT file to check for plagiarism.
    //   </p>

    //   <div className="mb-6">
    //     <textarea
    //       value={text}
    //       onChange={(e) => setText(e.target.value)}
    //       placeholder="Enter text here..."
    //       className="w-full h-32 p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    //     />
    //   </div>

    //   <div className="mb-6">
    //     <Dropzone onDrop={(files) => setFile(files[0])}>
    //       {({ getRootProps, getInputProps }) => (
    //         <div
    //           {...getRootProps()}
    //           className="border-2 border-dashed border-gray-300 p-6 text-center rounded-lg hover:border-blue-500 cursor-pointer"
    //         >
    //           <input {...getInputProps()} />
    //           <p className="text-gray-600">
    //             {file
    //               ? file.name
    //               : "Drag & drop a PDF/TXT file here, or click to select"}
    //           </p>
    //         </div>
    //       )}
    //     </Dropzone>
    //   </div>

    //   <button
    //     onClick={handleSubmit}
    //     disabled={loading}
    //     className={`w-full py-2 px-4 rounded-lg text-white font-semibold ${
    //       loading
    //         ? "bg-gray-400 cursor-not-allowed"
    //         : "bg-blue-500 hover:bg-blue-600 cursor-pointer"
    //     }`}
    //   >
    //     {loading ? "Checking..." : "Check Plagiarism"}
    //   </button>

    //   {error && (
    //     <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
    //       {error}
    //     </div>
    //   )}

    //   {results && (
    //     <div className="mt-6">
    //       <div className="flex items-center justify-between mb-4">
    //         <h2 className="text-2xl font-semibold">
    //           Plagiarism: {results.plagiarismPercentage.toFixed(2)}%
    //         </h2>
    //         <button
    //           onClick={handleDownloadReport}
    //           className="py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 cursor-pointer"
    //         >
    //           Download PDF Report
    //         </button>
    //       </div>

    //       {results.results.length > 0 ? (
    //         <div className="mb-6">
    //           <h3 className="text-lg font-semibold mb-2">Matched Sections</h3>
    //           <ul className="space-y-4">
    //             {results.results.map((r, i) => (
    //               <li key={i} className="p-4 bg-white border rounded-lg">
    //                 <p className="text-sm font-medium">
    //                   <span className="font-semibold">Text {i + 1}</span>{" "}
    //                   (Similarity: {(r.similarity * 100).toFixed(2)}%):
    //                 </p>
    //                 <p className="text-sm italic bg-red-200 inline-block px-2 py-1 rounded">
    //                   "{r.chunk}"
    //                 </p>
    //                 <p className="text-sm">
    //                   Source:{" "}
    //                   <a
    //                     href={r.source}
    //                     target="_blank"
    //                     rel="noopener noreferrer"
    //                     className="text-blue-500 hover:underline"
    //                   >
    //                     {r.source}
    //                   </a>
    //                 </p>
    //               </li>
    //             ))}
    //           </ul>
    //         </div>
    //       ) : (
    //         <div className="p-4 bg-green-100 text-green-700 rounded-lg">
    //           No plagiarism detected.
    //         </div>
    //       )}

    //       {renderHighlightedText()}
    //     </div>
    //   )}
    // </div>
  );
}

export default App;
