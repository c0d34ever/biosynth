export const printAlgorithm = (algorithm: any) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${algorithm.name}</title>
        <style>
          @media print {
            @page {
              margin: 1cm;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
            }
            h1 {
              color: #0f172a;
              border-bottom: 3px solid #10b981;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            h2 {
              color: #1e293b;
              margin-top: 30px;
              margin-bottom: 15px;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 5px;
            }
            .meta {
              background: #f8fafc;
              padding: 15px;
              border-radius: 5px;
              margin-bottom: 20px;
            }
            .meta-item {
              margin: 5px 0;
            }
            .meta-label {
              font-weight: bold;
              color: #475569;
            }
            .steps {
              counter-reset: step-counter;
              list-style: none;
              padding: 0;
            }
            .steps li {
              counter-increment: step-counter;
              margin: 10px 0;
              padding-left: 30px;
              position: relative;
            }
            .steps li::before {
              content: counter(step-counter);
              position: absolute;
              left: 0;
              background: #10b981;
              color: white;
              width: 24px;
              height: 24px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: 12px;
            }
            .pseudocode {
              background: #1e293b;
              color: #f1f5f9;
              padding: 20px;
              border-radius: 5px;
              font-family: 'Courier New', monospace;
              white-space: pre-wrap;
              overflow-x: auto;
              margin: 20px 0;
            }
            .tags {
              margin: 20px 0;
            }
            .tag {
              display: inline-block;
              background: #e2e8f0;
              padding: 4px 12px;
              border-radius: 12px;
              margin: 4px;
              font-size: 12px;
            }
            .applications {
              list-style: disc;
              margin-left: 20px;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              text-align: center;
              color: #64748b;
              font-size: 12px;
            }
          }
        </style>
      </head>
      <body>
        <h1>${algorithm.name}</h1>
        
        <div class="meta">
          <div class="meta-item">
            <span class="meta-label">Domain:</span> ${algorithm.domain}
          </div>
          <div class="meta-item">
            <span class="meta-label">Type:</span> ${algorithm.type}
          </div>
          <div class="meta-item">
            <span class="meta-label">Inspiration:</span> ${algorithm.inspiration}
          </div>
        </div>

        <h2>Description</h2>
        <p>${algorithm.description}</p>

        <h2>Principle</h2>
        <p>${algorithm.principle}</p>

        <h2>Steps</h2>
        <ol class="steps">
          ${Array.isArray(algorithm.steps) 
            ? algorithm.steps.map((step: any) => `<li>${step}</li>`).join('')
            : `<li>${algorithm.steps}</li>`
          }
        </ol>

        <h2>Applications</h2>
        <ul class="applications">
          ${Array.isArray(algorithm.applications)
            ? algorithm.applications.map((app: string) => `<li>${app}</li>`).join('')
            : `<li>${algorithm.applications}</li>`
          }
        </ul>

        <h2>Pseudocode</h2>
        <pre class="pseudocode">${algorithm.pseudoCode}</pre>

        ${algorithm.tags && algorithm.tags.length > 0 ? `
          <h2>Tags</h2>
          <div class="tags">
            ${Array.isArray(algorithm.tags)
              ? algorithm.tags.map((tag: string) => `<span class="tag">${tag}</span>`).join('')
              : `<span class="tag">${algorithm.tags}</span>`
            }
          </div>
        ` : ''}

        <div class="footer">
          <p>Generated from BioSynth Architect</p>
          <p>${new Date().toLocaleString()}</p>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  
  // Wait for content to load, then print
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
};

export const printPage = () => {
  window.print();
};

export const printSelection = () => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    alert('Please select some text to print');
    return;
  }

  const range = selection.getRangeAt(0);
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Selection</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
        </style>
      </head>
      <body>
        ${range.cloneContents().textContent}
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
};

