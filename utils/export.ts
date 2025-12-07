import { BioAlgorithm } from '../types';

export const exportToJSON = (data: any, filename: string) => {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',')
    )
  ];

  const csv = csvRows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportToMarkdown = (algorithm: BioAlgorithm, filename: string) => {
  const md = `# ${algorithm.name}

## Overview
- **Domain**: ${algorithm.domain}
- **Type**: ${algorithm.type}
- **Inspiration**: ${algorithm.inspiration}

## Description
${algorithm.description}

## Principle
${algorithm.principle}

## Steps
${Array.isArray(algorithm.steps) 
  ? algorithm.steps.map((step: any, i: number) => `${i + 1}. ${step}`).join('\n')
  : algorithm.steps
}

## Applications
${Array.isArray(algorithm.applications)
  ? algorithm.applications.map((app: string) => `- ${app}`).join('\n')
  : algorithm.applications
}

## Pseudocode
\`\`\`
${algorithm.pseudoCode}
\`\`\`

## Tags
${Array.isArray(algorithm.tags)
  ? algorithm.tags.map((tag: string) => `\`${tag}\``).join(', ')
  : algorithm.tags
}
`;

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (err) {
      document.body.removeChild(textArea);
      return false;
    }
  }
};

export const copyAlgorithmToClipboard = async (algorithm: BioAlgorithm): Promise<boolean> => {
  const text = `Algorithm: ${algorithm.name}\n\n${algorithm.description}\n\nPseudocode:\n${algorithm.pseudoCode}`;
  return copyToClipboard(text);
};

export const generateShareLink = (algorithmId: string): string => {
  return `${window.location.origin}/algorithm/${algorithmId}`;
};

export const shareAlgorithm = async (algorithm: BioAlgorithm): Promise<boolean> => {
  const shareData = {
    title: algorithm.name,
    text: algorithm.description,
    url: generateShareLink(algorithm.id)
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return true;
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Error sharing:', err);
      }
      return false;
    }
  } else {
    // Fallback: copy link to clipboard
    return copyToClipboard(shareData.url);
  }
};

